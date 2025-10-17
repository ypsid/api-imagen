import oracledb from "oracledb";
import utils from "../utils/utils.js"

const dbConfig = {
  user: "URGP_DIGITAL",
  password: "testpre",
  connectString: `
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP) (HOST = rgp-db-preprod.test.cba.gov.ar) (PORT = 1521))
      (CONNECT_DATA = (SERVER = dedicated) (SERVICE_NAME = rgppre))
    )`,
};

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
  cantidadTotalPaginas,
  fichaActual,
  imgAnverso,
  imgReverso,
  nombreLote
) {
  try {

    const bufferAnverso = utils.armarBuffer(imgAnverso);
    const bufferReverso = utils.armarBuffer(imgReverso);
    const connection = await oracledb.getConnection(dbConfig);

    const bindParams = {
      p_tipoinscrip: { val: tipoInsrcip, dir: oracledb.BIND_IN, type: oracledb.STRING },
      p_nroorden: { val: nroOrden, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_folio: { val: nroFolio, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_anio: { val: nroAnio, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_numero_repeticion: { val: nroRepeticion, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_vuelto: { val: vuelto, dir: oracledb.BIND_IN, type: oracledb.STRING },
      p_departamento: { val: nroDpto, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_tomo_le: { val: nroTomoLe, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_cant_fichas: { val: nroFichas, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_ficha_actual: { val: fichaActual, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_imagen_anverso: { val: bufferAnverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      p_imagen_reverso: { val: bufferReverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      o_resultado: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 },
      o_mensaje_error: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 },
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
      bindParams
    );

    console.log('RESPUESTA PL')
    console.log('Resultado:', result.outBinds.o_resultado);
    console.log('Mensaje:', result.outBinds.o_mensaje_error);
    console.log('---')
    await connection.close();
    console.log('Datos enviados')
    console.log('Numero Orden:', nroOrden)
    console.log('Numero Folio:', nroFolio)
    console.log('Numero Fichas:', nroFichas)
    console.log('Cantidad total de paginas:', cantidadTotalPaginas)
    console.log('Ficha Actual:', fichaActual)
    console.log('numero repeticion', nroRepeticion)
    console.log('nombre lote', nombreLote)
    console.log('anverso', bufferAnverso)
    console.log('reverso', bufferReverso)
    console.log('---------------------------------')
    return {
      resultado: result.outBinds.o_resultado,
      mensaje: result.outBinds.o_mensaje_error,
      codigo: {
        tipoInsrcip,
        nroOrden,
        nroFolio,
        nroAnio,
        nroRepeticion,
        vuelto,
        nroDpto,
        nroTomoLe,
      },
    };
  } catch (err) {
    console.error("❌ Error al ejecutar el procedimiento almacenado:", err);
    throw new Error(`Error en la base de datos: ${err.message}`);
  }
}

export default { insertarCronologico }