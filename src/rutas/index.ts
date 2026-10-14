import { Router } from "express";
import { rutasSalud } from "./salud.ts";

// Aquí se monta cada grupo de rutas nuevo, una línea por recurso.
export const rutas = Router();

rutas.use("/salud", rutasSalud);
