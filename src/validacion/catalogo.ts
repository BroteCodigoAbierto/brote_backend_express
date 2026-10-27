import { ErrorApi } from "../middleware/errores.ts";
import { LIMITES_CATALOGO, MENSAJES_CATALOGO } from "../tipos/contrato.ts";

// Parámetros de GET /cursos (spec F02, "Validaciones"; brote_specs,
// contracts/api.md de F02). Cualquier otro parámetro se ignora: el tamaño de
// cada carga lo decide el servidor.

// Lugar de un curso en el orden del catálogo. Es lo que guarda el cursor
// `siguiente` para pedir los cursos que vienen después.
export type PosicionCurso = { clave: string; creadoEn: Date; id: string };

export type ConsultaCatalogo = { palabras: string[]; despues: PosicionCurso | null };

function parametro(query: unknown, nombre: string): unknown {
  if (typeof query !== "object" || query === null) return undefined;
  return (query as Record<string, unknown>)[nombre];
}

function errorCursor() {
  return new ErrorApi(400, MENSAJES_CATALOGO.cargaInvalida);
}

export function validarConsultaCatalogo(query: unknown): ConsultaCatalogo {
  const q = parametro(query, "q");
  // ?q=a&q=b llega como arreglo: cuenta como vacío, igual que en F01
  const texto = typeof q === "string" ? q.trim() : "";
  // en caracteres Unicode, como cuentan los clientes
  if (Array.from(texto).length > LIMITES_CATALOGO.busquedaMax) {
    throw new ErrorApi(400, MENSAJES_CATALOGO.busquedaLarga);
  }
  const palabras = texto === "" ? [] : texto.split(/\s+/);

  const despues = parametro(query, "despues");
  if (despues === undefined || despues === "") return { palabras, despues: null };
  if (typeof despues !== "string") throw errorCursor();
  return { palabras, despues: leerCursor(despues) };
}

// El cursor es [clave, creadoEn, id] en JSON y base64url. Los clientes lo
// devuelven tal cual; si no se puede leer, alguien lo cambió.
export function leerCursor(texto: string): PosicionCurso {
  let valor: unknown;
  try {
    valor = JSON.parse(Buffer.from(texto, "base64url").toString("utf8"));
  } catch {
    throw errorCursor();
  }
  if (!Array.isArray(valor) || valor.length !== 3) throw errorCursor();
  const [clave, fecha, id] = valor as unknown[];
  if (typeof clave !== "string" || typeof fecha !== "string" || typeof id !== "string") {
    throw errorCursor();
  }
  const creadoEn = new Date(fecha);
  if (Number.isNaN(creadoEn.getTime())) throw errorCursor();
  return { clave, creadoEn, id };
}

export function crearCursor({ clave, creadoEn, id }: PosicionCurso): string {
  return Buffer.from(JSON.stringify([clave, creadoEn.toISOString(), id])).toString("base64url");
}
