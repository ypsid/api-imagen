import express from "express";
import cronologicoController from "../controllers/cronologico.controller.js";
const cronologicoRouter = express.Router();

cronologicoRouter.get("/migrar-por-libro", cronologicoController.migrarPorLibro);

export default cronologicoRouter