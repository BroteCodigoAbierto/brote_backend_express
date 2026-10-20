import { Router } from "express";
import { requerirSesion, usuarioDe } from "../middleware/sesion.ts";
import { aUsuario } from "../servicios/cuentas.ts";
import type { RespuestaUsuario } from "../tipos/contrato.ts";

export const rutasUsuarios = Router();

// Quién soy: los clientes la llaman al arrancar para saber si la sesión sigue.
rutasUsuarios.get("/yo", requerirSesion, (_req, res) => {
  const respuesta: RespuestaUsuario = { usuario: aUsuario(usuarioDe(res)) };
  res.json(respuesta);
});
