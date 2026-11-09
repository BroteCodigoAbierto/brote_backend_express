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
  type ImagenActividad,
} from "../tipos/contrato.ts";
import { ErrorActividades, mapearImagenes, validarActividades } from "./actividades.ts";

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

// F13: sin idPortada la portada no cambia; con null se quita. Que sea una imagen del curso
// y no un GIF lo comprueba el servicio, porque necesita la base.
function idPortadaDe(cuerpo: unknown): { valor?: string | null; error?: string } {
  if (!esObjeto(cuerpo) || !("idPortada" in cuerpo)) return {};
  const { idPortada } = cuerpo;
  if (idPortada === null) return { valor: null };
  if (typeof idPortada === "string" && idPortada.trim() !== "") return { valor: idPortada };
  return { error: MENSAJES_EDITOR.datosInvalidos };
}

// El título se guarda recortado; la descripción, tal como se escribió.
export function validarDatosCurso(cuerpo: unknown): CuerpoDatosCurso {
  const titulo = texto(cuerpo, "titulo").trim();
  const descripcion = texto(cuerpo, "descripcion");
  const portada = idPortadaDe(cuerpo);
  const errores: Errores = {};
  const errorTitulo = errorDeTexto(titulo, LIMITES_CURSO.tituloMax);
  const errorDescripcion = errorDeTexto(descripcion, LIMITES_CURSO.descripcionMax);
  if (errorTitulo) errores.titulo = errorTitulo;
  if (errorDescripcion) errores.descripcion = errorDescripcion;
  if (portada.error) errores.portada = portada.error;
  lanzarSiHayErrores(errores);
  return { titulo, descripcion, ...(portada.valor !== undefined && { idPortada: portada.valor }) };
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

function recortarImagen(imagen: ImagenActividad): ImagenActividad {
  const { textoAlternativo, ...resto } = imagen;
  return textoAlternativo === undefined
    ? resto
    : { ...resto, textoAlternativo: textoAlternativo.trim() };
}

// El título de la teoría se guarda recortado, y también las fichas del banco, que se
// comparan por su texto exacto (F11), lo que en F12 va en una sola línea (la carpeta y
// los comandos de la terminal y los nombres de los commits y las ramas del grafo) y el
// texto alternativo de cada imagen (F13). Los demás textos, tal como se escribieron,
// porque muchas veces son código: el código inicial, la solución y las salidas conservan
// su sangría.
function recortarTextos(actividades: Actividad[]): Actividad[] {
  return actividades.map((original) => {
    const actividad = mapearImagenes(original, recortarImagen);
    if (actividad.tipo === "teoria" && actividad.titulo !== undefined) {
      return { ...actividad, titulo: actividad.titulo.trim() };
    }
    if (actividad.tipo === "bancoPalabras") {
      return {
        ...actividad,
        fichas: actividad.fichas.map((ficha) => ficha.trim()),
        espacios: actividad.espacios.map(({ aceptadas }) => ({
          aceptadas: aceptadas.map((aceptada) => aceptada.trim()),
        })),
      };
    }
    if (actividad.tipo === "terminalSimulada") {
      return {
        ...actividad,
        ...(actividad.carpeta !== undefined && { carpeta: actividad.carpeta.trim() }),
        comandos: actividad.comandos.map((comando) => comando.trim()),
      };
    }
    if (actividad.tipo === "grafoCommits") {
      return {
        ...actividad,
        commits: actividad.commits.map((commit) => ({ ...commit, nombre: commit.nombre.trim() })),
        ramas: actividad.ramas.map((rama) => ({ ...rama, nombre: rama.nombre.trim() })),
      };
    }
    return actividad;
  });
}

function validarActividadesDeLeccion(valor: unknown[]): Actividad[] {
  if (valor.length > LIMITES_LECCION.actividadesMax) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      actividades: MENSAJES_EDITOR.maxActividades,
    });
  }
  try {
    return recortarTextos(validarActividades(valor));
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
