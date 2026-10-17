import type { NextFunction, Request, Response } from "express";

// Error esperado de la API: se lanza desde rutas y servicios y lo responde
// manejarErrores con su estado HTTP. Cualquier otro error es un 500.
export class ErrorApi extends Error {
  estado: number;

  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

export function rutaNoEncontrada(req: Request, _res: Response, siguiente: NextFunction) {
  siguiente(new ErrorApi(404, `No existe ${req.method} ${req.path}`));
}

// Express reconoce el manejador de errores porque recibe 4 argumentos.
export function manejarErrores(
  error: unknown,
  _req: Request,
  res: Response,
  _siguiente: NextFunction,
) {
  if (error instanceof ErrorApi) {
    res.status(error.estado).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Error interno del servidor" });
}
