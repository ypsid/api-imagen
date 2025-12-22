import cronologicoService from "../services/cronologico.service.js";
import utils from "../utils/utils.js"

const migrarPorLibro = async (req, res) => {
  try {

    const { libroId, nombre } = req.query
    if (!libroId || libroId.length === 0) {
      console.log(req)
      return res.stats(400).json({ message: "No hay libro para migrar" });
    }
    let responseSent = false;
    let cronologicosArray = [];
    let mensajes = []
    let codigoUltimo = null;
    cronologicosArray = cronologicosArray.concat(await utils.docsPorLibroId(libroId))

    if (cronologicosArray.length === 0) {
      responseSent = true;
      return res.json({ message: `No hay cronologicos pendientes en el libro - ${nombre} ` });
    }

    for (const cronologico of cronologicosArray) {
      console.log(cronologico.datos)
      if (!cronologico?.nombre) {
        console.error("⚠️ Error: nombre del cronologico es undefined o null");
        continue;
      }



      if (!cronologico.imagenes || !Array.isArray(cronologico.imagenes)) {
        console.warn(`⚠️ cronologico.imagenes no es un array válido para cronologico: ${cronologico.nombre}`);
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
        continue;
      }

      // 2) Separo anversos y reversos
      const anversos = imagenesDatos.filter((img) => img.lado === 1);
      const reversos = imagenesDatos.filter((img) => img.lado === 2);

      const nroFichas = Math.max(anversos.length, reversos.length);
      let fichaActual = 0;

      // 3) Por cada "ficha" (par A/R) llamo al SP
      for (let i = 0; i < nroFichas; i++) {
        fichaActual++;
        let { tipoInsrcip, nroOrden, nroFolio, bis, nroAnio, vuelto, nroDpto, nroTomoLe } = utils.transformarCodigoCronologico(cronologico.datos, i);
        const imgAnverso = anversos[i] ?? null;
        const imgReverso = reversos[i] ?? null;

        const insercionCronologico = await cronologicoService.insertarCronologico(
          tipoInsrcip,
          nroOrden,
          nroFolio,
          bis,
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

        mensajes.push(insercionCronologico);
        codigoUltimo = insercionCronologico.codigo;
      }
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