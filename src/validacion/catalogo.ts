import { ErrorApi } from "../middleware/errores.ts";
import {
  CATEGORIAS_CURSO,
  IDIOMAS_CURSO,
  LIMITES_CATALOGO,
  MENSAJES_CATALOGO,
  NIVELES_CURSO,
  ORDENES_CATALOGO,
  type CategoriaCurso,
  type IdiomaCurso,
  type NivelCurso,
  type OrdenCatalogo,
} from "../tipos/contrato.ts";

// Parámetros de GET /cursos (spec F02 y decisión 0020).

export type PosicionCurso = { clave: string; creadoEn: Date; id: string; desplazamiento?: number };

export type ConsultaCatalogo = {
  palabras: string[];
  categoria: CategoriaCurso | null;
  nivel: NivelCurso | null;
  idioma: IdiomaCurso | null;
  orden: OrdenCatalogo;
  ocultarCompletados: boolean;
  organizacion: string | null;
  despues: PosicionCurso | null;
};

function parametro(query: unknown, nombre: string): unknown {
  if (typeof query !== "object" || query === null) return undefined;
  return (query as Record<string, unknown>)[nombre];
}

function errorCursor() {
  return new ErrorApi(400, MENSAJES_CATALOGO.cargaInvalida);
}

function leerEnumOpcional<T extends string>(valor: unknown, permitidos: readonly T[]): T | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const limpio = valor.trim();
  return (permitidos as readonly string[]).includes(limpio) ? (limpio as T) : null;
}

export function validarConsultaCatalogo(query: unknown): ConsultaCatalogo {
  const q = parametro(query, "q");
  const texto = typeof q === "string" ? q.trim() : "";
  if (Array.from(texto).length > LIMITES_CATALOGO.busquedaMax) {
    throw new ErrorApi(400, MENSAJES_CATALOGO.busquedaLarga);
  }
  const palabras = texto === "" ? [] : texto.split(/\s+/);

  const categoria = leerEnumOpcional(parametro(query, "categoria"), CATEGORIAS_CURSO);
  const nivel = leerEnumOpcional(parametro(query, "nivel"), NIVELES_CURSO);
  const idioma = leerEnumOpcional(parametro(query, "idioma"), IDIOMAS_CURSO);
  const orden = leerEnumOpcional(parametro(query, "orden"), ORDENES_CATALOGO) ?? "destacados";
  const ocultarParam = parametro(query, "ocultarCompletados");
  const ocultarCompletados = ocultarParam === "1" || ocultarParam === "true";

  const orgParam = parametro(query, "organizacion");
  const organizacion =
    typeof orgParam === "string" && orgParam.trim() !== "" ? orgParam.trim().toLowerCase() : null;

  const despues = parametro(query, "despues");
  if (despues === undefined || despues === "") {
    return {
      palabras,
      categoria,
      nivel,
      idioma,
      orden,
      ocultarCompletados,
      organizacion,
      despues: null,
    };
  }
  if (typeof despues !== "string") throw errorCursor();
  return {
    palabras,
    categoria,
    nivel,
    idioma,
    orden,
    ocultarCompletados,
    organizacion,
    despues: leerCursor(despues),
  };
}

// El cursor guarda la posición en JSON y base64url. Soporta tanto el cursor
// clásico [clave, creadoEn, id] como un desplazamiento numérico para ordenamientos
// distintos a A–Z.
export function leerCursor(texto: string): PosicionCurso {
  let valor: unknown;
  try {
    valor = JSON.parse(Buffer.from(texto, "base64url").toString("utf8"));
  } catch {
    throw errorCursor();
  }
  if (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    typeof (valor as Record<string, unknown>).desplazamiento === "number"
  ) {
    const desplazamiento = (valor as { desplazamiento: number }).desplazamiento;
    if (!Number.isInteger(desplazamiento) || desplazamiento < 0) throw errorCursor();
    return { clave: "", creadoEn: new Date(0), id: "", desplazamiento };
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

export function crearCursor({ clave, creadoEn, id, desplazamiento }: PosicionCurso): string {
  if (desplazamiento !== undefined) {
    return Buffer.from(JSON.stringify({ desplazamiento })).toString("base64url");
  }
  return Buffer.from(JSON.stringify([clave, creadoEn.toISOString(), id])).toString("base64url");
}
