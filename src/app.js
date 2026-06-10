import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import oracledb from "oracledb";

// oracledb.initOracleClient({ libDir: "C:\\oracle\\instantClient_21_20" });
oracledb.initOracleClient({ libDir: "C:\\oracle\\instantClient_23_0" });

import cronologicoRouter from "./routes/cronologico.routes.js";
import matriculaRouter from "./routes/matricula.routes.js";
import migracionRouter from "./routes/migracion.routes.js";
import { iniciarJobMigracion } from "./jobs/migracion.job.js";

const app = express();
const port = 4001;

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.set("trust proxy", true);

app.use("/api/cronologico", cronologicoRouter);
app.use("/api/matricula", matriculaRouter);
app.use("/api/migracion", migracionRouter);

async function test() {
  let conn;
  try {
    conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });
    const r = await conn.execute(`SELECT SYSDATE FROM DUAL`);
    console.log("✅ ORACLE OK", r.rows);
    return true;
  } catch (e) {
    console.error("❌ ORACLE ERROR", e);
    return false;
  } finally {
    if (conn) await conn.close();
  }
}

await test();

if (process.env.ENABLE_CRON === "true") {
  iniciarJobMigracion();
} else {
  console.log("Cron deshabilitado")
}

app.listen(port, () => {
  console.log(`La API está escuchando en ${port}`);
});
