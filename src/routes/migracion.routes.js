import express from "express";
import migracionController from "../controllers/migracion.controller.js";
const migracionRouter = express.Router();

migracionRouter.get("/libros", migracionController.librosMigrados);

export default migracionRouter