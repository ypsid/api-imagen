import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

if (!process.env.URL) {
  throw new Error("process.env.URL no está definida. Revisa tu .env");
}

const axiosInstance = axios.create({
  baseURL: process.env.URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
    // "Authorization": "Proxy"
  },
  proxy: false
  // proxy: {
  //   host: "proxycba",
  //   port: 8080,
  //   // si tu proxy necesita auth:
  //   auth: { username: "23434500109", password: "Bxigo2611&" },
  // },
});

function logAxiosError(ctx, err) {
  if (err.response) {
    console.error(`❌ ${ctx} - status:`, err.response.status);
    console.error(`   data:`, err.response.data);
  } else if (err.request) {
    console.error(`❌ ${ctx} - sin respuesta del servidor`);
    console.error(`   code:`, err.code);
  } else {
    console.error(`❌ ${ctx} - error al armar request:`, err.message);
  }
}


// Convierte array de imágenes base64 a buffer con prefijo de tamaño
function armarBuffer(imagen) {
  const base64Data = imagen.base64.split(",")[1] || imagen.base64;
  return Buffer.from(base64Data, "base64");
}

async function librosPorMigrar() {
  try {
    const resp = await axiosInstance.get("/api/trpc/migracion.librosPorMigrar?input=%7B%22json%22%3Anull%7D");
    return resp.data?.result?.data?.json || [];
  } catch (err) {
    console.error("❌ Error librosPorMigrar:", err.message);
    return []; // retorna array vacío si falla
  }
}

async function matriculasPorLibroId(libroId) {
  try {
    const input = { json: { libroId: parseInt(libroId) } };

    const resp = await axiosInstance.get(
      "/api/trpc/migracion.matriculasPorMigrar?input=" +
      encodeURIComponent(JSON.stringify(input))
    );
    const data = resp.data?.result?.data?.json;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    logAxiosError(`matriculasPorLibroId(${libroId})`, err);
    return [];
  }
}


async function obtenerImagenPorId(imagenId) {
  try {
    const input = { json: { imagenId: parseInt(imagenId) } };
    const resp = await axiosInstance.get(
      "/api/trpc/migracion.obtenerTiffDeImagenS3?input=" +
      encodeURIComponent(JSON.stringify(input))
    );
    return resp.data?.result?.data?.json;
  } catch (err) {
    logAxiosError(`obtenerImagenPorId(${imagenId})`, err);
    return [];
  }
}

function transformarCodigo(codigo) {
  return {
    tipoInscrip: "FR",
    nromatricula: codigo.substring(0, 8),
    digitomatricula: codigo.substring(8, 13),
    numero_repeticion: codigo.substring(13, 15),
    // tipoFicha: codigo.substring(17, 18)
  };
}

function transformarCodigoCronologico(datos, i) {
  const tipoInsrcip = datos.find((dato) => dato.campoEsquema.orden === 1).valor;
  const nroOrden = datos.find((dato) => dato.campoEsquema.orden === 2).valor;
  const armarFolioConBis = JSON.parse(datos.find((dato) => dato.campoEsquema.orden === 3).valor)
  const nroFolio = armarFolioConBis[i].Folio
  const bis = armarFolioConBis[i].Bis;
  const nroAnio = datos.find((dato) => dato.campoEsquema.orden === 4).valor;
  // const nroTomoLe = isNaN(parseInt(datos.substring(24, 28))) ? 0 : parseInt(datos.substring(24, 28));
  console.log(`${tipoInsrcip}, ${nroOrden}, ${nroFolio}, ${bis}, ${nroAnio}`)
  return {
    tipoInsrcip,
    nroOrden,
    nroFolio,
    bis,
    nroAnio,
    nroVuelto: "N",
    nroDpto: 37,
    nroTomoLe: 0,
  };
}

export default {
  armarBuffer,
  librosPorMigrar,
  matriculasPorLibroId,
  obtenerImagenPorId,
  transformarCodigo,
  transformarCodigoCronologico,
};
