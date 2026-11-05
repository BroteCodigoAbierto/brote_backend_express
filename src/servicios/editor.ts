import { bd } from "../config/bd.ts";
import type { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_CURSO,
  MENSAJES_CATALOGO,
  MENSAJES_EDITOR,
  MENSAJES_LECCION,
  type Actividad,
  type CuerpoDatosCurso,
  type CuerpoGuardarLeccion,
  type CuerpoNuevaLeccion,
  type CursoDelAutor,
  type CursoEnEditor,
  type EstadoCurso,
  type LeccionEnEditor,
  type LeccionEnMapa,
} from "../tipos/contrato.ts";

// El editor de cursos (spec F05). Aquí no llega nada sin validar: el cuerpo lo
// revisan las rutas con validacion/editor.ts. Lo que depende de la base se
// comprueba aquí (brote_specs, research de F05, puntos 2 a 6).

type Transaccion = Prisma.TransactionClient;

type DatosDeEstado = { publicado: boolean; revision: string | null };

// `estado` no se guarda: sale de aquí, y `publicado` manda (brote_specs, research de
// F06, punto 1).
function estadoDelCurso({ publicado, revision }: DatosDeEstado): EstadoCurso {
  if (publicado) return "publicado";
  return revision === "pendiente" ? "enRevision" : "borrador";
}

// Toda escritura pasa por aquí: bloquea el curso y comprueba, ya bloqueado, que
// es de quien llama y que no está publicado. Sin el bloqueo, dos altas a la vez
// calcularían la misma posición, y un curso publicado a media escritura quedaría
// cambiado sin revisión.
async function conCursoEditable<T>(
  idAutor: string,
  idCurso: string,
  accion: (tx: Transaccion) => Promise<T>,
): Promise<T> {
  return bd.$transaction(async (tx) => {
    const [curso] = await tx.$queryRaw<{ idAutor: string; publicado: boolean }[]>`
      SELECT id_autor AS "idAutor", publicado FROM curso WHERE id = ${idCurso} FOR UPDATE
    `;
    // un curso ajeno responde igual que uno que no existe
    if (curso?.idAutor !== idAutor) throw new ErrorApi(404, MENSAJES_EDITOR.cursoEliminado);
    if (curso.publicado) throw new ErrorApi(403, MENSAJES_EDITOR.cursoPublicadoAlGuardar);
    return accion(tx);
  });
}

// Lo mismo para abrir: sin bloqueo y con los mensajes de abrir.
async function comprobarCursoAbierto(idAutor: string, idCurso: string) {
  const curso = await bd.curso.findUnique({
    where: { id: idCurso },
    select: { idAutor: true, publicado: true },
  });
  if (curso?.idAutor !== idAutor) throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  if (curso.publicado) throw new ErrorApi(403, MENSAJES_EDITOR.cursoPublicado);
}

// PostgreSQL comprueba el índice único de (id_curso, posicion) fila por fila:
// bajar posiciones con un solo UPDATE funciona o falla según cómo recorra la
// tabla, así que nunca se hace con `decrement`. Primero se niegan y luego se
// fijan (brote_specs, research de F05, punto 3). No toca `version`.
async function renumerarLecciones(tx: Transaccion, idCurso: string, idsEnOrden: string[]) {
  await tx.leccion.updateMany({ where: { idCurso }, data: { posicion: { multiply: -1 } } });
  for (const [i, id] of idsEnOrden.entries()) {
    await tx.leccion.update({ where: { id }, data: { posicion: i + 1 } });
  }
}

// Guardar una lección no escribe la fila del curso: sin esto, "Cursos que creé"
// no lo subiría al primer lugar (research de F05, punto 5).
async function tocarCurso(tx: Transaccion, idCurso: string) {
  await tx.curso.update({ where: { id: idCurso }, data: { actualizadoEn: new Date() } });
}

// Las actividades se cuentan en la base, para no traerlas todas al mapa.
async function leerCursoEnEditor(cliente: Transaccion, idCurso: string): Promise<CursoEnEditor> {
  const { id, titulo, descripcion, publicado, revision, motivoRechazo } =
    await cliente.curso.findUniqueOrThrow({
      where: { id: idCurso },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        publicado: true,
        revision: true,
        motivoRechazo: true,
      },
    });
  const lecciones = await cliente.$queryRaw<LeccionEnMapa[]>`
    SELECT id, titulo, posicion, jsonb_array_length(actividades) AS "cantidadActividades"
    FROM leccion
    WHERE id_curso = ${idCurso}
    ORDER BY posicion
  `;
  return {
    id,
    titulo,
    descripcion,
    estado: estadoDelCurso({ publicado, revision }),
    revisionRechazada: revision === "rechazada",
    motivoRechazo,
    lecciones,
  };
}

// Los cursos de quien llama, publicados o no, del que cambió más recientemente
// al más antiguo.
export async function traerCursosDelAutor(idAutor: string): Promise<CursoDelAutor[]> {
  const cursos = await bd.curso.findMany({
    where: { idAutor },
    orderBy: [{ actualizadoEn: "desc" }, { id: "asc" }],
    select: {
      id: true,
      titulo: true,
      publicado: true,
      revision: true,
      _count: { select: { lecciones: true } },
    },
  });
  return cursos.map(({ id, titulo, publicado, revision, _count }) => ({
    id,
    titulo,
    estado: estadoDelCurso({ publicado, revision }),
    revisionRechazada: revision === "rechazada",
    cantidadLecciones: _count.lecciones,
  }));
}

export async function crearCurso(
  idAutor: string,
  { titulo, descripcion }: CuerpoDatosCurso,
): Promise<CursoEnEditor> {
  const curso = await bd.curso.create({
    data: { titulo, descripcion, idAutor },
    select: { id: true, titulo: true, descripcion: true },
  });
  return {
    ...curso,
    estado: "borrador",
    revisionRechazada: false,
    motivoRechazo: null,
    lecciones: [],
  };
}

export async function traerCursoEnEditor(idAutor: string, idCurso: string): Promise<CursoEnEditor> {
  await comprobarCursoAbierto(idAutor, idCurso);
  return leerCursoEnEditor(bd, idCurso);
}

export async function actualizarCurso(
  idAutor: string,
  idCurso: string,
  { titulo, descripcion }: CuerpoDatosCurso,
): Promise<CursoEnEditor> {
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    await tx.curso.update({ where: { id: idCurso }, data: { titulo, descripcion } });
    return leerCursoEnEditor(tx, idCurso);
  });
}

// Las lecciones y su progreso se borran en cascada. Si el curso estuvo publicado
// y se retiró, el progreso de sus alumnos se va con él (spec F05, "Supuestos").
export async function borrarCurso(idAutor: string, idCurso: string): Promise<void> {
  await conCursoEditable(idAutor, idCurso, (tx) => tx.curso.delete({ where: { id: idCurso } }));
}

export async function crearLeccion(
  idAutor: string,
  idCurso: string,
  { titulo }: CuerpoNuevaLeccion,
): Promise<LeccionEnMapa> {
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    const cantidad = await tx.leccion.count({ where: { idCurso } });
    if (cantidad >= LIMITES_CURSO.leccionesMax) {
      throw new ErrorApi(400, MENSAJES_EDITOR.maxLecciones);
    }
    // las posiciones no tienen huecos: la siguiente es la cantidad más uno
    const leccion = await tx.leccion.create({
      data: { idCurso, titulo, posicion: cantidad + 1 },
      select: { id: true, titulo: true, posicion: true },
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
    const { count } = await tx.leccion.deleteMany({ where: { id: idLeccion, idCurso } });
    if (count === 0) throw new ErrorApi(404, MENSAJES_EDITOR.leccionEliminada);
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
    await tocarCurso(tx, idCurso);
  });
}

const seleccionLeccion = {
  id: true,
  titulo: true,
  posicion: true,
  actividades: true,
  version: true,
} satisfies Prisma.LeccionSelect;

type FilaLeccion = Prisma.LeccionGetPayload<{ select: typeof seleccionLeccion }>;

function aLeccionEnEditor(leccion: FilaLeccion): LeccionEnEditor {
  return {
    ...leccion,
    // la columna solo se escribe después de validarActividades
    actividades: leccion.actividades as unknown as Actividad[],
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

// Reemplaza el título y todas las actividades. Con otra `version`, otra pestaña
// guardó antes: no se pisa nada salvo que el autor lo pida con `reemplazar`.
export async function guardarLeccion(
  idAutor: string,
  idCurso: string,
  idLeccion: string,
  { titulo, actividades, version, reemplazar }: CuerpoGuardarLeccion,
): Promise<LeccionEnEditor> {
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    const actual = await tx.leccion.findFirst({
      where: { id: idLeccion, idCurso },
      select: { version: true },
    });
    if (!actual) throw new ErrorApi(404, MENSAJES_EDITOR.leccionEliminada);
    if (!reemplazar && actual.version !== version) {
      throw new ErrorApi(409, MENSAJES_EDITOR.versionMasNueva);
    }
    const leccion = await tx.leccion.update({
      where: { id: idLeccion },
      data: {
        titulo,
        actividades: actividades as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
      select: seleccionLeccion,
    });
    await tocarCurso(tx, idCurso);
    return aLeccionEnEditor(leccion);
  });
}
