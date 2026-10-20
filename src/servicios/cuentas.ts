import { isAPIError } from "better-auth/api";
import { auth } from "../config/auth.ts";
import { bd } from "../config/bd.ts";
import { ErrorApi } from "../middleware/errores.ts";
import type { UsuarioAuth } from "../middleware/sesion.ts";
import {
  MENSAJES_CUENTA,
  type CuerpoCrearCuenta,
  type CuerpoEntrar,
  type Usuario,
} from "../tipos/contrato.ts";

// Cuentas y sesiones sobre Better Auth. Los datos llegan ya validados por la
// ruta; aquí se traducen los errores de Better Auth a los mensajes de la spec y
// su `user` (tabla en inglés) al `Usuario` del contrato.

type ResultadoSesion = { usuario: Usuario; cabeceras: Headers };

export function aUsuario(user: UsuarioAuth): Usuario {
  return {
    id: user.id,
    nombre: user.name,
    correo: user.email,
    creadoEn: user.createdAt.toISOString(),
  };
}

function errorCorreoRepetido() {
  return new ErrorApi(409, MENSAJES_CUENTA.correoRepetido, {
    correo: MENSAJES_CUENTA.correoRepetido,
  });
}

// Better Auth valida el correo con su propio esquema, más estricto que
// PATRON_CORREO; si lo rechaza, se responde igual que nuestra validación.
function errorCorreoInvalido() {
  return new ErrorApi(400, MENSAJES_CUENTA.datosInvalidos, {
    correo: MENSAJES_CUENTA.correoInvalido,
  });
}

function codigoDe(error: unknown): string | undefined {
  if (!isAPIError(error)) return undefined;
  const cuerpo = error.body as { code?: string; message?: string } | undefined;
  // la validación de su esquema no usa INVALID_EMAIL sino VALIDATION_ERROR con
  // el campo en el mensaje: "[body.email] Invalid email address"
  if (cuerpo?.code === "VALIDATION_ERROR" && cuerpo.message?.startsWith("[body.email]")) {
    return "INVALID_EMAIL";
  }
  return cuerpo?.code;
}

export async function crearCuenta(
  { nombre, correo, contrasena }: CuerpoCrearCuenta,
  cabeceras: Headers,
): Promise<ResultadoSesion> {
  // se revisa antes para responder 409 sin pasar por Better Auth
  if (await existeCorreo(correo)) throw errorCorreoRepetido();

  try {
    const { headers, response } = await auth.api.signUpEmail({
      body: { name: nombre, email: correo, password: contrasena },
      headers: cabeceras,
      returnHeaders: true,
    });
    return { usuario: aUsuario(response.user), cabeceras: headers };
  } catch (error) {
    const codigo = codigoDe(error);
    if (codigo?.startsWith("USER_ALREADY_EXISTS")) throw errorCorreoRepetido();
    // dos registros simultáneos pasan las dos revisiones previas y el segundo
    // choca con el índice único de email; Better Auth lo reporta así
    if (codigo === "FAILED_TO_CREATE_USER" && (await existeCorreo(correo))) {
      throw errorCorreoRepetido();
    }
    if (codigo === "INVALID_EMAIL") throw errorCorreoInvalido();
    throw error;
  }
}

async function existeCorreo(correo: string): Promise<boolean> {
  const usuario = await bd.user.findUnique({ where: { email: correo }, select: { id: true } });
  return usuario !== null;
}

export async function entrar(
  { correo, contrasena }: CuerpoEntrar,
  cabeceras: Headers,
): Promise<ResultadoSesion> {
  try {
    const { headers, response } = await auth.api.signInEmail({
      body: { email: correo, password: contrasena },
      headers: cabeceras,
      returnHeaders: true,
    });
    return { usuario: aUsuario(response.user), cabeceras: headers };
  } catch (error) {
    const codigo = codigoDe(error);
    // mismo mensaje exista o no el correo (spec F01, "Entrar")
    if (codigo === "INVALID_EMAIL_OR_PASSWORD") {
      throw new ErrorApi(401, MENSAJES_CUENTA.credencialesIncorrectas);
    }
    if (codigo === "INVALID_EMAIL") throw errorCorreoInvalido();
    throw error;
  }
}

// Sin sesión no falla: Better Auth solo devuelve la cookie borrada.
export async function cerrarSesion(cabeceras: Headers): Promise<Headers> {
  const { headers } = await auth.api.signOut({ headers: cabeceras, returnHeaders: true });
  return headers;
}
