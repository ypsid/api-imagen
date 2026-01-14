import cron from "node-cron";
import axios from "axios";
import { formatearEjecucion, logMigracion } from "../utils/migracionLogger.js";

let running = false;
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

export function iniciarJobMigracion() {
  const BASE_URL = process.env.BASE_URL ?? "http://0.0.0.0:4001";
  console.log("🕒 Job migración registrado, próxima ejecución en el próximo cambio de hora");
  cron.schedule("0 * * * *", async () => {
    if (running) return;
    running = true;

    const inicio = new Date();
    const t0 = Date.now();

    try {
      const resp = await axiosInstance.get(`${BASE_URL}/api/migracion/libros`, {
        timeout: 60_000, // ponelo > que tu peor caso
      });
      const data = resp.data;

      const fin = new Date();
      const duracionMs = Date.now() - t0;

      const estado =
        data?.error > 0 ? "error" :
          data?.warning > 0 ? "warning" :
            "ok";

      const texto = formatearEjecucion({
        inicio,
        fin,
        duracionMs,
        estado,
        totalLibros: data?.totalLibros ?? 0,
        ok: data?.ok ?? 0,
        warning: data?.warning ?? 0,
        error: data?.error ?? 0,
        resultados: data?.resultados ?? [],
      });

      logMigracion(texto);

    } catch (err) {
      const fin = new Date();
      const duracionMs = Date.now() - t0;

      logMigracion(formatearEjecucion({
        inicio,
        fin,
        duracionMs,
        estado: "error",
        totalLibros: 0,
        ok: 0,
        warning: 0,
        error: 1,
        resultados: [],
        errorMsg: err?.message ?? String(err),
      }));

      console.error("❌ Job migración:", err?.message ?? err);
    } finally {
      running = false;
    }
  });
}
