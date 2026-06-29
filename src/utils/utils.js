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

function axiosErrorMessage(err) {
  return err?.response?.data?.error?.json?.message
    ?? err?.response?.data?.message
    ?? err?.message
    ?? "No se pudo obtener el detalle del error";
}

// Convierte array de imágenes base64 a buffer con prefijo de tamaño
function armarBuffer(imagen) {
  const base64Data = imagen.base64.split(",")[1] || imagen.base64;
  return Buffer.from(base64Data, "base64");
}

function parseDocumentoIds(documentoIds) {
  if (!documentoIds) return [];

  return String(documentoIds)
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Number.isFinite);
}

function obtenerDocumentoId(documento) {
  return documento?.id ?? documento?.documentoId ?? documento?.documento_id ?? null;
}

function filtrarDocumentosPorIds(documentos, documentoIds) {
  if (!Array.isArray(documentos) || documentoIds.length === 0) return documentos;

  const ids = new Set(documentoIds.map(Number));
  return documentos.filter((documento) => ids.has(Number(obtenerDocumentoId(documento))));
}

async function librosPorMigrar() {
  try {
    const resp = await axiosInstance.get("/api/trpc/migracion.librosPorMigrar");
    return resp.data?.result?.data?.json || [];
  } catch (err) {
    logAxiosError(`librosPorMigrar`, err);
    return []; // retorna array vacío si falla
  }
}
async function migrarCronologico(libroId, libroNombre) {
  const idNum = Number(libroId);
  console.log(libroId, libroNombre)
  if (!Number.isFinite(idNum)) throw new Error(`libroId inválido: ${libroId}`);

  const body = {
    0: { json: { libroId: idNum, libroNombre } },
  };

  const resp = await axiosInstance.post(
    "/api/trpc/migracion.migrarCronologicoPorLibro?batch=1",
    body,
    { headers: { "content-type": "application/json" } },
  );

  // tRPC batch response is an array
  return resp.data?.[0]?.result?.data?.json ?? [];
}

async function migrarMatricula(libroId, libroNombre) {
  const idNum = Number(libroId);
  console.log(libroId, libroNombre)
  if (!Number.isFinite(idNum)) throw new Error(`libroId inválido: ${libroId}`);

  const body = {
    0: { json: { libroId: idNum, libroNombre } },
  };

  const resp = await axiosInstance.post(
    "/api/trpc/migracion.migrarPorLibro?batch=1",
    body,
    { headers: { "content-type": "application/json" } },
  );

  // tRPC batch response is an array
  return resp.data?.[0]?.result?.data?.json ?? [];
}


async function docsPorLibroId(libroId) {
  try {
    const input = { json: { libroId: parseInt(libroId) } };

    const resp = await axiosInstance.get(
      "/api/trpc/migracion.matriculasPorMigrar?input=" +
      encodeURIComponent(JSON.stringify(input))
    );
    const data = resp.data?.result?.data?.json;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    logAxiosError(`docsPorLibroId(${libroId})`, err);
    return [];
  }
}
async function migrarLibroPorId(libroId) {
  const idNum = Number(libroId);
  if (!Number.isFinite(idNum)) throw new Error(`libroId inválido: ${libroId}`);

  const body = {
    0: { json: idNum }, // 👈 input number directo
  };

  try {
    const resp = await axiosInstance.post(
      "/api/trpc/migracion.libroMigrado?batch=1",
      body,
      { headers: { "content-type": "application/json" } },
    );

    // batch => array
    return resp.data?.[0]?.result?.data?.json ?? null;
  } catch (err) {
    logAxiosError(`libroMigrado(${libroId})`, err);
    return null;
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
    return {
      error: true,
      imagenId: parseInt(imagenId),
      mensaje: axiosErrorMessage(err),
    };
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

function obtenerFoliosCronologico(datos) {
  const campoFolios = datos?.find((dato) => dato.campoEsquema?.orden === 4);
  if (!campoFolios?.valor) {
    throw new Error("El cronológico no tiene el campo Folios");
  }

  let folios;
  try {
    folios = JSON.parse(campoFolios.valor);
  } catch {
    throw new Error("El campo Folios del cronológico no tiene un JSON válido");
  }

  if (!Array.isArray(folios)) {
    throw new Error("El campo Folios del cronológico no es un vector válido");
  }

  return folios;
}

function transformarCodigoCronologico(datos, i) {
  const tipoInsrcip = datos.find((dato) => dato.campoEsquema?.orden === 1)?.valor;
  const nroOrden = datos.find((dato) => dato.campoEsquema?.orden === 2)?.valor;
  const nroOrdenBis = datos.find((dato) => dato.campoEsquema?.orden === 3)?.valor ? Number(datos.find((dato) => dato.campoEsquema?.orden === 3).valor) : 0;
  const armarFolioConBis = obtenerFoliosCronologico(datos);
  const folioActual = armarFolioConBis[i];
  if (!folioActual) {
    throw new Error(`El cronológico no tiene folio para la ficha ${i + 1}`);
  }
  const nroFolio = folioActual.Folio;
  const nroFolioBis = folioActual.Bis;
  const nroAnio = datos.find((dato) => dato.campoEsquema?.orden === 5)?.valor;
  const nroDepartamento = datos.find((dato) => dato.campoEsquema?.orden === 6)?.valor;
  const vuelto = datos.find((dato) => dato.campoEsquema?.orden === 7)?.valor;
  // const nroTomoLe = isNaN(parseInt(datos.substring(24, 28))) ? 0 : parseInt(datos.substring(24, 28));
  console.log(`${tipoInsrcip}, ${nroOrden}, ${nroOrdenBis}, ${nroFolio}, ${nroFolioBis}, ${nroAnio}`)
  return {
    tipoInsrcip,
    nroOrden,
    nroOrdenBis,
    nroFolio,
    nroFolioBis,
    nroAnio,
    vuelto: vuelto ?? "N",
    nroVuelto: "N",
    nroDpto: nroDepartamento ?? "N",
    nroTomoLe: 0,
  };
}
function spEsOk(valor) {
  // casos comunes: 1 / 0 / "OK" / "0" / "1" / "S"
  if (valor === null || valor === undefined) return false;

  const v = String(valor).trim().toUpperCase();
  return v === "OK" || v === "1" || v === "0" || v === "S" || v === "SUCCESS";
}

function mensajeEsOk(m) {
  const r = m?.resultado;
  if (r === null || r === undefined) return false;

  // cronológico: "OK"
  const rs = String(r).trim().toUpperCase();
  if (rs === "OK" || rs === "SUCCESS" || rs === "S") return true;
  if (rs === "ERROR" || rs === "FAIL" || rs === "FAILED") return false;

  // matrícula: suele ser número (1 ok, 0 ok según PL)
  if (typeof r === "number") return r === 1; // si tu PL usa 0=OK, cambiá a r===0

  // si viene como string numérica
  if (!Number.isNaN(Number(rs))) return Number(rs) === 1;

  // fallback por texto
  const msg = String(m?.mensaje ?? "").toLowerCase();
  if (msg.includes("correct")) return true; // "correctamente"
  return false;
}

export default {
  armarBuffer,
  filtrarDocumentosPorIds,
  librosPorMigrar,
  docsPorLibroId,
  mensajeEsOk,
  migrarCronologico,
  migrarMatricula,
  migrarLibroPorId,
  obtenerDocumentoId,
  obtenerImagenPorId,
  obtenerFoliosCronologico,
  parseDocumentoIds,
  spEsOk,
  transformarCodigo,
  transformarCodigoCronologico,
};
