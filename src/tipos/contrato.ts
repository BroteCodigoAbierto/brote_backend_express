// GENERADO desde brote_specs/contrato/contrato.ts (versión 0.2.0).
// No editar a mano: cambia la copia oficial y corre `npm run contrato:copiar` en brote_specs.

// Contrato de Brote: los tipos que viajan entre la API, la web y el móvil.
//
// Esta es la copia oficial. Los repos de código reciben una copia en
// src/tipos/contrato.ts con `npm run contrato:copiar`.
//
// Los tipos se agregan aquí cuando el plan de una feature los define
// (sección "Cambios al contrato"), no antes.

// ---------------------------------------------------------------------------
// Errores (F01): forma de toda respuesta de error de la API.
// ---------------------------------------------------------------------------

export type RespuestaError = {
  error: string;
  // solo en errores de formulario: nombre del campo del cuerpo → mensaje
  campos?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Cuentas y sesión (F01)
// ---------------------------------------------------------------------------

export type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  creadoEn: string; // ISO 8601
};

export type RespuestaUsuario = {
  usuario: Usuario;
};

export type CuerpoCrearCuenta = {
  nombre: string;
  correo: string;
  contrasena: string;
};

export type CuerpoEntrar = {
  correo: string;
  contrasena: string;
};

// El móvil manda esta cabecera para recibir la sesión como token
// (cabecera `set-auth-token`) y no como cookie.
export const CABECERA_CLIENTE = { nombre: "X-Cliente", movil: "movil" } as const;
export const CABECERA_TOKEN = "set-auth-token";

// Longitudes en caracteres Unicode: Array.from(texto).length
export const LIMITES_CUENTA = {
  nombreMax: 50,
  correoMax: 254,
  contrasenaMin: 8,
  contrasenaMax: 128,
} as const;

// Una sola @, algo antes, dominio con al menos un punto que no está al inicio
// ni al final, sin espacios. Se aplica al correo ya recortado.
export const PATRON_CORREO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const MENSAJES_CUENTA = {
  datosInvalidos: "Revisa los datos marcados.",
  nombreVacio: "Escribe tu nombre.",
  nombreLargo: "El nombre puede tener hasta 50 caracteres.",
  correoVacio: "Escribe tu correo.",
  correoInvalido: "Escribe un correo válido.",
  correoRepetido: "Ya existe una cuenta con ese correo.",
  contrasenaVacia: "Escribe una contraseña.",
  contrasenaVaciaEntrar: "Escribe tu contraseña.",
  contrasenaCorta: "La contraseña debe tener al menos 8 caracteres.",
  contrasenaLarga: "La contraseña puede tener hasta 128 caracteres.",
  credencialesIncorrectas: "Correo o contraseña incorrectos.",
  sesionTerminada: "Tu sesión terminó. Vuelve a entrar.",
} as const;
