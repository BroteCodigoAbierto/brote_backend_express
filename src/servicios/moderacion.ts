import { bd } from "../config/bd.ts";
import type { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  MENSAJES_MODERACION,
  type Actividad,
  type CursoEnModeracion,
  type CursoEnRevision,
  type IdiomaCurso,
} from "../tipos/contrato.ts";

// Moderación (decisiones 0018 y 0020): soporta moderación global (administradores
// de la instancia) y moderación delegada por organización (dueno/admin de un silo).

const EN_REVISION = { publicado: false, revision: "pendiente" } satisfies Prisma.CursoWhereInput;

const seleccionCurso = {
  id: true,
  titulo: true,
  descripcion: true,
  idPortada: true,
  actualizadoEn: true,
  autor: { select: { name: true } },
  organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
  _count: { select: { lecciones: true } },
} satisfies Prisma.CursoSelect;

type CursoSeleccionado = Prisma.CursoGetPayload<{ select: typeof seleccionCurso }>;

function aCursoEnRevision(curso: CursoSeleccionado): CursoEnRevision {
  return {
    id: curso.id,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    nombreAutor: curso.autor.name,
    cantidadLecciones: curso._count.lecciones,
    idPortada: curso.idPortada,
    enviadoEn: curso.actualizadoEn.toISOString(),
    organizacion: curso.organizacion,
  };
}

async function errorCursoNoEnRevision(idCurso: string): Promise<ErrorApi> {
  const existe = await bd.curso.count({ where: { id: idCurso } });
  return existe
    ? new ErrorApi(409, MENSAJES_MODERACION.yaNoEnRevision)
    : new ErrorApi(404, MENSAJES_MODERACION.cursoNoExiste);
}

// Organizaciones donde el usuario tiene rol de administración ("dueno" o "admin").
export async function idsOrganizacionesAdministradas(idUsuario: string): Promise<string[]> {
  const filas = await bd.miembroOrganizacion.findMany({
    where: { idUsuario, rol: { in: ["dueno", "admin"] } },
    select: { idOrganizacion: true },
  });
  return filas.map((f) => f.idOrganizacion);
}

// Los cursos que esperan decisión: globales si es admin de instancia, más los de
// organizaciones que el usuario administra.
export async function traerCursosEnRevision(
  esAdminGlobal: boolean,
  idUsuario: string,
): Promise<CursoEnRevision[]> {
  const idsOrg = await idsOrganizacionesAdministradas(idUsuario);
  if (!esAdminGlobal && idsOrg.length === 0) return [];
  const filtroAlcance: Prisma.CursoWhereInput = esAdminGlobal
    ? EN_REVISION
    : { ...EN_REVISION, idOrganizacion: { in: idsOrg } };
  const cursos = await bd.curso.findMany({
    where: filtroAlcance,
    orderBy: [{ actualizadoEn: "asc" }, { id: "asc" }],
    select: seleccionCurso,
  });
  return cursos.map(aCursoEnRevision);
}

async function comprobarPermisoSobreCurso(
  idCurso: string,
  esAdminGlobal: boolean,
  idUsuario: string,
) {
  if (esAdminGlobal) return;
  const curso = await bd.curso.findUnique({
    where: { id: idCurso },
    select: { idOrganizacion: true },
  });
  if (!curso) throw new ErrorApi(404, MENSAJES_MODERACION.cursoNoExiste);
  if (!curso.idOrganizacion) throw new ErrorApi(403, MENSAJES_MODERACION.soloAdministradores);
  const miembro = await bd.miembroOrganizacion.findUnique({
    where: {
      idOrganizacion_idUsuario: { idOrganizacion: curso.idOrganizacion, idUsuario },
    },
    select: { rol: true },
  });
  if (!miembro || (miembro.rol !== "dueno" && miembro.rol !== "admin")) {
    throw new ErrorApi(403, MENSAJES_MODERACION.soloAdministradores);
  }
}

export async function traerCursoEnModeracion(
  idCurso: string,
  esAdminGlobal: boolean,
  idUsuario: string,
): Promise<CursoEnModeracion> {
  await comprobarPermisoSobreCurso(idCurso, esAdminGlobal, idUsuario);
  const curso = await bd.curso.findFirst({
    where: { id: idCurso, ...EN_REVISION },
    select: {
      ...seleccionCurso,
      idioma: true,
      daInsignia: true,
      lecciones: {
        orderBy: { posicion: "asc" },
        select: { id: true, titulo: true, modulo: true, posicion: true, actividades: true },
      },
    },
  });
  if (!curso) throw await errorCursoNoEnRevision(idCurso);
  const idioma = curso.idioma as IdiomaCurso;
  return {
    ...aCursoEnRevision(curso),
    idioma,
    daInsignia: curso.daInsignia,
    lecciones: curso.lecciones.map((leccion) => ({
      id: leccion.id,
      titulo: leccion.titulo,
      modulo: leccion.modulo,
      posicion: leccion.posicion,
      actividades: leccion.actividades as unknown as Actividad[],
      idioma,
    })),
  };
}

export async function aprobarCurso(
  idCurso: string,
  esAdminGlobal: boolean,
  idUsuario: string,
): Promise<void> {
  await comprobarPermisoSobreCurso(idCurso, esAdminGlobal, idUsuario);
  const { count } = await bd.curso.updateMany({
    where: { id: idCurso, ...EN_REVISION },
    data: { publicado: true },
  });
  if (count !== 1) throw await errorCursoNoEnRevision(idCurso);
}

export async function rechazarCurso(
  idCurso: string,
  motivo: string | null,
  esAdminGlobal: boolean,
  idUsuario: string,
): Promise<void> {
  await comprobarPermisoSobreCurso(idCurso, esAdminGlobal, idUsuario);
  const { count } = await bd.curso.updateMany({
    where: { id: idCurso, ...EN_REVISION },
    data: { revision: "rechazada", motivoRechazo: motivo },
  });
  if (count !== 1) throw await errorCursoNoEnRevision(idCurso);
}
