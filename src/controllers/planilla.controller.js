import planillaService from "../services/planilla.service.js";
import utils from "../utils/utils.js";

const migrarPorLibro = async (req, res) => {
  try {
    const { libroId, nombre, documentoIds } = req.query;
    if (!libroId || libroId.length === 0) {
      return res.status(400).json({ message: "No hay libro para migrar" });
    }

    const documentoIdsFiltrados = utils.parseDocumentoIds(documentoIds);
    let planillasArray = [];
    let mensajes = [];
    let codigoUltimo = null;

    planillasArray = planillasArray.concat(await utils.docsPorLibroId(libroId));

    if (documentoIdsFiltrados.length > 0) {
      const idsEncontrados = new Set(planillasArray.map((planilla) => Number(utils.obtenerDocumentoId(planilla))));
      const idsNoEncontrados = documentoIdsFiltrados.filter((documentoId) => !idsEncontrados.has(Number(documentoId)));
      mensajes = idsNoEncontrados.map((documentoId) => ({
        documentoId,
        resultado: "ERROR",
        mensaje: "Documento no encontrado entre las planillas pendientes del libro",
      }));
    }

    planillasArray = utils.filtrarDocumentosPorIds(planillasArray, documentoIdsFiltrados);

    if (planillasArray.length === 0) {
      if (mensajes.length > 0) {
        return res.status(200).json({
          libroId: Number(libroId),
          libroNombre: nombre,
          mensajes,
          codigo: codigoUltimo,
        });
      }
      return res.json({ message: `No hay planillas pendientes en el libro - ${nombre} ` });
    }

    for (const planilla of planillasArray) {
      const documentoId = utils.obtenerDocumentoId(planilla);

      if (!planilla?.datos || !Array.isArray(planilla.datos)) {
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "Documento sin datos de planilla",
        });
        continue;
      }

      if (!planilla.imagenes || !Array.isArray(planilla.imagenes)) {
        console.warn(`⚠️ planilla.imagenes no es un array válido para planilla: ${planilla.nombre}`);
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "planilla.imagenes no es un array válido",
        });
        continue;
      }

      const imagenesDatos = [];
      const erroresImagenes = [];
      for (const imagenId of planilla.imagenes) {
        const imgData = await utils.obtenerImagenPorId(imagenId);
        if (!imgData || imgData.error) {
          console.warn(`⚠️ No se pudo obtener imagen ${imagenId}`);
          erroresImagenes.push({
            imagenId,
            resultado: "ERROR",
            mensaje: imgData?.mensaje ?? "No se pudo obtener la imagen",
            codigo: null,
          });
          continue;
        }
        imagenesDatos.push(imgData);
      }

      if (imagenesDatos.length === 0) {
        console.warn(`⚠️ No se obtuvieron TIFF para planilla ${planilla.nombre}`);
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "No se obtuvieron TIFF para la planilla",
          fichasOk: 0,
          fichasError: erroresImagenes.length,
          detalles: erroresImagenes,
        });
        continue;
      }

      const anversos = imagenesDatos.filter((img) => img.lado === 1);
      const reversos = imagenesDatos.filter((img) => img.lado === 2);

      let folios;
      try {
        folios = utils.obtenerFoliosPlanilla(planilla.datos);
      } catch (err) {
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: err?.message ?? "No se pudieron leer los folios de la planilla",
        });
        continue;
      }

      const nroFichas = folios.length;
      if (nroFichas === 0) {
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "La planilla no tiene folios para migrar",
        });
        continue;
      }

      if (anversos.length > nroFichas || reversos.length > nroFichas) {
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: `Cantidad inconsistente de folios e imágenes: folios ${nroFichas}, anversos ${anversos.length}, reversos ${reversos.length}`,
        });
        continue;
      }

      const fichas = [];
      for (let i = 0; i < nroFichas; i++) {
        const fichaActual = i + 1;
        const codigo = utils.transformarCodigoPlanilla(planilla.datos, i);
        fichas.push({
          ...codigo,
          nroFichas,
          fichaActual,
          imgAnverso: anversos[i] ?? null,
          imgReverso: reversos[i] ?? null,
        });
      }

      const mensajesFicha = await planillaService.procesarPlanilla(fichas);
      if (mensajesFicha.length > 0) {
        codigoUltimo = mensajesFicha[mensajesFicha.length - 1].codigo;
      }

      const fichasOk = mensajesFicha.filter(utils.mensajeEsOk).length;
      const fichasError = mensajesFicha.length - fichasOk + erroresImagenes.length;
      const documentoOk = mensajesFicha.length === nroFichas && fichasError === 0;
      const detalles = erroresImagenes.concat(mensajesFicha);

      mensajes.push({
        documentoId,
        resultado: documentoOk ? "OK" : "ERROR",
        mensaje: documentoOk
          ? "Documento migrado correctamente"
          : `Documento con errores: OK ${fichasOk}/${nroFichas}, ERROR ${fichasError}/${nroFichas}`,
        fichasOk,
        fichasError,
        detalles,
      });
    }

    return res.status(200).json({
      libroId: Number(libroId),
      libroNombre: nombre,
      mensajes,
      codigo: codigoUltimo,
    });
  } catch (err) {
    console.error("❌ Error en /api/planilla/migrar-por-libro:", err);
    return res.status(500).json({ error: err.message });
  }
};

export default { migrarPorLibro };
