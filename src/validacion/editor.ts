import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_CURSO,
  LIMITES_LECCION,
  MENSAJES_EDITOR,
  type Actividad,
  type CuerpoDatosCurso,
  type CuerpoGuardarLeccion,
  type CuerpoNuevaLeccion,
  type CuerpoOrdenLecciones,
} from "../tipos/contrato.ts";
import { ErrorActividades, validarActividades } from "./actividades.ts";

// Cuerpos de las rutas del editor (spec F05; brote_specs, contracts/api.md de
// F05). Son las mismas reglas que valida la web, que solo las aplica para dar
// buena experiencia. Que el curso y la lección se puedan cambiar lo comprueba
// el servicio, porque necesita la base.

type Errores = Record<string, string>;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// En caracteres Unicode, igual que el resto del contrato.
function largo(texto: string): number {
  return Array.from(texto).length;
}

// Un campo que falta o no es texto cuenta como vacío.
function texto(cuerpo: unknown, campo: string): string {
  const valor = esObjeto(cuerpo) ? cuerpo[campo] : undefined;
  return typeof valor === "string" ? valor : "";
}

function errorDeTexto(valor: string, maximo: number): string | undefined {
  if (valor.trim() === "") return MENSAJES_EDITOR.campoObligatorio;
  if (largo(valor) > maximo) return MENSAJES_EDITOR.textoLargo;
  return undefined;
}

function lanzarSiHayErrores(errores: Errores) {
  if (Object.keys(errores).length > 0) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, errores);
  }
}

// El título se guarda recortado; la descripción, tal como se escribió.
export function validarDatosCurso(cuerpo: unknown): CuerpoDatosCurso {
  const titulo = texto(cuerpo, "titulo").trim();
  const descripcion = texto(cuerpo, "descripcion");
  const errores: Errores = {};
  const errorTitulo = errorDeTexto(titulo, LIMITES_CURSO.tituloMax);
  const errorDescripcion = errorDeTexto(descripcion, LIMITES_CURSO.descripcionMax);
  if (errorTitulo) errores.titulo = errorTitulo;
  if (errorDescripcion) errores.descripcion = errorDescripcion;
  lanzarSiHayErrores(errores);
  return { titulo, descripcion };
}

export function validarNuevaLeccion(cuerpo: unknown): CuerpoNuevaLeccion {
  const titulo = texto(cuerpo, "titulo").trim();
  const errorTitulo = errorDeTexto(titulo, LIMITES_LECCION.tituloMax);
  if (errorTitulo) lanzarSiHayErrores({ titulo: errorTitulo });
  return { titulo };
}

// Que la lista coincida con las lecciones del curso lo decide el servicio (409).
export function validarOrdenLecciones(cuerpo: unknown): CuerpoOrdenLecciones {
  const ids = esObjeto(cuerpo) ? cuerpo.idsLecciones : undefined;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  }
  return { idsLecciones: ids as string[] };
}

const CLAVES_LECCION = ["titulo", "actividades", "version", "reemplazar"];

function tieneFormaDeLeccion(cuerpo: unknown): cuerpo is Record<string, unknown> {
  if (!esObjeto(cuerpo)) return false;
  const { actividades, version, reemplazar } = cuerpo;
  return (
    Object.keys(cuerpo).every((clave) => CLAVES_LECCION.includes(clave)) &&
    Array.isArray(actividades) &&
    Number.isInteger(version) &&
    (version as number) >= 1 &&
    (reemplazar === undefined || typeof reemplazar === "boolean")
  );
}

// El título de la teoría se guarda recortado; los demás textos, tal como se
// escribieron, porque muchas veces son código.
function recortarTitulos(actividades: Actividad[]): Actividad[] {
  return actividades.map((actividad) =>
    actividad.tipo === "teoria" && actividad.titulo !== undefined
      ? { ...actividad, titulo: actividad.titulo.trim() }
      : actividad,
  );
}

function validarActividadesDeLeccion(valor: unknown[]): Actividad[] {
  if (valor.length > LIMITES_LECCION.actividadesMax) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      actividades: MENSAJES_EDITOR.maxActividades,
    });
  }
  try {
    return recortarTitulos(validarActividades(valor));
  } catch (error) {
    if (!(error instanceof ErrorActividades)) throw error;
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      [`actividades.${error.indice}`]: error.message,
    });
  }
}

export function validarCuerpoLeccion(cuerpo: unknown): CuerpoGuardarLeccion {
  if (!tieneFormaDeLeccion(cuerpo)) throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  const titulo = texto(cuerpo, "titulo").trim();
  const errorTitulo = errorDeTexto(titulo, LIMITES_LECCION.tituloMax);
  if (errorTitulo) lanzarSiHayErrores({ titulo: errorTitulo });
  return {
    titulo,
    actividades: validarActividadesDeLeccion(cuerpo.actividades as unknown[]),
    version: cuerpo.version as number,
    reemplazar: cuerpo.reemplazar as boolean | undefined,
  };
}
