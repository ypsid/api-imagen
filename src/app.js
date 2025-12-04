import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cronologicoRouter from "./routes/cronologico.routes.js";
import matriculaRouter from "./routes/matricula.routes.js";

const app = express();
const port = 4001;
// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.set("trust proxy", true);

app.use("/api/cronologico", cronologicoRouter)
app.use("/api/matricula", matriculaRouter)


app.listen(port, () => {
  console.log(` La API está escuchando en ${port}`);
});
