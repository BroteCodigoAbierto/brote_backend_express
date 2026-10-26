import { Router } from "express";
import { cabecerasParaAuth, reenviarSesion } from "../middleware/sesion.ts";
import { crearCuenta } from "../servicios/cuentas.ts";
import type { RespuestaUsuario } from "../tipos/contrato.ts";
import { validarCrearCuenta } from "../validacion/cuenta.ts";

export const rutasCuentas = Router();

// Crear cuenta: la sesión queda iniciada en ese dispositivo.
rutasCuentas.post("/", async (req, res) => {
  const datos = validarCrearCuenta(req.body);
  const { usuario, cabeceras } = await crearCuenta(datos, cabecerasParaAuth(req));
  reenviarSesion(cabeceras, req, res);
  const respuesta: RespuestaUsuario = { usuario };
  res.status(201).json(respuesta);
});
