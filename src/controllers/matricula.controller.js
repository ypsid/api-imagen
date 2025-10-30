import matriculaService from "../services/matricula.service.js";
import utils from "../utils/utils.js"

const migrarPorLote = async (req, res) => {
  try {
    const { lote, nombre } = req.query
    if (!lote || lote.length === 0) {
      return res.json({ message: "No hay lote para migrar" });
    }
    let responseSent = false;
    let matriculasArray = [];
    let mensajes = []
    let codigo = {}
    matriculasArray = matriculasArray.concat(await utils.matriculasPorLoteId(lote));

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
      let imgAnverso = {};
      let imgReverso = {};
      let cantidadTotalPaginas = 0;
      let fichaActual = 0

      let { tipoInscrip, nromatricula, digitomatricula, numero_repeticion, tipoFicha } = utils.transformarCodigo(matricula.matricula);
      console.log((tipoInscrip + nromatricula + digitomatricula + numero_repeticion + tipoFicha), "tipoInscrip", tipoInscrip, "nromat:", nromatricula, "digito: ", digitomatricula, "nroRep:", numero_repeticion, "tipo: ", tipoFicha)
      if (!matricula.fichas || !Array.isArray(matricula.fichas)) {
        console.warn(`⚠️ matricula.fichas no es un array válido para matrícula: ${matricula.matricula}`);
        continue;
      }

      for (const ficha of matricula.fichas) {
        const imgData = await utils.imagenesPorHojaId(ficha);
        if (imgData) {
          imgAnverso = imgData.filter(img => img.lado === 1 || img.lado === "1" || img.lado === "ANVERSO")[0];
          imgReverso = imgData.filter(img => img.lado === 2 || img.lado === "2" || img.lado === "REVERSO")[0];
          cantidadTotalPaginas += imgData.length;
        }
      }
      nroFichas = matricula.fichas.length
      fichaActual += 1

      const insercionMatricula = await matriculaService.insertarMatricula(
        tipoInscrip,
        nromatricula,
        digitomatricula,
        numero_repeticion,
        tipoFicha,
        nombre,
        nroFichas,
        cantidadTotalPaginas,
        fichaActual,
        imgAnverso,
        imgReverso,
      );
      mensajes.push(insercionMatricula)
      codigo = insercionMatricula.codigo
    }
    mensajes.map((msj) => { console.log(msj.mensaje) })
    if (!responseSent) {
      return res.status(200).json({ lote, matriculasArray, mensaje: mensajes, codigo });
    }
  } catch (err) {
    console.error("❌ Error en /api/migrarPorLote:", err);
    res.status(500).json({ error: err.message });
  }
}

export default { migrarPorLote }