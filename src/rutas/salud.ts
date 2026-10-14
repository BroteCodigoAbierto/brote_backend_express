import { Router } from "express";

// Para saber si la API está viva (la usan los clientes y el despliegue).
export const rutasSalud = Router();

rutasSalud.get("/", (_req, res) => {
  res.json({ estado: "ok" });
});
