import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cronologicoRouter from "./routes/cronologico.routes.js";
import matriculaRouter from "./routes/matricula.routes.js";
import { initPool, closePool } from "./db.js";

const app = express();
const PORT = process.env.PORT;

// Middlewares
app.use(cors()); // en prod podés restringir: cors({ origin: ["https://tu-domino"] })
app.use(helmet());
app.use(morgan("combined")); // "combined" para logs más completos en prod
app.use(express.json({ limit: "250mb" })); // si enviás imágenes/base64, ajustá el límite

// Si vas detrás de IIS/Nginx/ARR, dejá esto en true; si no, comentá
app.set("trust proxy", true);

// Rutas
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/cronologico", cronologicoRouter);
app.use("/api/matricula", matriculaRouter);

// Arranque: primero pool, luego server
let server;

const start = async () => {
  try {
    await initPool();
    server = app.listen(PORT, () => {
      console.log(`✅ API escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error iniciando pool Oracle:", err);
    process.exit(1);
  }
};

start();

// Apagado limpio
const shutdown = async (signal) => {
  console.log(`\n🔻 Señal ${signal} recibida. Cerrando...`);
  try {
    // Deja de aceptar nuevas conexiones y espera a las actuales
    await new Promise((resolve) => server?.close(resolve));
    await closePool();
    console.log("✅ Servidor y pool cerrados.");
    process.exit(0);
  } catch (e) {
    console.error("⚠️ Error al cerrar:", e);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Hardening opcional
process.on("unhandledRejection", (r) => {
  console.error("unhandledRejection:", r);
});
process.on("uncaughtException", (e) => {
  console.error("uncaughtException:", e);
  // opcionalmente process.exit(1) si querés que PM2/NSSM reinicie
});
