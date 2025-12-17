// src/services/cronologico.service.js
import oracledb from "oracledb";
import utils from "../utils/utils.js";
import { getConnection } from "../db.js";

async function insertarCronologico(
  tipoInsrcip,
  nroOrden,
  nroFolio,
  nroAnio,
  nroRepeticion,
  vuelto,
  nroDpto,
  nroTomoLe,
  nroFichas,
  datos, // <- hoy no se usa en el paquete
  fichaActual,
  imgAnverso,
  imgReverso,
  nombre // <- hoy no se usa en el paquete
) {
  let connection;
  try {


    const bufferAnverso = imgAnverso ? utils.armarBuffer(imgAnverso) : null;
    const bufferReverso = imgReverso ? utils.armarBuffer(imgReverso) : null;
    connection = await getConnection(); // ✅ pool

    const bindParams = {
      p_tipoinscrip: { val: String(tipoInsrcip), dir: oracledb.BIND_IN },
      p_nroorden: { val: Number(nroOrden), dir: oracledb.BIND_IN },
      p_folio: { val: Number(nroFolio), dir: oracledb.BIND_IN },
      p_anio: { val: Number(nroAnio), dir: oracledb.BIND_IN },
      p_numero_repeticion: { val: Number(nroRepeticion), dir: oracledb.BIND_IN },
      p_vuelto: { val: "N", dir: oracledb.BIND_IN },
      p_departamento: { val: Number(nroDpto), dir: oracledb.BIND_IN },
      p_tomo_le: { val: Number(nroTomoLe), dir: oracledb.BIND_IN },
      p_cant_fichas: { val: Number(nroFichas), dir: oracledb.BIND_IN },
      p_ficha_actual: { val: Number(fichaActual), dir: oracledb.BIND_IN },
      p_imagen_anverso: { val: bufferAnverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      p_imagen_reverso: { val: bufferReverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      o_resultado: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 1000 },
      o_mensaje_error: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 1000 },
    };

    const result = await connection.execute(
      `BEGIN
        PKG_YPS_CRONO.PR_INSERTAR_CRONOLOGICO(
          :P_TIPOINSCRIP,
          :P_NROORDEN,
          :P_FOLIO,
          :P_ANIO,
          :P_NUMERO_REPETICION,
          :P_VUELTO,
          :P_DEPARTAMENTO,
          :P_TOMO_LE,
          :P_CANT_FICHAS,
          :P_FICHA_ACTUAL,
          :P_IMAGEN_ANVERSO,
          :P_IMAGEN_REVERSO,
          :O_RESULTADO,
          :O_MENSAJE_ERROR
        );
      END;`,
      bindParams,
      { autoCommit: true } // ✅ importante si el paquete no hace COMMIT
    );

    console.log("RESPUESTA PL");
    console.log("Resultado:", result.outBinds.o_resultado);
    console.log("Mensaje:", result.outBinds.o_mensaje_error);
    console.log("---");

    // Logs útiles (evitamos mostrar buffers grandes)
    console.log("Tipo Inscripcion:", tipoInsrcip);
    console.log("Numero Orden:", nroOrden);
    console.log("Numero Folio:", nroFolio);
    console.log("Año:", nroAnio);
    console.log("Numero Folio Bis:", nroRepeticion);
    console.log("Vuelto:", vuelto);
    console.log("Departamento:", nroDpto);
    console.log("Tomo Legajo:", nroTomoLe);
    console.log("Numero Fichas:", nroFichas);
    console.log("Ficha Actual:", fichaActual);
    console.log("Numero Repeticion:", nroRepeticion);
    console.log("Nombre Libro:", nombre); // informativo si te sirve
    // console.log("Cantidad de paginas:", cantidadTotalPaginas); // informativo si te sirve

    return {
      resultado: result.outBinds.o_resultado,
      mensaje: result.outBinds.o_mensaje_error,
      codigo: {
        tipoInsrcip,
        nroOrden,
        nroFolio,
        nroAnio,
        fichaActual,
        nroRepeticion,
        vuelto,
        nroDpto,
        nroTomoLe,
      },
    };
  } catch (err) {
    console.error("❌ Error al ejecutar el procedimiento almacenado:", err);
    throw new Error(`Error en la base de datos: ${err.message}`);
  } finally {
    if (connection) {
      try { await connection.close(); } // ✅ devolver al pool
      catch (e) { console.error("Error cerrando conexión:", e); }
    }
  }
}

export default { insertarCronologico };
