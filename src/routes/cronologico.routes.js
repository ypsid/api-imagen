import express from "express";
import cronologicoController from "../controllers/cronologico.controller.js";
const cronologicoRouter = express.Router();

cronologicoRouter.get("/migrar-por-lote", cronologicoController.migrarPorLote);

export default cronologicoRouter