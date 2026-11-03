import { ErrorApi } from "../middleware/errores.ts";
import { MENSAJES_PROGRESO, type CuerpoProgresoLeccion } from "../tipos/contrato.ts";

// Forma del resultado de una lección (spec F04, "Resultado coherente"). Que
// cuadre con las preguntas de la lección lo comprueba registrarProgreso, porque
// necesita la lección.

function esConteo(valor: unknown): valor is number {
  return Number.isInteger(valor) && (valor as number) >= 0;
}

// Exactamente { aciertos, preguntas }, enteros y no negativos; cualquier otra
// cosa es el mismo 400.
export function validarCuerpoProgreso(cuerpo: unknown): CuerpoProgresoLeccion {
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    throw new ErrorApi(400, MENSAJES_PROGRESO.resultadoInvalido);
  }
  const claves = Object.keys(cuerpo).sort();
  const { aciertos, preguntas } = cuerpo as Record<string, unknown>;
  if (
    claves.length !== 2 ||
    claves[0] !== "aciertos" ||
    claves[1] !== "preguntas" ||
    !esConteo(aciertos) ||
    !esConteo(preguntas)
  ) {
    throw new ErrorApi(400, MENSAJES_PROGRESO.resultadoInvalido);
  }
  return { aciertos, preguntas };
}
