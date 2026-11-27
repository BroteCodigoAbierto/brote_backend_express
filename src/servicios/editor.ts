import { randomBytes } from "node:crypto";
import { bd } from "../config/bd.ts";
import type { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_ARCHIVOS,
  LIMITES_CURSO,
  MARCA_IMAGEN,
  MENSAJES_ARCHIVOS,
  MENSAJES_AUDIOS,
  MENSAJES_CATALOGO,
  MENSAJES_EDITOR,
  MENSAJES_IMAGENES,
  MENSAJES_LECCION,
  type Actividad,
  type CategoriaCurso,
  type CuerpoDatosCurso,
  type CuerpoForkCurso,
  type CuerpoGuardarLeccion,
  type CuerpoNuevaLeccion,
  type CursoDelAutor,
  type CursoEnEditor,
  type CursoExportado,
  type EstadoCurso,
  type IdiomaCurso,
  type LeccionEnEditor,
  type LeccionEnMapa,
  type NivelCurso,
  type VisibilidadCurso,
} from "../tipos/contrato.ts";
import {
  audiosDeActividad,
  idsDeAudios,
  idsDeImagenes,
  imagenesDeActividad,
  mapearAudios,
  mapearImagenes,
} from "../validacion/actividades.ts";
import { pesoArchivosCurso } from "./archivos.ts";
import { audiosDelCurso, borrarAudiosSinUso } from "./audios.ts";
import { puedeVerCursoPublicado } from "./cursos.ts";
import { aImagen, borrarSinUso, imagenesDelCurso, seleccionImagen } from "./imagenes.ts";

// El editor de cursos (spec F05 + decisión 0020). Aquí no llega nada sin validar:
// el cuerpo lo revisan las rutas con validacion/editor.ts. Lo que depende de la
// base se comprueba aquí.

type Transaccion = Prisma.TransactionClient;

type DatosDeEstado = { publicado: boolean; revision: string | null };

function estadoDelCurso({ publicado, revision }: DatosDeEstado): EstadoCurso {
  if (publicado) return "publicado";
  return revision === "pendiente" ? "enRevision" : "borrador";
}

function generarClaveEnlace(): string {
  return randomBytes(6).toString("hex");
}

function recortarUnicode(texto: string, maximo: number): string {
  return Array.from(texto).slice(0, maximo).join("");
}

async function comprobarPermisoOrganizacion(
  cliente: Transaccion,
  idAutor: string,
  idOrganizacion: string,
) {
  const miembro = await cliente.miembroOrganizacion.findUnique({
    where: { idOrganizacion_idUsuario: { idOrganizacion, idUsuario: idAutor } },
    select: { rol: true, organizacion: { select: { requiereRevision: true } } },
  });
  if (!miembro || miembro.rol === "alumno") {
    throw new ErrorApi(403, MENSAJES_EDITOR.organizacionNoPermitida);
  }
  return { rol: miembro.rol, requiereRevision: miembro.organizacion.requiereRevision };
}

async function calcularPuedePublicarDirecto(
  cliente: Transaccion,
  idAutor: string,
  visibilidad: string,
  idOrganizacion: string | null,
): Promise<boolean> {
  if (visibilidad === "enlacePrivado") return true;
  if (visibilidad === "organizacion" && idOrganizacion) {
    const miembro = await cliente.miembroOrganizacion.findUnique({
      where: { idOrganizacion_idUsuario: { idOrganizacion, idUsuario: idAutor } },
      select: { rol: true, organizacion: { select: { requiereRevision: true } } },
    });
    if (!miembro || miembro.rol === "alumno") return false;
    return (
      !miembro.organizacion.requiereRevision || miembro.rol === "dueno" || miembro.rol === "admin"
    );
  }
  return false;
}

async function conCursoDelAutor<T>(
  idAutor: string,
  idCurso: string,
  mensajeNoExiste: string,
  accion: (tx: Transaccion, estado: EstadoCurso) => Promise<T>,
): Promise<T> {
  return bd.$transaction(async (tx) => {
    const [curso] = await tx.$queryRaw<(DatosDeEstado & { idAutor: string })[]>`
      SELECT id_autor AS "idAutor", publicado, revision FROM curso WHERE id = ${idCurso} FOR UPDATE
    `;
    if (curso?.idAutor !== idAutor) throw new ErrorApi(404, mensajeNoExiste);
    return accion(tx, estadoDelCurso(curso));
  });
}

export async function conCursoEditable<T>(
  idAutor: string,
  idCurso: string,
  accion: (tx: Transaccion) => Promise<T>,
): Promise<T> {
  return conCursoDelAutor(idAutor, idCurso, MENSAJES_EDITOR.cursoEliminado, (tx, estado) => {
    if (estado === "publicado") {
      throw new ErrorApi(403, MENSAJES_EDITOR.cursoPublicadoAlGuardar);
    }
    if (estado === "enRevision") {
      throw new ErrorApi(403, MENSAJES_EDITOR.cursoEnRevisionAlGuardar);
    }
    return accion(tx);
  });
}

async function comprobarCursoAbierto(idAutor: string, idCurso: string) {
  const curso = await bd.curso.findUnique({
    where: { id: idCurso },
    select: { idAutor: true, publicado: true, revision: true },
  });
  if (curso?.idAutor !== idAutor) throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  const estado = estadoDelCurso(curso);
  if (estado === "publicado") throw new ErrorApi(403, MENSAJES_EDITOR.cursoPublicado);
  if (estado === "enRevision") throw new ErrorApi(403, MENSAJES_EDITOR.cursoEnRevision);
}

async function renumerarLecciones(tx: Transaccion, idCurso: string, idsEnOrden: string[]) {
  await tx.leccion.updateMany({ where: { idCurso }, data: { posicion: { multiply: -1 } } });
  for (const [i, id] of idsEnOrden.entries()) {
    await tx.leccion.update({ where: { id }, data: { posicion: i + 1 } });
  }
}

async function tocarCurso(tx: Transaccion, idCurso: string) {
  await tx.curso.update({ where: { id: idCurso }, data: { actualizadoEn: new Date() } });
}

async function leerCursoEnEditor(cliente: Transaccion, idCurso: string): Promise<CursoEnEditor> {
  const curso = await cliente.curso.findUniqueOrThrow({
    where: { id: idCurso },
    select: {
      id: true,
      idAutor: true,
      titulo: true,
      descripcion: true,
      idioma: true,
      daInsignia: true,
      categoria: true,
      nivel: true,
      etiquetas: true,
      visibilidad: true,
      claveEnlace: true,
      idOrganizacion: true,
      organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
      tambienPublico: true,
      permiteFork: true,
      publicado: true,
      revision: true,
      motivoRechazo: true,
      portada: { select: seleccionImagen },
    },
  });
  const lecciones = await cliente.$queryRaw<LeccionEnMapa[]>`
    SELECT id, titulo, modulo, posicion, jsonb_array_length(actividades) AS "cantidadActividades"
    FROM leccion
    WHERE id_curso = ${idCurso}
    ORDER BY posicion
  `;
  const puedePublicarDirecto = await calcularPuedePublicarDirecto(
    cliente,
    curso.idAutor,
    curso.visibilidad,
    curso.idOrganizacion,
  );
  return {
    id: curso.id,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    idioma: curso.idioma as IdiomaCurso,
    daInsignia: curso.daInsignia,
    categoria: curso.categoria as CategoriaCurso,
    nivel: curso.nivel as NivelCurso,
    etiquetas: curso.etiquetas,
    visibilidad: curso.visibilidad as VisibilidadCurso,
    claveEnlace: curso.claveEnlace,
    idOrganizacion: curso.idOrganizacion,
    organizacion: curso.organizacion,
    tambienPublico: curso.tambienPublico,
    permiteFork: curso.permiteFork,
    puedePublicarDirecto,
    estado: estadoDelCurso({ publicado: curso.publicado, revision: curso.revision }),
    revisionRechazada: curso.revision === "rechazada",
    motivoRechazo: curso.motivoRechazo,
    portada: curso.portada ? aImagen(curso.portada) : null,
    pesoArchivos: await pesoArchivosCurso(cliente, idCurso),
    lecciones,
  };
}

export async function traerCursosDelAutor(idAutor: string): Promise<CursoDelAutor[]> {
  const cursos = await bd.curso.findMany({
    where: { idAutor },
    orderBy: [{ actualizadoEn: "desc" }, { id: "asc" }],
    select: {
      id: true,
      titulo: true,
      publicado: true,
      revision: true,
      idPortada: true,
      categoria: true,
      nivel: true,
      visibilidad: true,
      claveEnlace: true,
      permiteFork: true,
      organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
      _count: { select: { lecciones: true } },
    },
  });
  return cursos.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    estado: estadoDelCurso({ publicado: c.publicado, revision: c.revision }),
    revisionRechazada: c.revision === "rechazada",
    cantidadLecciones: c._count.lecciones,
    idPortada: c.idPortada,
    categoria: c.categoria as CategoriaCurso,
    nivel: c.nivel as NivelCurso,
    visibilidad: c.visibilidad as VisibilidadCurso,
    claveEnlace: c.claveEnlace,
    permiteFork: c.permiteFork,
    organizacion: c.organizacion,
  }));
}

export async function crearCurso(idAutor: string, datos: CuerpoDatosCurso): Promise<CursoEnEditor> {
  const idOrganizacion = datos.idOrganizacion ?? null;
  const visibilidad: VisibilidadCurso =
    datos.visibilidad ?? (idOrganizacion ? "organizacion" : "publico");

  if (idOrganizacion) {
    await comprobarPermisoOrganizacion(bd, idAutor, idOrganizacion);
  }
  if (visibilidad === "organizacion" && !idOrganizacion) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      idOrganizacion: MENSAJES_EDITOR.campoObligatorio,
    });
  }

  const curso = await bd.curso.create({
    data: {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      idAutor,
      ...(datos.idioma && { idioma: datos.idioma }),
      ...(datos.daInsignia !== undefined && { daInsignia: datos.daInsignia }),
      ...(datos.categoria && { categoria: datos.categoria }),
      ...(datos.nivel && { nivel: datos.nivel }),
      ...(datos.etiquetas && { etiquetas: datos.etiquetas }),
      visibilidad,
      claveEnlace: visibilidad === "enlacePrivado" ? generarClaveEnlace() : null,
      idOrganizacion,
      tambienPublico: visibilidad === "organizacion" ? Boolean(datos.tambienPublico) : false,
      ...(datos.permiteFork !== undefined && { permiteFork: datos.permiteFork }),
    },
    select: { id: true },
  });
  return leerCursoEnEditor(bd, curso.id);
}

export async function traerCursoEnEditor(idAutor: string, idCurso: string): Promise<CursoEnEditor> {
  const curso = await bd.curso.findUnique({ where: { id: idCurso }, select: { idAutor: true } });
  if (curso?.idAutor !== idAutor) throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  return leerCursoEnEditor(bd, idCurso);
}

async function comprobarPortada(tx: Transaccion, idCurso: string, idPortada: string) {
  const [imagen] = await imagenesDelCurso(tx, idCurso, [idPortada]);
  if (!imagen) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      portada: MENSAJES_IMAGENES.imagenNoEsta,
    });
  }
  if (imagen.formato === "gif") {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      portada: MENSAJES_IMAGENES.portadaGif,
    });
  }
}

export async function actualizarCurso(
  idAutor: string,
  idCurso: string,
  datos: CuerpoDatosCurso,
): Promise<CursoEnEditor> {
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    const antes = await tx.curso.findUniqueOrThrow({
      where: { id: idCurso },
      select: {
        idPortada: true,
        visibilidad: true,
        claveEnlace: true,
        idOrganizacion: true,
        tambienPublico: true,
      },
    });
    if (datos.idPortada) await comprobarPortada(tx, idCurso, datos.idPortada);

    const idOrganizacionFinal =
      datos.idOrganizacion !== undefined ? datos.idOrganizacion : antes.idOrganizacion;
    if (idOrganizacionFinal && idOrganizacionFinal !== antes.idOrganizacion) {
      await comprobarPermisoOrganizacion(tx, idAutor, idOrganizacionFinal);
    }

    const visibilidadFinal = (datos.visibilidad ?? antes.visibilidad) as VisibilidadCurso;
    if (visibilidadFinal === "organizacion" && !idOrganizacionFinal) {
      throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
        idOrganizacion: MENSAJES_EDITOR.campoObligatorio,
      });
    }

    const claveEnlaceFinal =
      visibilidadFinal === "enlacePrivado"
        ? (antes.claveEnlace ?? generarClaveEnlace())
        : antes.claveEnlace;
    const tambienPublicoFinal =
      visibilidadFinal === "organizacion" ? (datos.tambienPublico ?? antes.tambienPublico) : false;

    await tx.curso.update({
      where: { id: idCurso },
      data: {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        ...(datos.idPortada !== undefined && { idPortada: datos.idPortada }),
        ...(datos.idioma && { idioma: datos.idioma }),
        ...(datos.daInsignia !== undefined && { daInsignia: datos.daInsignia }),
        ...(datos.categoria && { categoria: datos.categoria }),
        ...(datos.nivel && { nivel: datos.nivel }),
        ...(datos.etiquetas !== undefined && { etiquetas: datos.etiquetas }),
        visibilidad: visibilidadFinal,
        claveEnlace: claveEnlaceFinal,
        idOrganizacion: idOrganizacionFinal,
        tambienPublico: tambienPublicoFinal,
        ...(datos.permiteFork !== undefined && { permiteFork: datos.permiteFork }),
      },
    });
    if (datos.idPortada !== undefined && antes.idPortada && antes.idPortada !== datos.idPortada) {
      await borrarSinUso(tx, idCurso, [antes.idPortada]);
    }
    return leerCursoEnEditor(tx, idCurso);
  });
}

export async function borrarCurso(idAutor: string, idCurso: string): Promise<void> {
  await conCursoEditable(idAutor, idCurso, (tx) => tx.curso.delete({ where: { id: idCurso } }));
}

async function comprobarContenido(tx: Transaccion, idCurso: string) {
  const lecciones = await tx.$queryRaw<{ vacia: boolean }[]>`
    SELECT jsonb_array_length(actividades) = 0 AS vacia FROM leccion WHERE id_curso = ${idCurso}
  `;
  if (lecciones.length === 0) throw new ErrorApi(400, MENSAJES_EDITOR.sinLecciones);
  const vacias = lecciones.filter(({ vacia }) => vacia).length;
  if (vacias === 1) throw new ErrorApi(400, MENSAJES_EDITOR.unaLeccionVacia);
  if (vacias > 1) {
    throw new ErrorApi(400, MENSAJES_EDITOR.leccionesVacias.replace("{n}", String(vacias)));
  }
}

export async function enviarARevision(idAutor: string, idCurso: string): Promise<CursoEnEditor> {
  return conCursoDelAutor(idAutor, idCurso, MENSAJES_EDITOR.cursoNoExiste, async (tx, estado) => {
    if (estado !== "borrador") throw new ErrorApi(409, MENSAJES_EDITOR.estadoCambiado);
    await comprobarContenido(tx, idCurso);
    await tx.curso.update({
      where: { id: idCurso },
      data: { revision: "pendiente", motivoRechazo: null },
    });
    return leerCursoEnEditor(tx, idCurso);
  });
}

// F16: publicación directa sin cola global para enlace privado u organizaciones que la permiten.
export async function publicarDirecto(idAutor: string, idCurso: string): Promise<CursoEnEditor> {
  return conCursoDelAutor(idAutor, idCurso, MENSAJES_EDITOR.cursoNoExiste, async (tx, estado) => {
    if (estado !== "borrador") throw new ErrorApi(409, MENSAJES_EDITOR.estadoCambiado);
    const curso = await tx.curso.findUniqueOrThrow({
      where: { id: idCurso },
      select: { visibilidad: true, idOrganizacion: true, claveEnlace: true },
    });
    const permitido = await calcularPuedePublicarDirecto(
      tx,
      idAutor,
      curso.visibilidad,
      curso.idOrganizacion,
    );
    if (!permitido) {
      throw new ErrorApi(403, MENSAJES_EDITOR.noPuedePublicarDirecto);
    }
    await comprobarContenido(tx, idCurso);
    await tx.curso.update({
      where: { id: idCurso },
      data: {
        publicado: true,
        revision: null,
        motivoRechazo: null,
        ...(curso.visibilidad === "enlacePrivado" && !curso.claveEnlace
          ? { claveEnlace: generarClaveEnlace() }
          : {}),
      },
    });
    return leerCursoEnEditor(tx, idCurso);
  });
}

export async function retirarDeRevision(idAutor: string, idCurso: string): Promise<CursoEnEditor> {
  return conCursoDelAutor(idAutor, idCurso, MENSAJES_EDITOR.cursoNoExiste, async (tx, estado) => {
    if (estado !== "enRevision") throw new ErrorApi(409, MENSAJES_EDITOR.estadoCambiado);
    await tx.curso.update({ where: { id: idCurso }, data: { revision: null } });
    return leerCursoEnEditor(tx, idCurso);
  });
}

export async function retirarDelCatalogo(idAutor: string, idCurso: string): Promise<CursoEnEditor> {
  return conCursoDelAutor(idAutor, idCurso, MENSAJES_EDITOR.cursoNoExiste, async (tx, estado) => {
    if (estado !== "publicado") throw new ErrorApi(409, MENSAJES_EDITOR.estadoCambiado);
    await tx.curso.update({ where: { id: idCurso }, data: { publicado: false } });
    return leerCursoEnEditor(tx, idCurso);
  });
}

export async function crearLeccion(
  idAutor: string,
  idCurso: string,
  { titulo, modulo }: CuerpoNuevaLeccion,
): Promise<LeccionEnMapa> {
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    const cantidad = await tx.leccion.count({ where: { idCurso } });
    if (cantidad >= LIMITES_CURSO.leccionesMax) {
      throw new ErrorApi(400, MENSAJES_EDITOR.maxLecciones);
    }
    const leccion = await tx.leccion.create({
      data: { idCurso, titulo, modulo: modulo ?? null, posicion: cantidad + 1 },
      select: { id: true, titulo: true, modulo: true, posicion: true },
    });
    await tocarCurso(tx, idCurso);
    return { ...leccion, cantidadActividades: 0 };
  });
}

function coincideConLasLecciones(ids: string[], actuales: { id: string }[]): boolean {
  const pedidos = new Set(ids);
  return (
    ids.length === actuales.length &&
    pedidos.size === ids.length &&
    actuales.every(({ id }) => pedidos.has(id))
  );
}

export async function ordenarLecciones(
  idAutor: string,
  idCurso: string,
  idsLecciones: string[],
): Promise<CursoEnEditor> {
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    const actuales = await tx.leccion.findMany({ where: { idCurso }, select: { id: true } });
    if (!coincideConLasLecciones(idsLecciones, actuales)) {
      throw new ErrorApi(409, MENSAJES_EDITOR.ordenDesactualizado);
    }
    await renumerarLecciones(tx, idCurso, idsLecciones);
    await tocarCurso(tx, idCurso);
    return leerCursoEnEditor(tx, idCurso);
  });
}

export async function borrarLeccion(
  idAutor: string,
  idCurso: string,
  idLeccion: string,
): Promise<void> {
  await conCursoEditable(idAutor, idCurso, async (tx) => {
    const leccion = await tx.leccion.findFirst({
      where: { id: idLeccion, idCurso },
      select: { imagenes: true, audios: true },
    });
    if (!leccion) throw new ErrorApi(404, MENSAJES_EDITOR.leccionEliminada);
    await tx.leccion.delete({ where: { id: idLeccion } });
    const quedan = await tx.leccion.findMany({
      where: { idCurso },
      orderBy: { posicion: "asc" },
      select: { id: true },
    });
    await renumerarLecciones(
      tx,
      idCurso,
      quedan.map(({ id }) => id),
    );
    await borrarSinUso(tx, idCurso, leccion.imagenes);
    await borrarAudiosSinUso(tx, idCurso, leccion.audios);
    await tocarCurso(tx, idCurso);
  });
}

const seleccionLeccion = {
  id: true,
  titulo: true,
  modulo: true,
  posicion: true,
  actividades: true,
  version: true,
  curso: { select: { idioma: true } },
} satisfies Prisma.LeccionSelect;

type FilaLeccion = Prisma.LeccionGetPayload<{ select: typeof seleccionLeccion }>;

function aLeccionEnEditor({ curso, ...leccion }: FilaLeccion): LeccionEnEditor {
  return {
    ...leccion,
    actividades: leccion.actividades as unknown as Actividad[],
    idioma: curso.idioma as IdiomaCurso,
  };
}

export async function traerLeccionEnEditor(
  idAutor: string,
  idCurso: string,
  idLeccion: string,
): Promise<LeccionEnEditor> {
  await comprobarCursoAbierto(idAutor, idCurso);
  const leccion = await bd.leccion.findFirst({
    where: { id: idLeccion, idCurso },
    select: seleccionLeccion,
  });
  if (!leccion) throw new ErrorApi(404, MENSAJES_LECCION.leccionNoDisponible);
  return aLeccionEnEditor(leccion);
}

async function conImagenesDelCurso(
  tx: Transaccion,
  idCurso: string,
  actividades: Actividad[],
): Promise<{ actividades: Actividad[]; peso: number }> {
  const ids = idsDeImagenes(actividades);
  const delCurso = new Map(
    (await imagenesDelCurso(tx, idCurso, ids)).map((imagen) => [imagen.id, imagen]),
  );
  const faltan = ids.filter((id) => !delCurso.has(id));
  if (faltan.length > 0) {
    const indice = actividades.findIndex((actividad) =>
      imagenesDeActividad(actividad).some(({ id }) => faltan.includes(id)),
    );
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      [`actividades.${indice}`]: `actividad ${indice + 1} (${actividades[indice]?.tipo}): una imagen ya no está`,
      ...Object.fromEntries(faltan.map((id) => [`imagenes.${id}`, MENSAJES_IMAGENES.imagenNoEsta])),
    });
  }
  return {
    actividades: actividades.map((actividad) =>
      mapearImagenes(actividad, ({ id, textoAlternativo }) => ({
        ...delCurso.get(id)!,
        ...(textoAlternativo !== undefined && { textoAlternativo }),
      })),
    ),
    peso: [...delCurso.values()].reduce((total, imagen) => total + imagen.peso, 0),
  };
}

async function conAudiosDelCurso(
  tx: Transaccion,
  idCurso: string,
  actividades: Actividad[],
): Promise<{ actividades: Actividad[]; peso: number }> {
  const ids = idsDeAudios(actividades);
  const delCurso = new Map(
    (await audiosDelCurso(tx, idCurso, ids)).map((audio) => [audio.id, audio]),
  );
  const faltan = ids.filter((id) => !delCurso.has(id));
  if (faltan.length > 0) {
    const indice = actividades.findIndex((actividad) =>
      audiosDeActividad(actividad).some(({ id }) => faltan.includes(id)),
    );
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      [`actividades.${indice}`]: `actividad ${indice + 1} (${actividades[indice]?.tipo}): un audio ya no está`,
      ...Object.fromEntries(faltan.map((id) => [`audios.${id}`, MENSAJES_AUDIOS.audioNoEsta])),
    });
  }
  return {
    actividades: actividades.map((actividad) =>
      mapearAudios(actividad, ({ id }) => delCurso.get(id)!),
    ),
    peso: [...delCurso.values()].reduce((total, audio) => total + audio.peso, 0),
  };
}

export async function guardarLeccion(
  idAutor: string,
  idCurso: string,
  idLeccion: string,
  { titulo, modulo, actividades, version, reemplazar }: CuerpoGuardarLeccion,
): Promise<LeccionEnEditor> {
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    const actual = await tx.leccion.findFirst({
      where: { id: idLeccion, idCurso },
      select: { version: true, imagenes: true, audios: true },
    });
    if (!actual) throw new ErrorApi(404, MENSAJES_EDITOR.leccionEliminada);
    if (!reemplazar && actual.version !== version) {
      throw new ErrorApi(409, MENSAJES_EDITOR.versionMasNueva);
    }
    const conImagenes = await conImagenesDelCurso(tx, idCurso, actividades);
    const conAudios = await conAudiosDelCurso(tx, idCurso, conImagenes.actividades);
    if (conImagenes.peso + conAudios.peso > LIMITES_ARCHIVOS.pesoLeccionMax) {
      throw new ErrorApi(400, MENSAJES_ARCHIVOS.leccionPesada);
    }
    const idsImagenes = idsDeImagenes(conAudios.actividades);
    const idsAudios = idsDeAudios(conAudios.actividades);
    const leccion = await tx.leccion.update({
      where: { id: idLeccion },
      data: {
        titulo,
        ...(modulo !== undefined && { modulo }),
        actividades: conAudios.actividades as unknown as Prisma.InputJsonValue,
        imagenes: idsImagenes,
        audios: idsAudios,
        version: { increment: 1 },
      },
      select: seleccionLeccion,
    });
    await borrarSinUso(
      tx,
      idCurso,
      actual.imagenes.filter((id) => !idsImagenes.includes(id)),
    );
    await borrarAudiosSinUso(
      tx,
      idCurso,
      actual.audios.filter((id) => !idsAudios.includes(id)),
    );
    await tocarCurso(tx, idCurso);
    return aLeccionEnEditor(leccion);
  });
}

// F16: bifurcar (fork) un curso publicado en un borrador nuevo con atribución y copia
// independiente de lecciones, imágenes y audios.
export async function bifurcarCurso(
  idUsuario: string,
  idCursoOrigen: string,
  cuerpo: CuerpoForkCurso,
): Promise<CursoEnEditor> {
  const origen = await bd.curso.findUnique({
    where: { id: idCursoOrigen },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      publicado: true,
      visibilidad: true,
      claveEnlace: true,
      idAutor: true,
      idOrganizacion: true,
      tambienPublico: true,
      permiteFork: true,
      idioma: true,
      categoria: true,
      nivel: true,
      etiquetas: true,
      daInsignia: true,
      idPortada: true,
      organizacion: { select: { modoAcceso: true } },
      imagenes: {
        select: {
          id: true,
          huella: true,
          formato: true,
          ancho: true,
          alto: true,
          peso: true,
          datos: true,
        },
      },
      audios: {
        select: { id: true, huella: true, formato: true, duracion: true, peso: true, datos: true },
      },
      lecciones: {
        orderBy: { posicion: "asc" },
        select: { titulo: true, modulo: true, posicion: true, actividades: true },
      },
    },
  });

  if (!origen || !(await puedeVerCursoPublicado(origen, idUsuario))) {
    throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  }
  if (!origen.permiteFork) {
    throw new ErrorApi(403, MENSAJES_EDITOR.noPermiteFork);
  }

  const idOrganizacionDestino = cuerpo.idOrganizacion ?? null;
  if (idOrganizacionDestino) {
    await comprobarPermisoOrganizacion(bd, idUsuario, idOrganizacionDestino);
  }

  const tituloNuevo = recortarUnicode(
    cuerpo.titulo ?? `${origen.titulo} (adaptación)`,
    LIMITES_CURSO.tituloMax,
  );

  return bd.$transaction(async (tx) => {
    const nuevo = await tx.curso.create({
      data: {
        titulo: tituloNuevo,
        descripcion: origen.descripcion,
        idAutor: idUsuario,
        idioma: origen.idioma,
        categoria: origen.categoria,
        nivel: origen.nivel,
        etiquetas: origen.etiquetas,
        daInsignia: origen.daInsignia,
        visibilidad: idOrganizacionDestino ? "organizacion" : "publico",
        idOrganizacion: idOrganizacionDestino,
        tambienPublico: false,
        permiteFork: true,
        idCursoOrigen: origen.id,
      },
      select: { id: true },
    });

    const mapaImagenes = new Map<string, string>();
    for (const img of origen.imagenes) {
      const copia = await tx.imagen.create({
        data: {
          idCurso: nuevo.id,
          huella: img.huella,
          formato: img.formato,
          ancho: img.ancho,
          alto: img.alto,
          peso: img.peso,
          datos: new Uint8Array(img.datos),
        },
        select: { id: true },
      });
      mapaImagenes.set(img.id, copia.id);
    }

    const mapaAudios = new Map<string, string>();
    for (const aud of origen.audios) {
      const copia = await tx.audio.create({
        data: {
          idCurso: nuevo.id,
          huella: aud.huella,
          formato: aud.formato,
          duracion: aud.duracion,
          peso: aud.peso,
          datos: new Uint8Array(aud.datos),
        },
        select: { id: true },
      });
      mapaAudios.set(aud.id, copia.id);
    }

    if (origen.idPortada && mapaImagenes.has(origen.idPortada)) {
      await tx.curso.update({
        where: { id: nuevo.id },
        data: { idPortada: mapaImagenes.get(origen.idPortada)! },
      });
    }

    for (const lec of origen.lecciones) {
      const actividadesOriginales = lec.actividades as unknown as Actividad[];
      const actividadesRemapeadas = actividadesOriginales.map((act) => {
        const conImg = mapearImagenes(act, (img) => ({
          ...img,
          id: mapaImagenes.get(img.id) ?? img.id,
        }));
        return mapearAudios(conImg, (aud) => ({
          ...aud,
          id: mapaAudios.get(aud.id) ?? aud.id,
        }));
      });
      await tx.leccion.create({
        data: {
          idCurso: nuevo.id,
          titulo: lec.titulo,
          modulo: lec.modulo,
          posicion: lec.posicion,
          actividades: actividadesRemapeadas as unknown as Prisma.InputJsonValue,
          imagenes: idsDeImagenes(actividadesRemapeadas),
          audios: idsDeAudios(actividadesRemapeadas),
        },
      });
    }

    return leerCursoEnEditor(tx, nuevo.id);
  });
}

function limpiarMediosParaExportar(actividad: Actividad): Actividad {
  if (actividad.tipo === "teoria" && actividad.imagenes) {
    const copia = { ...actividad };
    delete copia.imagenes;
    return {
      ...copia,
      texto:
        copia.texto
          .split(MARCA_IMAGEN)
          .join("")
          .replace(/\n{3,}/g, "\n\n")
          .trim() || copia.texto,
    };
  }
  if (actividad.tipo === "opcionMultiple" && actividad.imagen) {
    const copia = { ...actividad };
    delete copia.imagen;
    return copia;
  }
  if (actividad.tipo === "escucharRepetir" && actividad.audio) {
    const copia = { ...actividad };
    delete copia.audio;
    return copia;
  }
  return actividad;
}

// F07 / F16: exportar un curso del autor como JSON portable.
export async function exportarCurso(idAutor: string, idCurso: string): Promise<CursoExportado> {
  const curso = await bd.curso.findUnique({
    where: { id: idCurso },
    select: {
      idAutor: true,
      titulo: true,
      descripcion: true,
      idioma: true,
      categoria: true,
      nivel: true,
      etiquetas: true,
      daInsignia: true,
      permiteFork: true,
      lecciones: {
        orderBy: { posicion: "asc" },
        select: { titulo: true, modulo: true, actividades: true },
      },
    },
  });
  if (curso?.idAutor !== idAutor) throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  return {
    formato: "brote-curso-v1",
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    idioma: curso.idioma as IdiomaCurso,
    categoria: curso.categoria as CategoriaCurso,
    nivel: curso.nivel as NivelCurso,
    etiquetas: curso.etiquetas,
    daInsignia: curso.daInsignia,
    permiteFork: curso.permiteFork,
    lecciones: curso.lecciones.map((l) => ({
      titulo: l.titulo,
      modulo: l.modulo,
      actividades: (l.actividades as unknown as Actividad[]).map(limpiarMediosParaExportar),
    })),
  };
}

// F07 / F16: importar un JSON portable como borrador nuevo del autor.
export async function importarCurso(
  idAutor: string,
  datos: CursoExportado,
): Promise<CursoEnEditor> {
  return bd.$transaction(async (tx) => {
    const curso = await tx.curso.create({
      data: {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        idAutor,
        idioma: datos.idioma,
        categoria: datos.categoria,
        nivel: datos.nivel,
        etiquetas: datos.etiquetas,
        daInsignia: datos.daInsignia,
        permiteFork: datos.permiteFork,
      },
      select: { id: true },
    });
    for (const [i, lec] of datos.lecciones.entries()) {
      await tx.leccion.create({
        data: {
          idCurso: curso.id,
          titulo: lec.titulo,
          modulo: lec.modulo,
          posicion: i + 1,
          actividades: lec.actividades as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return leerCursoEnEditor(tx, curso.id);
  });
}
