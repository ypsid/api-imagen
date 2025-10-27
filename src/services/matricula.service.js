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

async function insertarMatricula(
  nromatricula,
  digitomatricula,
  numero_repeticion,
  tipoFicha,
  nombre_lote,
  nroFichas,
  cantidadTotalPaginas,
  fichaActual,
  imgAnverso,
  imgReverso,
) {
  try {

    const bufferAnverso = utils.armarBuffer(imgAnverso);
    const bufferReverso = utils.armarBuffer(imgReverso);

    const connection = await oracledb.getConnection(dbConfig);
    const bindParams = {
      p_tipoinscrip: { val: "FR" },
      p_nromatricula: { val: Number(nromatricula), dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_digitomatricula: { val: Number(digitomatricula), dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_numero_repeticion: { val: Number(numero_repeticion), dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_tipo_ficha: { val: String(tipoFicha), dir: oracledb.BIND_IN, type: oracledb.STRING },
      p_nombre_lote: { val: String(nombre_lote), dir: oracledb.BIND_IN, type: oracledb.STRING },
      p_ficha_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      p_cant_fichas: { val: nroFichas, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_ficha_actual: { val: fichaActual, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      p_imagen_anverso: { val: bufferAnverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      p_imagen_reverso: { val: bufferReverso, dir: oracledb.BIND_IN, type: oracledb.BLOB },
      o_result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      o_mensaje: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
    };

    const result = await connection.execute(
      `BEGIN
        PKG_YPS_MATRICULAS.CREATE_MATRICULA_IMAGEN(
        :p_tipoinscrip,
        :p_nromatricula,
        :p_digitomatricula,
        :p_numero_repeticion, 
        :p_nombre_lote, 
        :p_ficha_id, 
        :p_cant_fichas,
        :p_ficha_actual,
        :p_imagen_anverso,
        :p_imagen_reverso, 
        :o_result, 
        :o_mensaje
        );
       END;`,
      bindParams
    );
    console.log('RESPUESTA PL')
    console.log('Ficha ID:', result.outBinds.p_ficha_id);
    console.log('Resultado:', result.outBinds.p_result);
    console.log('Mensaje:', result.outBinds.p_mensaje);
    console.log('---')
    await connection.close();
    console.log('Datos enviados')

    console.log('Digito matricula:', digitomatricula)
    console.log('numero repeticion', numero_repeticion)
    console.log('nombre lote', nombre_lote)
    console.log('Numero matricula:', nromatricula)
    console.log('Numero Fichas:', nroFichas)
    console.log('Cantidad total de paginas:', cantidadTotalPaginas)
    console.log('Ficha Actual:', fichaActual)
    console.log('anverso', bufferAnverso)
    console.log('reverso', bufferReverso)
    console.log('---------------------------------')
    return {
      resultado: result.outBinds.o_result,
      mensaje: result.outBinds.o_mensaje,
      ficha_id: result.outBinds.p_ficha_id,
      codigo: {
        tipoInscirp: bindParams.p_tipoinscrip,
        tipoMatricula: bindParams.p_nromatricula,
        digitoMatricula: bindParams.p_digitomatricula,
        numeroRepeticion: bindParams.p_numero_repeticion,
      }
    };
  } catch (err) {
    console.error("❌ Error al ejecutar el procedimiento almacenado:", err);
    throw new Error(`Error en la base de datos: ${err.message}`);
  }
}

export default { insertarMatricula }