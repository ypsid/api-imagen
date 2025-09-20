import express from "express";
import matriculaController from "../controllers/matricula.controller.js";
const matriculaRouter = express.Router();

matriculaRouter.get("/migrar-por-lote", matriculaController.migrarPorLote);

export default matriculaRouter