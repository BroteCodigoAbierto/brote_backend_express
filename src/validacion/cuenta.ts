import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_CUENTA,
  MENSAJES_CUENTA,
  PATRON_CORREO,
  type CuerpoCrearCuenta,
  type CuerpoEntrar,
} from "../tipos/contrato.ts";

// Mismas reglas que validan la web y el móvil (spec F01, "Validaciones"):
// el cliente las aplica para dar buena experiencia y aquí se vuelven a aplicar.

type Errores = Record<string, string>;

// En caracteres Unicode y no en unidades UTF-16, para contar igual que los
// clientes: "é" es 1 y un emoji simple también.
function largo(texto: string): number {
  return Array.from(texto).length;
}

// Un campo que falta o no es texto cuenta como vacío.
function comoTexto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function campo(cuerpo: unknown, nombre: string): string {
  if (typeof cuerpo !== "object" || cuerpo === null) return "";
  return comoTexto((cuerpo as Record<string, unknown>)[nombre]);
}

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

function errorCorreo(correo: string): string | undefined {
  if (correo === "") return MENSAJES_CUENTA.correoVacio;
  if (largo(correo) > LIMITES_CUENTA.correoMax || !PATRON_CORREO.test(correo)) {
    return MENSAJES_CUENTA.correoInvalido;
  }
  return undefined;
}

function lanzarSiHayErrores(errores: Errores) {
  if (Object.keys(errores).length > 0) {
    throw new ErrorApi(400, MENSAJES_CUENTA.datosInvalidos, errores);
  }
}

export function validarCrearCuenta(cuerpo: unknown): CuerpoCrearCuenta {
  const nombre = campo(cuerpo, "nombre").trim();
  const correo = normalizarCorreo(campo(cuerpo, "correo"));
  const contrasena = campo(cuerpo, "contrasena"); // se usa tal como se escribió
  const errores: Errores = {};

  if (nombre === "") errores.nombre = MENSAJES_CUENTA.nombreVacio;
  else if (largo(nombre) > LIMITES_CUENTA.nombreMax) errores.nombre = MENSAJES_CUENTA.nombreLargo;

  const mensajeCorreo = errorCorreo(correo);
  if (mensajeCorreo) errores.correo = mensajeCorreo;

  if (contrasena === "") errores.contrasena = MENSAJES_CUENTA.contrasenaVacia;
  else if (largo(contrasena) < LIMITES_CUENTA.contrasenaMin) {
    errores.contrasena = MENSAJES_CUENTA.contrasenaCorta;
  } else if (largo(contrasena) > LIMITES_CUENTA.contrasenaMax) {
    errores.contrasena = MENSAJES_CUENTA.contrasenaLarga;
  }

  lanzarSiHayErrores(errores);
  return { nombre, correo, contrasena };
}

// Al entrar no se revisa la longitud de la contraseña: si no cumple, solo no
// coincide (así no se dan pistas de las reglas).
export function validarEntrar(cuerpo: unknown): CuerpoEntrar {
  const correo = normalizarCorreo(campo(cuerpo, "correo"));
  const contrasena = campo(cuerpo, "contrasena");
  const errores: Errores = {};

  const mensajeCorreo = errorCorreo(correo);
  if (mensajeCorreo) errores.correo = mensajeCorreo;
  if (contrasena === "") errores.contrasena = MENSAJES_CUENTA.contrasenaVaciaEntrar;

  lanzarSiHayErrores(errores);
  return { correo, contrasena };
}
