import matriculaService from "../services/matricula.service.js";
import utils from "../utils/utils.js"

const migrarPorLote = async (req, res) => {
  try {
    const { lote, nombre } = req.query
    if (!lote || lote.lengt === 0) {
      return res.json({ message: "No hay lote para migrar" });
    }
    let responseSent = false;
    let bases64 = [];
    let matriculasArray = [];
    let mensajes = []
    let codigo = {}
    matriculasArray = matriculasArray.concat(await matriculasPorLoteId(lote));

    if (matriculasArray.length === 0) {
      responseSent = true;
      return res.json({ message: `No hay matriculas pendientes en el lote - ${nombre} ` });
    }

    for (const matricula of matriculasArray) {
      if (!matricula?.matricula) {
        console.error("⚠️ Error: matricula.matricula es undefined o null");
        continue;
      }
      let nroFichas = 0
      let imgAnverso = [];
      let imgReverso = [];
      let cantidadTotalPaginas = 0;

      let { nromatricula, digitomatricula, numero_repeticion } = utils.transformarCodigo(matricula.matricula);

      if (!matricula.fichas || !Array.isArray(matricula.fichas)) {
        console.warn(`⚠️ matricula.fichas no es un array válido para matrícula: ${matricula.matricula}`);
        continue;
      }

      for (const ficha of matricula.fichas) {
        const imgData = await utils.imagenesPorHojaId(ficha);
        if (imgData) {
          bases64.push({ hojaId: ficha, imagenes: imgData });
          imgAnverso.push(...imgData.filter(img => img.lado === 1 || img.lado === "1" || img.lado === "ANVERSO"));
          imgReverso.push(...imgData.filter(img => img.lado === 2 || img.lado === "2" || img.lado === "REVERSO"));
          cantidadTotalPaginas += imgData.length;
        }
      }

      const insercionMatricula = await matriculaService.insertarMatricula(
        nromatricula,
        digitomatricula,
        numero_repeticion,
        nombre,
        nroFichas,
        cantidadTotalPaginas,
        imgAnverso,
        imgReverso,
      );
      mensajes.push(insercionMatricula)
      codigo = insercionMatricula.codigo
    }
    mensajes.map((msj) => { console.log(msj.mensaje) })
    if (!responseSent) {
      return res.status(200).json({ lote, matriculasArray, bases64, mensaje: mensajes, codigo });
    }
  } catch (err) {
    console.error("❌ Error en /api/migrarPorLote:", err);
    res.status(500).json({ error: err.message });
  }
}

export default { migrarPorLote }