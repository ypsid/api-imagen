import cronologicoService from "../services/cronologico.service.js";
import utils from "../utils/utils.js"

const migrarPorLote = async (req, res) => {
  try {
    const { lote, nombre } = req.query
    if (!lote || lote.length === 0) {
      return res.json({ message: "No hay lote para migrar" });
    }
    let responseSent = false;
    let cronologicosArray = [];
    let mensajes = []
    let codigo = {}
    cronologicosArray = cronologicosArray.concat(await utils.matriculasPorLoteId(lote));
    if (cronologicosArray.length === 0) {
      responseSent = true;
      return res.json({ message: `No hay cronologicos pendientes en el lote - ${nombre} ` });
    }

    for (const cronologico of cronologicosArray) {
      if (!cronologico?.matricula) {
        console.error("⚠️ Error: cronologico.matricula es undefined o null");
        continue;
      }

      let { tipoInsrcip, nroOrden, nroFolio, nroAnio, nroRepeticion, vuelto, nroDpto, nroTomoLe } = utils.transformarCodigoCronologico(String(cronologico.matricula).length === 28 ? cronologico.matricula : cronologico.matricula + "0000");

      if (!cronologico.fichas || !Array.isArray(cronologico.fichas)) {
        console.warn(`⚠️ cronologico.fichas no es un array válido para cronologico: ${cronologico.matricula}`);
        continue;
      }
      let nroFichas = 0
      let imgAnverso = {};
      let imgReverso = {};
      let cantidadTotalPaginas = 0;
      let fichaActual = 0

      for (const ficha of cronologico.fichas) {
        const imgData = await utils.imagenesPorHojaId(ficha);
        if (imgData) {
          imgAnverso = imgData.filter(img => img.lado === 1 || img.lado === "1" || img.lado === "ANVERSO")[0];
          imgReverso = imgData.filter(img => img.lado === 2 || img.lado === "2" || img.lado === "REVERSO")[0];
          cantidadTotalPaginas += imgData.length;
        }
        nroFichas = cronologico.fichas.length
        fichaActual += 1
        const insercionCronologico = await cronologicoService.insertarCronologico(
          tipoInsrcip,
          nroOrden,
          nroFolio,
          nroAnio,
          nroRepeticion,
          vuelto,
          nroDpto,
          nroTomoLe,
          nroFichas,
          cantidadTotalPaginas,
          fichaActual,
          imgAnverso,
          imgReverso,
          nombre
        );
        mensajes.push(insercionCronologico)
        codigo = insercionCronologico.codigo
      }
    }
    if (!responseSent) {
      return res.status(200).json({ lote, cronologicosArray, mensaje: mensajes, codigo });
    }
  } catch (err) {
    console.error("❌ Error en /api/cronologico/migrar-por-lote:", err);
    res.status(500).json({ error: err.message });
  }
}

export default { migrarPorLote }

