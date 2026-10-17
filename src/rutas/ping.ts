import { Router } from "express";

// Para saber si la API está viva (la usan los clientes y el despliegue).
export const rutasPing = Router();

rutasPing.get("/", (_req, res) => {
  res.json({ respuesta: "pong" });
});
