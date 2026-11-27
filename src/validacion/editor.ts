import { ErrorApi } from "../middleware/errores.ts";
import {
  CATEGORIAS_CURSO,
  IDIOMAS_CURSO,
  LIMITES_CURSO,
  LIMITES_LECCION,
  MENSAJES_EDITOR,
  NIVELES_CURSO,
  VISIBILIDADES_CURSO,
  type Actividad,
  type CategoriaCurso,
  type CuerpoDatosCurso,
  type CuerpoForkCurso,
  type CuerpoGuardarLeccion,
  type CuerpoNuevaLeccion,
  type CuerpoOrdenLecciones,
  type CursoExportado,
  type IdiomaCurso,
  type ImagenActividad,
  type NivelCurso,
  type VisibilidadCurso,
} from "../tipos/contrato.ts";
import {
  ErrorActividades,
  idsDeAudios,
  idsDeImagenes,
  mapearImagenes,
  validarActividades,
} from "./actividades.ts";

// Cuerpos de las rutas del editor (spec F05 + decisión 0020). Son las mismas reglas
// que valida la web, que solo las aplica para dar buena experiencia. Que el curso y
// la lección se puedan cambiar lo comprueba el servicio, porque necesita la base.

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

function idOpcionalDe(
  cuerpo: unknown,
  clave: string,
): { valor?: string | null; error?: string } {
  if (!esObjeto(cuerpo) || !(clave in cuerpo)) return {};
  const valor = cuerpo[clave];
  if (valor === null) return { valor: null };
  if (typeof valor === "string" && valor.trim() !== "") return { valor: valor.trim() };
  return { error: MENSAJES_EDITOR.datosInvalidos };
}

function deLista<T extends string>(
  cuerpo: unknown,
  clave: string,
  permitidos: readonly T[],
): { valor?: T; error?: string } {
  if (!esObjeto(cuerpo) || !(clave in cuerpo)) return {};
  const valor = cuerpo[clave];
  if ((permitidos as readonly unknown[]).includes(valor)) {
    return { valor: valor as T };
  }
  return { error: MENSAJES_EDITOR.datosInvalidos };
}

function booleanoOpcionalDe(
  cuerpo: unknown,
  clave: string,
): { valor?: boolean; error?: string } {
  if (!esObjeto(cuerpo) || !(clave in cuerpo)) return {};
  const valor = cuerpo[clave];
  if (typeof valor === "boolean") return { valor };
  return { error: MENSAJES_EDITOR.datosInvalidos };
}

function etiquetasDe(cuerpo: unknown): { valor?: string[]; error?: string } {
  if (!esObjeto(cuerpo) || !("etiquetas" in cuerpo)) return {};
  const { etiquetas } = cuerpo;
  if (!Array.isArray(etiquetas)) return { error: MENSAJES_EDITOR.datosInvalidos };
  const limpias: string[] = [];
  const vistas = new Set<string>();
  for (const item of etiquetas) {
    if (typeof item !== "string") return { error: MENSAJES_EDITOR.datosInvalidos };
    const limpia = item.trim();
    if (!limpia) continue;
    if (largo(limpia) > LIMITES_CURSO.etiquetaMax) {
      return { error: MENSAJES_EDITOR.textoLargo };
    }
    const clave = limpia.toLowerCase();
    if (!vistas.has(clave)) {
      vistas.add(clave);
      limpias.push(limpia);
    }
  }
  if (limpias.length > LIMITES_CURSO.etiquetasMax) {
    return { error: MENSAJES_EDITOR.datosInvalidos };
  }
  return { valor: limpias };
}

function moduloOpcionalDe(cuerpo: unknown): { valor?: string | null; error?: string } {
  if (!esObjeto(cuerpo) || !("modulo" in cuerpo)) return {};
  const { modulo } = cuerpo;
  if (modulo === null) return { valor: null };
  if (typeof modulo !== "string") return { error: MENSAJES_EDITOR.datosInvalidos };
  const limpio = modulo.trim();
  if (!limpio) return { valor: null };
  if (largo(limpio) > LIMITES_LECCION.moduloMax) {
    return { error: MENSAJES_EDITOR.textoLargo };
  }
  return { valor: limpio };
}

// El título se guarda recortado; la descripción, tal como se escribió.
export function validarDatosCurso(cuerpo: unknown): CuerpoDatosCurso {
  const titulo = texto(cuerpo, "titulo").trim();
  const descripcion = texto(cuerpo, "descripcion");
  const portada = idOpcionalDe(cuerpo, "idPortada");
  const idioma = deLista<IdiomaCurso>(cuerpo, "idioma", IDIOMAS_CURSO);
  const daInsignia = booleanoOpcionalDe(cuerpo, "daInsignia");
  const categoria = deLista<CategoriaCurso>(cuerpo, "categoria", CATEGORIAS_CURSO);
  const nivel = deLista<NivelCurso>(cuerpo, "nivel", NIVELES_CURSO);
  const etiquetas = etiquetasDe(cuerpo);
  const visibilidad = deLista<VisibilidadCurso>(cuerpo, "visibilidad", VISIBILIDADES_CURSO);
  const idOrganizacion = idOpcionalDe(cuerpo, "idOrganizacion");
  const tambienPublico = booleanoOpcionalDe(cuerpo, "tambienPublico");
  const permiteFork = booleanoOpcionalDe(cuerpo, "permiteFork");

  const errores: Errores = {};
  const errorTitulo = errorDeTexto(titulo, LIMITES_CURSO.tituloMax);
  const errorDescripcion = errorDeTexto(descripcion, LIMITES_CURSO.descripcionMax);
  if (errorTitulo) errores.titulo = errorTitulo;
  if (errorDescripcion) errores.descripcion = errorDescripcion;
  if (portada.error) errores.portada = portada.error;
  if (idioma.error) errores.idioma = idioma.error;
  if (daInsignia.error) errores.daInsignia = daInsignia.error;
  if (categoria.error) errores.categoria = categoria.error;
  if (nivel.error) errores.nivel = nivel.error;
  if (etiquetas.error) errores.etiquetas = etiquetas.error;
  if (visibilidad.error) errores.visibilidad = visibilidad.error;
  if (idOrganizacion.error) errores.idOrganizacion = idOrganizacion.error;
  if (tambienPublico.error) errores.tambienPublico = tambienPublico.error;
  if (permiteFork.error) errores.permiteFork = permiteFork.error;
  lanzarSiHayErrores(errores);

  return {
    titulo,
    descripcion,
    ...(portada.valor !== undefined && { idPortada: portada.valor }),
    ...(idioma.valor && { idioma: idioma.valor }),
    ...(daInsignia.valor !== undefined && { daInsignia: daInsignia.valor }),
    ...(categoria.valor && { categoria: categoria.valor }),
    ...(nivel.valor && { nivel: nivel.valor }),
    ...(etiquetas.valor !== undefined && { etiquetas: etiquetas.valor }),
    ...(visibilidad.valor && { visibilidad: visibilidad.valor }),
    ...(idOrganizacion.valor !== undefined && { idOrganizacion: idOrganizacion.valor }),
    ...(tambienPublico.valor !== undefined && { tambienPublico: tambienPublico.valor }),
    ...(permiteFork.valor !== undefined && { permiteFork: permiteFork.valor }),
  };
}

export function validarNuevaLeccion(cuerpo: unknown): CuerpoNuevaLeccion {
  const titulo = texto(cuerpo, "titulo").trim();
  const modulo = moduloOpcionalDe(cuerpo);
  const errores: Errores = {};
  const errorTitulo = errorDeTexto(titulo, LIMITES_LECCION.tituloMax);
  if (errorTitulo) errores.titulo = errorTitulo;
  if (modulo.error) errores.modulo = modulo.error;
  lanzarSiHayErrores(errores);
  return {
    titulo,
    ...(modulo.valor !== undefined && { modulo: modulo.valor }),
  };
}

// Que la lista coincida con las lecciones del curso lo decide el servicio (409).
export function validarOrdenLecciones(cuerpo: unknown): CuerpoOrdenLecciones {
  const ids = esObjeto(cuerpo) ? cuerpo.idsLecciones : undefined;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  }
  return { idsLecciones: ids as string[] };
}

const CLAVES_LECCION = ["titulo", "modulo", "actividades", "version", "reemplazar"];

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
// los comandos de la terminal y los nombres de los commits y las ramas del grafo), el
// texto alternativo de cada imagen (F13) y la frase de escuchar y repetir (F14). Los demás
// textos, tal como se escribieron, porque muchas veces son código: el código inicial, la
// solución y las salidas conservan su sangría.
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
    if (actividad.tipo === "escucharRepetir") {
      return { ...actividad, frase: actividad.frase.trim() };
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
  const modulo = moduloOpcionalDe(cuerpo);
  const errores: Errores = {};
  const errorTitulo = errorDeTexto(titulo, LIMITES_LECCION.tituloMax);
  if (errorTitulo) errores.titulo = errorTitulo;
  if (modulo.error) errores.modulo = modulo.error;
  lanzarSiHayErrores(errores);
  return {
    titulo,
    ...(modulo.valor !== undefined && { modulo: modulo.valor }),
    actividades: validarActividadesDeLeccion(cuerpo.actividades as unknown[]),
    version: cuerpo.version as number,
    reemplazar: cuerpo.reemplazar as boolean | undefined,
  };
}

export function validarForkCurso(cuerpo: unknown): CuerpoForkCurso {
  if (cuerpo === undefined || cuerpo === null) return {};
  if (!esObjeto(cuerpo)) throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  const idOrganizacion = idOpcionalDe(cuerpo, "idOrganizacion");
  const errores: Errores = {};
  if (idOrganizacion.error) errores.idOrganizacion = idOrganizacion.error;
  let titulo: string | undefined;
  if ("titulo" in cuerpo && cuerpo.titulo !== undefined) {
    if (typeof cuerpo.titulo !== "string") {
      errores.titulo = MENSAJES_EDITOR.datosInvalidos;
    } else {
      const limpio = cuerpo.titulo.trim();
      if (limpio) {
        if (largo(limpio) > LIMITES_CURSO.tituloMax) {
          errores.titulo = MENSAJES_EDITOR.textoLargo;
        } else {
          titulo = limpio;
        }
      }
    }
  }
  lanzarSiHayErrores(errores);
  return {
    ...(idOrganizacion.valor !== undefined && { idOrganizacion: idOrganizacion.valor }),
    ...(titulo && { titulo }),
  };
}

// Importar un curso desde JSON portable (F07 / decisión 0020).
export function validarCursoImportado(cuerpo: unknown): CursoExportado {
  if (!esObjeto(cuerpo) || cuerpo.formato !== "brote-curso-v1") {
    throw new ErrorApi(400, MENSAJES_EDITOR.importacionInvalida);
  }
  const datos = validarDatosCurso({
    titulo: cuerpo.titulo,
    descripcion: cuerpo.descripcion,
    idioma: cuerpo.idioma ?? "es",
    categoria: cuerpo.categoria ?? "otros",
    nivel: cuerpo.nivel ?? "principiante",
    etiquetas: Array.isArray(cuerpo.etiquetas) ? cuerpo.etiquetas : [],
    daInsignia: typeof cuerpo.daInsignia === "boolean" ? cuerpo.daInsignia : false,
    permiteFork: typeof cuerpo.permiteFork === "boolean" ? cuerpo.permiteFork : true,
  });

  if (!Array.isArray(cuerpo.lecciones) || cuerpo.lecciones.length > LIMITES_CURSO.leccionesMax) {
    throw new ErrorApi(400, MENSAJES_EDITOR.importacionInvalida);
  }

  const lecciones = cuerpo.lecciones.map((item, indice) => {
    if (!esObjeto(item) || !Array.isArray(item.actividades)) {
      throw new ErrorApi(400, `${MENSAJES_EDITOR.importacionInvalida} (lección ${indice + 1})`);
    }
    const titulo = texto(item, "titulo").trim();
    const errorTitulo = errorDeTexto(titulo, LIMITES_LECCION.tituloMax);
    if (errorTitulo) {
      throw new ErrorApi(400, `${MENSAJES_EDITOR.importacionInvalida} (lección ${indice + 1})`);
    }
    const modulo = moduloOpcionalDe(item);
    if (modulo.error) {
      throw new ErrorApi(400, `${MENSAJES_EDITOR.importacionInvalida} (lección ${indice + 1})`);
    }
    const actividades = validarActividadesDeLeccion(item.actividades);
    // El JSON portable no incluye binarios de otro servidor.
    if (idsDeImagenes(actividades).length > 0 || idsDeAudios(actividades).length > 0) {
      throw new ErrorApi(
        400,
        "El archivo JSON contiene referencias a imágenes o audios locales que no se pueden importar.",
      );
    }
    return {
      titulo,
      modulo: modulo.valor ?? null,
      actividades,
    };
  });

  return {
    formato: "brote-curso-v1",
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    idioma: datos.idioma ?? "es",
    categoria: datos.categoria ?? "otros",
    nivel: datos.nivel ?? "principiante",
    etiquetas: datos.etiquetas ?? [],
    daInsignia: datos.daInsignia ?? false,
    permiteFork: datos.permiteFork ?? true,
    lecciones,
  };
}
