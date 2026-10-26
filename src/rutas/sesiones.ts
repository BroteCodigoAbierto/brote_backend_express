import { Router } from "express";
import { cabecerasParaAuth, reenviarSesion } from "../middleware/sesion.ts";
import { cerrarSesion, entrar } from "../servicios/cuentas.ts";
import type { RespuestaUsuario } from "../tipos/contrato.ts";
import { validarEntrar } from "../validacion/cuenta.ts";

export const rutasSesiones = Router();

// Entrar con correo y contraseña.
rutasSesiones.post("/", async (req, res) => {
  const datos = validarEntrar(req.body);
  const { usuario, cabeceras } = await entrar(datos, cabecerasParaAuth(req));
  reenviarSesion(cabeceras, req, res);
  const respuesta: RespuestaUsuario = { usuario };
  res.json(respuesta);
});

// Cerrar la sesión de este dispositivo. Responde 204 aunque no haya sesión,
// para que un cliente pueda reintentar un cierre pendiente.
rutasSesiones.delete("/actual", async (req, res) => {
  const cabeceras = await cerrarSesion(cabecerasParaAuth(req));
  reenviarSesion(cabeceras, req, res); // en la web, borra la cookie
  res.sendStatus(204);
});
