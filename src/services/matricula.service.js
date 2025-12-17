import oracledb from "oracledb";
import utils from "../utils/utils.js";
import { getConnection } from "../db.js";

async function insertarMatricula(
  tipoInscrip,
  nromatricula,
  digitomatricula,
  numero_repeticion,
  // tipoFicha,
  nombre_libro,
  nroFichas,
  // cantidadTotalPaginas,
  fichaActual,
  imgAnverso,
  imgReverso
) {
  let connection;
  try {
    const bufferAnverso = imgAnverso ? utils.armarBuffer(imgAnverso) : null;
    const bufferReverso = imgReverso ? utils.armarBuffer(imgReverso) : null;
    connection = await getConnection(); // ✅ pool

    const bindParams = {
      p_tipoinscrip: { val: String(tipoInscrip), dir: oracledb.BIND_IN },
      p_nromatricula: { val: Number(nromatricula), dir: oracledb.BIND_IN },
      p_digitomatricula: { val: Number(digitomatricula), dir: oracledb.BIND_IN },
      p_numero_repeticion: { val: Number(numero_repeticion), dir: oracledb.BIND_IN },
      // p_tipo_ficha: { val: String(tipoFicha), dir: oracledb.BIND_IN },
      p_nombre_libro: { val: String(nombre_libro), dir: oracledb.BIND_IN },
      p_ficha_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      p_cant_fichas: { val: Number(nroFichas), dir: oracledb.BIND_IN },
      p_ficha_actual: { val: Number(fichaActual), dir: oracledb.BIND_IN },
      p_imagen_anverso: { val: bufferAnverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      p_imagen_reverso: { val: bufferReverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      o_result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      o_mensaje: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
    };
    // :p_tipo_ficha,
    const result = await connection.execute(
      `BEGIN
         PKG_YPS_MATRICULAS.CREATE_MATRICULA_IMAGEN(
            :p_tipoinscrip,
            :p_nromatricula,
            :p_digitomatricula,
            :p_numero_repeticion, 

            :p_nombre_libro,
            :p_ficha_id,
            :p_cant_fichas,
            :p_ficha_actual,
            :p_imagen_anverso,
            :p_imagen_reverso,
            :o_result,
            :o_mensaje
         );
       END;`,
      bindParams,
      { autoCommit: true } // 👈 importante
    );

    console.log("✅ RESPUESTA PL");
    console.log("Resultado:", result.outBinds.o_result);
    console.log("Mensaje:", result.outBinds.o_mensaje);
    console.log("---");
    // Logs útiles (evitamos mostrar buffers grandes)
    console.log("Tipo Inscripcion:", tipoInscrip);
    console.log("Numero Matricula:", nromatricula);
    console.log("Digito Matricula:", digitomatricula);
    console.log("Numero Repeticion:", numero_repeticion);
    // console.log("Tipo Ficha:", tipoFicha);
    console.log("Nombre Libro:", nombre_libro); // informativo si te sirve
    return {
      resultado: result.outBinds.o_result,
      mensaje: result.outBinds.o_mensaje,
      codigo: {
        tipoInscrip: String(tipoInscrip),
        tipoMatricula: Number(nromatricula),
        digitoMatricula: Number(digitomatricula),
        numeroRepeticion: Number(numero_repeticion),
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

export default { insertarMatricula };
