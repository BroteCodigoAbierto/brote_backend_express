import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../config/auth.ts";
import { CABECERA_CLIENTE, CABECERA_TOKEN, MENSAJES_CUENTA } from "../tipos/contrato.ts";
import { ErrorApi } from "./errores.ts";

export type UsuarioAuth = typeof auth.$Infer.Session.user;

// La web lleva la sesión en una cookie y el móvil en un token Bearer. Cada
// cliente usa solo su mecanismo: si el móvil recibiera también la cookie, el
// almacén nativo de React Native la guardaría y la sesión podría sobrevivir a
// un "Cerrar sesión" sin conexión (ver brote_specs, research de F01, punto 2).
export function esMovil(req: Request): boolean {
  return req.get(CABECERA_CLIENTE.nombre) === CABECERA_CLIENTE.movil;
}

// Cabeceras de la petición en el formato de Better Auth; al móvil se le quita
// la cookie para que solo cuente su token.
export function cabecerasParaAuth(req: Request): Headers {
  const cabeceras = fromNodeHeaders(req.headers);
  if (esMovil(req)) cabeceras.delete("cookie");
  return cabeceras;
}

// Copia a la respuesta lo que Better Auth devolvió para iniciar, renovar o
// cerrar la sesión: Set-Cookie a la web o set-auth-token al móvil, nunca ambos.
export function reenviarSesion(cabeceras: Headers, req: Request, res: Response) {
  if (esMovil(req)) {
    const token = cabeceras.get(CABECERA_TOKEN);
    if (token) res.setHeader(CABECERA_TOKEN, token);
    return;
  }
  for (const cookie of cabeceras.getSetCookie()) res.append("Set-Cookie", cookie);
}

// Deja pasar solo peticiones con una sesión vigente. Better Auth la renueva si
// pasó más de un día desde la última vez; por eso se reenvían sus cabeceras.
export async function requerirSesion(req: Request, res: Response, siguiente: NextFunction) {
  const { headers, response } = await auth.api.getSession({
    headers: cabecerasParaAuth(req),
    returnHeaders: true,
  });
  if (!response) throw new ErrorApi(401, MENSAJES_CUENTA.sesionTerminada);
  reenviarSesion(headers, req, res);
  res.locals.usuario = response.user;
  siguiente();
}

export function usuarioDe(res: Response): UsuarioAuth {
  return res.locals.usuario as UsuarioAuth;
}
