import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_REPORTE,
  MENSAJES_EDITOR,
  MENSAJES_REPORTE,
  type CuerpoReporteActividad,
} from "../tipos/contrato.ts";

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function largo(texto: string): number {
  return Array.from(texto).length;
}

export function validarReporteActividad(cuerpo: unknown): CuerpoReporteActividad {
  if (!esObjeto(cuerpo)) throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  const indice = cuerpo.indiceActividad;
  const mensaje = typeof cuerpo.mensaje === "string" ? cuerpo.mensaje.trim() : "";

  const errores: Record<string, string> = {};
  if (typeof indice !== "number" || !Number.isInteger(indice) || indice < 0) {
    errores.indiceActividad = MENSAJES_EDITOR.datosInvalidos;
  }
  if (!mensaje) errores.mensaje = MENSAJES_REPORTE.mensajeVacio;
  else if (largo(mensaje) > LIMITES_REPORTE.mensajeMax) {
    errores.mensaje = MENSAJES_REPORTE.mensajeLargo;
  }

  if (Object.keys(errores).length > 0) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, errores);
  }

  return { indiceActividad: indice as number, mensaje };
}

export function validarEstadoReporte(cuerpo: unknown): { resuelto: boolean } {
  if (!esObjeto(cuerpo) || typeof cuerpo.resuelto !== "boolean") {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  }
  return { resuelto: cuerpo.resuelto };
}
