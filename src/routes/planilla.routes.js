import express from "express";
import planillaController from "../controllers/planilla.controller.js";

const planillaRouter = express.Router();

planillaRouter.get("/migrar-por-libro", planillaController.migrarPorLibro);

export default planillaRouter;
