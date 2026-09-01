import oracledb from "oracledb";
import utils from "../utils/utils.js";
import { getConnection } from "../db.js";

async function cancelarLote(connection) {
  try {
    await connection.execute(
      `BEGIN
        PKG_PLANILLA_NEW.CANCELAR_LOTE;
      END;`
    );
  } catch (err) {
    console.error("❌ Error cancelando lote de planilla:", err);
  }
}

async function rollback(connection) {
  try {
    await connection.rollback();
  } catch (err) {
    console.error("❌ Error haciendo rollback de planilla:", err);
  }
}

async function procesarFicha(connection, ficha) {
  const bufferAnverso = ficha.imgAnverso ? utils.armarBuffer(ficha.imgAnverso) : null;
  const bufferReverso = ficha.imgReverso ? utils.armarBuffer(ficha.imgReverso) : null;

  const bindParams = {
    p_tipoinscrip: { val: String(ficha.tipoInscrip), dir: oracledb.BIND_IN },
    p_nroorden: { val: Number(ficha.nroOrden), dir: oracledb.BIND_IN },
    p_folio: { val: Number(ficha.nroFolio), dir: oracledb.BIND_IN },
    p_numero_repeticion: { val: Number(ficha.numeroRepeticion ?? 0), dir: oracledb.BIND_IN },
    p_cant_fichas: { val: Number(ficha.nroFichas), dir: oracledb.BIND_IN },
    p_ficha_actual: { val: Number(ficha.fichaActual), dir: oracledb.BIND_IN },
    p_imagen_anverso: { val: bufferAnverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
    p_imagen_reverso: { val: bufferReverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
    o_resultado: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 1000 },
    o_mensaje_error: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 1000 },
  };

  const result = await connection.execute(
    `BEGIN
      PKG_PLANILLA_NEW.PROCESAR_FICHA(
        :p_tipoinscrip,
        :p_nroorden,
        :p_folio,
        :p_numero_repeticion,
        :p_cant_fichas,
        :p_ficha_actual,
        :p_imagen_anverso,
        :p_imagen_reverso,
        :o_resultado,
        :o_mensaje_error
      );
    END;`,
    bindParams,
    { autoCommit: false }
  );

  console.log("✅ RESPUESTA PL PLANILLA");
  console.log("Resultado:", result.outBinds.o_resultado);
  console.log("Mensaje:", result.outBinds.o_mensaje_error);
  console.log("---");
  console.log("Tipo Inscripcion:", ficha.tipoInscrip);
  console.log("Numero Orden:", ficha.nroOrden);
  console.log("Numero Folio:", ficha.nroFolio);
  console.log("Numero Repeticion:", ficha.numeroRepeticion);
  console.log("Numero Fichas:", ficha.nroFichas);
  console.log("Ficha Actual:", ficha.fichaActual);

  return {
    ok: utils.spEsOk(result.outBinds.o_resultado),
    resultado: result.outBinds.o_resultado,
    mensaje: result.outBinds.o_mensaje_error,
    codigo: {
      tipoInscrip: ficha.tipoInscrip,
      nroOrden: Number(ficha.nroOrden),
      nroFolio: Number(ficha.nroFolio),
      numeroRepeticion: Number(ficha.numeroRepeticion ?? 0),
      fichaActual: Number(ficha.fichaActual),
    },
  };
}

async function procesarPlanilla(fichas) {
  let connection;
  const mensajesFicha = [];

  try {
    connection = await getConnection();

    for (const ficha of fichas) {
      const respuesta = await procesarFicha(connection, ficha);
      mensajesFicha.push(respuesta);

      if (!utils.mensajeEsOk(respuesta)) {
        await cancelarLote(connection);
        await rollback(connection);
        return mensajesFicha;
      }
    }

    if (mensajesFicha.length === fichas.length && mensajesFicha.every(utils.mensajeEsOk)) {
      await connection.commit();
    } else {
      await cancelarLote(connection);
      await rollback(connection);
    }

    return mensajesFicha;
  } catch (err) {
    if (connection) {
      await cancelarLote(connection);
      await rollback(connection);
    }
    console.error("❌ Error al ejecutar PKG_PLANILLA_NEW.PROCESAR_FICHA:", err);
    throw new Error(`Error en la base de datos: ${err.message}`);
  } finally {
    if (connection) {
      try { await connection.close(); }
      catch (e) { console.error("Error cerrando conexión:", e); }
    }
  }
}

export default { procesarPlanilla };
