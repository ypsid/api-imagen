import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

if (!process.env.URL) {
  throw new Error("process.env.URL no está definida. Revisa tu .env");
}

const axiosInstance = axios.create({
  baseURL: process.env.URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Convierte array de imágenes base64 a buffer con prefijo de tamaño
function armarBuffer(imagen) {
  const base64Data = imagen.base64.split(",")[1] || imagen.base64;
  return Buffer.from(base64Data, "base64");
}

async function lotesPorMigrar() {
  try {
    const resp = await axiosInstance.get("/api/trpc/loteImagenes.lotesPorMigrar?input=%7B%22json%22%3Anull%7D");
    return resp.data?.result?.data?.json || [];
  } catch (err) {
    console.error("❌ Error lotesPorMigrar:", err.message);
    return []; // retorna array vacío si falla
  }
}

async function matriculasPorLoteId(loteId) {
  try {
    const resp = await axiosInstance.get(
      `/api/trpc/loteImagenes.matriculasPorMigrar?input=${encodeURIComponent(
        JSON.stringify({ json: { loteId } })
      )}`
    );
    const data = resp.data?.result?.data?.json;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`❌ Error en matriculasPorLoteId(${loteId}):`, err.message);
    return [];
  }
}

async function imagenesPorHojaId(hojaId) {
  try {
    const resp = await axiosInstance.get(
      `/api/trpc/imagen.getTiffFromS3?input=${encodeURIComponent(
        JSON.stringify({ json: { hojaId } })
      )}`
    );
    return resp.data?.result?.data?.json || [];
  } catch (err) {
    console.error(`❌ Error imagenesPorHojaId(${hojaId}):`, err.message);
    return [];
  }
}

function transformarCodigo(codigo) {
  return {
    nromatricula: parseInt(codigo.substring(2, 10)),
    digitomatricula: codigo.substring(10, 15),
    numero_repeticion: parseInt(codigo.substring(15, 17)),
    tipoFicha: codigo.substring(17, 18)
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
    nroTomoLe: isNaN(parseInt(codigo.substring(24, 28))) ? 0 : parseInt(codigo.substring(24, 28)),
  };
}

export default {
  armarBuffer,
  lotesPorMigrar,
  matriculasPorLoteId,
  imagenesPorHojaId,
  transformarCodigo,
  transformarCodigoCronologico,
};
