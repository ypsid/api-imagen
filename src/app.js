import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
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

if (process.env.ENABLE_CRON === "true") {
  iniciarJobMigracion();
}

app.listen(port, () => {
  console.log(`La API está escuchando en ${port}`);
});
