import { ErrorApi } from "../middleware/errores.ts";
import { LIMITES_MODERACION, MENSAJES_MODERACION } from "../tipos/contrato.ts";

// El cuerpo de "No aprobar" (decisión 0018): { motivo? }. Sin cuerpo, sin motivo o con uno
// vacío, no hay motivo. Devuelve el motivo sin espacios a los lados, o null.
export function validarCuerpoRechazo(cuerpo: unknown): string | null {
  if (cuerpo === undefined || cuerpo === null) return null;
  if (typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    throw new ErrorApi(400, MENSAJES_MODERACION.motivoLargo);
  }
  const { motivo } = cuerpo as Record<string, unknown>;
  if (motivo === undefined || motivo === null) return null;
  if (typeof motivo !== "string") throw new ErrorApi(400, MENSAJES_MODERACION.motivoLargo);
  const limpio = motivo.trim();
  if (Array.from(limpio).length > LIMITES_MODERACION.motivoMax) {
    throw new ErrorApi(400, MENSAJES_MODERACION.motivoLargo, {
      motivo: MENSAJES_MODERACION.motivoLargo,
    });
  }
  return limpio === "" ? null : limpio;
}
