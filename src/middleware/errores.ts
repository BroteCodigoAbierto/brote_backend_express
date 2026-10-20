import type { NextFunction, Request, Response } from "express";
import type { RespuestaError } from "../tipos/contrato.ts";

// Error esperado de la API: se lanza desde rutas y servicios y lo responde
// manejarErrores con su estado HTTP. Cualquier otro error es un 500.
// `campos` lleva un mensaje por campo cuando el error es de un formulario.
export class ErrorApi extends Error {
  estado: number;
  campos?: Record<string, string>;

  constructor(estado: number, mensaje: string, campos?: Record<string, string>) {
    super(mensaje);
    this.estado = estado;
    this.campos = campos;
  }
}

export function rutaNoEncontrada(req: Request, _res: Response, siguiente: NextFunction) {
  siguiente(new ErrorApi(404, `No existe ${req.method} ${req.path}`));
}

function esJsonMalFormado(error: unknown): boolean {
  return (error as { type?: unknown } | null)?.type === "entity.parse.failed";
}

// Express reconoce el manejador de errores porque recibe 4 argumentos.
export function manejarErrores(
  error: unknown,
  _req: Request,
  res: Response,
  _siguiente: NextFunction,
) {
  if (error instanceof ErrorApi) {
    const cuerpo: RespuestaError = { error: error.message };
    if (error.campos) cuerpo.campos = error.campos;
    res.status(error.estado).json(cuerpo);
    return;
  }
  // express.json() no pudo leer el cuerpo: es culpa de la petición, no un 500
  if (esJsonMalFormado(error)) {
    const cuerpo: RespuestaError = { error: "El cuerpo de la petición no es JSON válido." };
    res.status(400).json(cuerpo);
    return;
  }
  console.error(error);
  const cuerpo: RespuestaError = { error: "Error interno del servidor" };
  res.status(500).json(cuerpo);
}
