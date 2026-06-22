import cronologicoService from "../services/cronologico.service.js";
import utils from "../utils/utils.js"

const migrarPorLibro = async (req, res) => {
  try {

    const { libroId, nombre, documentoIds } = req.query
    if (!libroId || libroId.length === 0) {
      console.log(req)
      return res.status(400).json({ message: "No hay libro para migrar" });
    }
    const documentoIdsFiltrados = utils.parseDocumentoIds(documentoIds);
    let cronologicosArray = [];
    let mensajes = []
    let codigoUltimo = null;
    cronologicosArray = cronologicosArray.concat(await utils.docsPorLibroId(libroId))
    if (documentoIdsFiltrados.length > 0) {
      const idsEncontrados = new Set(cronologicosArray.map((cronologico) => Number(utils.obtenerDocumentoId(cronologico))));
      const idsNoEncontrados = documentoIdsFiltrados.filter((documentoId) => !idsEncontrados.has(Number(documentoId)));
      mensajes = idsNoEncontrados.map((documentoId) => ({
        documentoId,
        resultado: "ERROR",
        mensaje: "Documento no encontrado entre los cronológicos pendientes del libro",
      }));
    }
    cronologicosArray = utils.filtrarDocumentosPorIds(cronologicosArray, documentoIdsFiltrados);

    if (cronologicosArray.length === 0) {
      if (mensajes.length > 0) {
        return res.status(200).json({
          libroId: Number(libroId),
          libroNombre: nombre,
          mensajes,
          codigo: codigoUltimo,
        });
      }
      return res.json({ message: `No hay cronologicos pendientes en el libro - ${nombre} ` });
    }

    for (const cronologico of cronologicosArray) {
      const documentoId = utils.obtenerDocumentoId(cronologico);
      console.log(cronologico.datos)
      if (!cronologico?.nombre) {
        console.error("⚠️ Error: nombre del cronologico es undefined o null");
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "Documento sin nombre",
        });
        continue;
      }



      if (!cronologico.imagenes || !Array.isArray(cronologico.imagenes)) {
        console.warn(`⚠️ cronologico.imagenes no es un array válido para cronologico: ${cronologico.nombre}`);
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "cronologico.imagenes no es un array válido",
        });
        continue;
      }
      const imagenesDatos = [];
      for (const imagenId of cronologico.imagenes) {
        const imgData = await utils.obtenerImagenPorId(imagenId);
        if (!imgData) {
          console.warn(`⚠️ No se pudo obtener imagen ${imagenId}`);
          continue;
        }
        imagenesDatos.push(imgData);
      }

      if (imagenesDatos.length === 0) {
        console.warn(`⚠️ No se obtuvieron TIFF para cronologico ${cronologico.nombre}`);
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "No se obtuvieron TIFF para el cronológico",
        });
        continue;
      }

      // 2) Separo anversos y reversos
      const anversos = imagenesDatos.filter((img) => img.lado === 1);
      const reversos = imagenesDatos.filter((img) => img.lado === 2);

      const nroFichas = Math.max(anversos.length, reversos.length);
      let folios;
      try {
        folios = utils.obtenerFoliosCronologico(cronologico.datos);
      } catch (err) {
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: err?.message ?? "No se pudieron leer los folios del cronológico",
        });
        continue;
      }

      const cantidadImagenesEsperadas = folios.length * 2;
      if (imagenesDatos.length !== cantidadImagenesEsperadas) {
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: `Cantidad inconsistente de folios e imágenes: folios ${folios.length}, imágenes ${imagenesDatos.length}, esperadas ${cantidadImagenesEsperadas}, anversos ${anversos.length}, reversos ${reversos.length}`,
        });
        continue;
      }

      let fichaActual = 0;
      const mensajesFicha = [];

      // 3) Por cada "ficha" (par A/R) llamo al SP
      for (let i = 0; i < nroFichas; i++) {
        fichaActual++;
        let { tipoInsrcip, nroOrden, nroOrdenBis, nroFolio, nroFolioBis, nroAnio, vuelto, nroDpto, nroTomoLe } = utils.transformarCodigoCronologico(cronologico.datos, i);
        const imgAnverso = anversos[i] ?? null;
        const imgReverso = reversos[i] ?? null;

        const insercionCronologico = await cronologicoService.insertarCronologico(
          tipoInsrcip,
          nroOrden,
          nroOrdenBis,
          nroFolio,
          nroFolioBis,
          nroAnio,
          vuelto,
          nroDpto,
          nroTomoLe,
          nroFichas,
          cronologico.datos,
          imagenesDatos.length,// cantidadTotalPaginas, si más adelante lo definís, lo cambiamos
          fichaActual,
          imgAnverso,
          imgReverso,
          nombre
        );

        mensajesFicha.push(insercionCronologico);
        codigoUltimo = insercionCronologico.codigo;
      }

      const fichasOk = mensajesFicha.filter(utils.mensajeEsOk).length;
      const fichasError = mensajesFicha.length - fichasOk;
      const documentoOk = mensajesFicha.length > 0 && fichasError === 0;

      mensajes.push({
        documentoId,
        resultado: documentoOk ? "OK" : "ERROR",
        mensaje: documentoOk
          ? "Documento migrado correctamente"
          : `Documento con errores: OK ${fichasOk}/${mensajesFicha.length}, ERROR ${fichasError}/${mensajesFicha.length}`,
        fichasOk,
        fichasError,
        detalles: mensajesFicha,
      });
    }

    return res.status(200).json({
      libroId: Number(libroId),
      libroNombre: nombre,
      mensajes,
      codigo: codigoUltimo,
    });
  } catch (err) {
    console.error("❌ Error en /api/cronologico/migrar-por-libro:", err);
    return res.status(500).json({ error: err.message });
  }
};

export default { migrarPorLibro };
