import { Router } from "express";
import { rutasPing } from "./ping.ts";

// Aquí se monta cada grupo de rutas nuevo, una línea por recurso.
export const rutas = Router();

rutas.use("/ping", rutasPing);
