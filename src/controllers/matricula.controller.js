import matriculaService from "../services/matricula.service.js";
import utils from "../utils/utils.js"

const migrarPorLibro = async (req, res) => {
  try {
    const { libroId, nombre, documentoIds } = req.query
    if (!libroId || libroId.length === 0) {
      return res.json({ message: "No hay libroId para migrar" });
    }
    const documentoIdsFiltrados = utils.parseDocumentoIds(documentoIds);
    let matriculasArray = [];
    let mensajes = []
    let codigoUltimo = null;
    matriculasArray = matriculasArray.concat(await utils.docsPorLibroId(libroId));
    if (documentoIdsFiltrados.length > 0) {
      const idsEncontrados = new Set(matriculasArray.map((matricula) => Number(utils.obtenerDocumentoId(matricula))));
      const idsNoEncontrados = documentoIdsFiltrados.filter((documentoId) => !idsEncontrados.has(Number(documentoId)));
      mensajes = idsNoEncontrados.map((documentoId) => ({
        documentoId,
        resultado: "ERROR",
        mensaje: "Documento no encontrado entre las matrículas pendientes del libro",
      }));
    }
    matriculasArray = utils.filtrarDocumentosPorIds(matriculasArray, documentoIdsFiltrados);

    if (matriculasArray.length === 0) {
      if (mensajes.length > 0) {
        return res.status(200).json({
          libroId: Number(libroId),
          libroNombre: nombre,
          mensajes,
          codigo: codigoUltimo,
        });
      }
      return res.json({ message: `No hay matriculas pendientes en el libro - ${nombre} ` });
    }

    for (const matricula of matriculasArray) {
      const documentoId = utils.obtenerDocumentoId(matricula);

      if (!matricula?.nombre) {
        console.error("⚠️ Error: nombre del cronologico es undefined o null");
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "Documento sin nombre",
        });
        continue;
      }
      console.log(matricula.nombre)
      let { tipoInscrip, nromatricula, digitomatricula, numero_repeticion,
        // tipoFicha
      } = utils.transformarCodigo(matricula.nombre);
      console.log((tipoInscrip + nromatricula + digitomatricula + numero_repeticion
        // + tipoFicha
      ), "tipoInscrip", tipoInscrip, "nromat:", nromatricula.toString(), "digito: ", digitomatricula, "nroRep:", numero_repeticion,
        // "tipo: ", tipoFicha
      )
      if (!matricula.imagenes || !Array.isArray(matricula.imagenes)) {
        console.warn(`⚠️ matricula.imagenes no es un array válido para matrícula: ${matricula.nombre}`);
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "matricula.imagenes no es un array válido",
        });
        continue;
      }

      const imagenesDatos = [];
      const erroresImagenes = [];
      for (const imagenId of matricula.imagenes) {
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
        console.warn(`⚠️ No se obtuvieron TIFF para matricula ${matricula.nombre}`);
        mensajes.push({
          documentoId,
          resultado: "ERROR",
          mensaje: "No se obtuvieron TIFF para la matrícula",
          fichasOk: 0,
          fichasError: erroresImagenes.length,
          detalles: erroresImagenes,
        });
        continue;
      }

      // 2) Separo anversos y reversos
      const anversos = imagenesDatos.filter((img) => img.lado === 1);
      const reversos = imagenesDatos.filter((img) => img.lado === 2);

      const nroFichas = Math.max(anversos.length, reversos.length);
      let fichaActual = 0;
      const mensajesFicha = [];

      for (let i = 0; i < nroFichas; i++) {
        fichaActual++;

        const imgAnverso = anversos[i] ?? null;
        const imgReverso = reversos[i] ?? null;

        const insercionMatricula = await matriculaService.insertarMatricula(
          tipoInscrip,
          nromatricula,
          digitomatricula,
          numero_repeticion,
          nombre,
          nroFichas,
          fichaActual,
          imgAnverso,
          imgReverso,
        );
        mensajesFicha.push(insercionMatricula);
        codigoUltimo = insercionMatricula.codigo;
      }

      const fichasOk = mensajesFicha.filter(utils.mensajeEsOk).length;
      const fichasError = mensajesFicha.length - fichasOk + erroresImagenes.length;
      const documentoOk = mensajesFicha.length > 0 && fichasError === 0;
      const detalles = erroresImagenes.concat(mensajesFicha);

      mensajes.push({
        documentoId,
        resultado: documentoOk ? "OK" : "ERROR",
        mensaje: documentoOk
          ? "Documento migrado correctamente"
          : `Documento con errores: OK ${fichasOk}/${mensajesFicha.length}, ERROR ${fichasError}/${mensajesFicha.length}`,
        fichasOk,
        fichasError,
        detalles,
      });
    }
    mensajes.map((msj) => { console.log(msj.mensaje) })
    return res.status(200).json({
      libroId: Number(libroId),
      libroNombre: nombre,
      mensajes,
      codigo: codigoUltimo,
    });
  } catch (err) {
    console.error("❌ Error en /api/migrarPorLibro:", err);
    res.status(500).json({ error: err.message });
  }
}

export default { migrarPorLibro }
