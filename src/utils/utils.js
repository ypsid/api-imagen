// const axios = require("axios-https-proxy-fix");
import https from "https"; // Agrega esta línea para importar el módulo https
import config from "dotenv"
import axios from "axios";

const url = process.env.URL;


const axiosInstance = axios.create({
  baseURL: "10.26.11.33:4001", // O la IP/URL donde corre tu servidor
  timeout: 10000, // Tiempo de espera en milisegundos
  headers: {
    "Content-Type": "application/json",
  },
});
function concatenarBuffersConTamanio(imagenes) {
  const buffers = imagenes.map(img => {
    const base64Data = img.base64.split(',')[1] || img.base64;
    const buf = Buffer.from(base64Data, 'base64');
    const sizeBuf = Buffer.alloc(4); // 4 bytes para tamanio
    sizeBuf.writeUInt32BE(buf.length);
    return Buffer.concat([sizeBuf, buf]);
  });
  return Buffer.concat(buffers);
}


async function lotesPorMigrar() {
  try {
    const response = await axiosInstance.get(
      `${url}/api/trpc/loteImagenes.lotesPorMigrar?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D`
    );
    return response.data.result.data.json;
  } catch (err) {
    console.error({ err });
    throw new Error(`Ocurrió un error al obtener los lotes por migrar: ${err.message}`);
  }
}

async function matriculasPorLoteId(loteId) {
  try {
    const response = await axiosInstance.get(
      `${url}/api/trpc/loteImagenes.matriculasPorMigrar?input=%7B%22json%22%3A%7B%22loteId%22%3A%22${loteId}%22%7D%7D`
    );
    return response.data.result.data.json;
  } catch (err) {
    console.error({ error: err.message });
    throw new Error(`Ocurrió un error al obtener las matrículas por migrar: ${err.message}`);
  }
}

async function imagenesPorHojaId(hojaId) {
  try {
    const response = await axiosInstance.get(
      `${url}/api/trpc/imagen.getTiffFromS3?input=%7B%22json%22%3A%7B%22hojaId%22%3A%22${hojaId}%22%7D%7D`
    );

    if (!response.data || !response.data.result || !response.data.result.data) {
      throw new Error("Respuesta inválida de la API");
    }
    return response.data.result.data.json;
  } catch (err) {
    console.error(`Error en imagenesPorHojaId(${hojaId}):`, err.message);
    throw new Error("Ocurrió un error al obtener las imágenes por migrar");
  }
}


function transformarCodigo(codigo) {
  return {
    nromatricula: parseInt(codigo.substring(2, 10)),
    digitomatricula: codigo.substring(10, 15),
    numero_repeticion: parseInt(codigo.substring(15, 17)),
  };
}
function transformarCodigoCronologico(codigo) {
  return {
    tipoInsrcip: codigo.substring(0, 2),
    nroOrden: parseInt(codigo.substring(2, 7)),
    nroFolio: parseInt(codigo.substring(7, 15)),
    nroAnio: parseInt(codigo.substring(15, 19)),
    nroRepeticion: parseInt(codigo.substring(19, 21)),
    nroVuelto: codigo.substring(21, 22),
    nroDpto: parseInt(codigo.substring(22, 24)),
    nroTomoLe: parseInt(codigo.substring(24, 28)) !== NaN ? parseInt(codigo.substring(24, 28)) : 0
  };
}

export default { concatenarBuffersConTamanio, imagenesPorHojaId, matriculasPorLoteId, lotesPorMigrar, transformarCodigo, transformarCodigoCronologico };
