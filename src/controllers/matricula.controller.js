import matriculaService from "../services/matricula.service.js";
import utils from "../utils/utils.js"

const migrarPorLibro = async (req, res) => {
  try {
    const { libroId, nombre } = req.query
    if (!libroId || libroId.length === 0) {
      return res.json({ message: "No hay libroId para migrar" });
    }
    let responseSent = false;
    let matriculasArray = [];
    let mensajes = []
    let codigoUltimo = null;
    matriculasArray = matriculasArray.concat(await utils.matriculasPorLibroId(libroId));

    if (matriculasArray.length === 0) {
      responseSent = true;
      return res.json({ message: `No hay matriculas pendientes en el libro - ${nombre} ` });
    }

    for (const matricula of matriculasArray) {
      if (!matricula?.nombre) {
        console.error("⚠️ Error: nombre del cronologico es undefined o null");
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
        continue;
      }

      const imagenesDatos = [];
      for (const imagenId of matricula.imagenes) {
        const imgData = await utils.obtenerImagenPorId(imagenId);
        if (!imgData) {
          console.warn(`⚠️ No se pudo obtener imagen ${imagenId}`);
          continue;
        }
        imagenesDatos.push(imgData);
      }
      if (imagenesDatos.length === 0) {
        console.warn(`⚠️ No se obtuvieron TIFF para cronologico ${cronologico.nombre}`);
        continue;
      }

      // 2) Separo anversos y reversos
      const anversos = imagenesDatos.filter((img) => img.lado === 1);
      const reversos = imagenesDatos.filter((img) => img.lado === 2);

      const nroFichas = Math.max(anversos.length, reversos.length);
      let fichaActual = 0;

      for (let i = 0; i < nroFichas; i++) {
        fichaActual++;

        const imgAnverso = anversos[i] ?? null;
        const imgReverso = reversos[i] ?? null;

        const insercionMatricula = await matriculaService.insertarMatricula(
          tipoInscrip,
          nromatricula,
          digitomatricula,
          numero_repeticion,
          // tipoFicha,
          nombre,
          nroFichas,
          // cantidadTotalPaginas,
          fichaActual,
          imgAnverso,
          imgReverso,
        );
        mensajes.push(insercionMatricula);
        codigoUltimo = insercionMatricula.codigo;
      }
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