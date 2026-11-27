import { bd } from "../config/bd.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  MENSAJES_LECCION,
  MENSAJES_REPORTE,
  type CuerpoReporteActividad,
  type ReporteActividad,
} from "../tipos/contrato.ts";
import { puedeVerCursoPublicado } from "./cursos.ts";

// Reportes de error en actividades enviados por alumnos y atendidos por el autor en Estudio.

export async function crearReporteActividad(
  idUsuario: string,
  idCurso: string,
  idLeccion: string,
  { indiceActividad, mensaje }: CuerpoReporteActividad,
): Promise<ReporteActividad> {
  const leccion = await bd.leccion.findFirst({
    where: { id: idLeccion, idCurso },
    select: {
      id: true,
      titulo: true,
      actividades: true,
      curso: {
        select: {
          id: true,
          titulo: true,
          publicado: true,
          visibilidad: true,
          claveEnlace: true,
          idAutor: true,
          idOrganizacion: true,
          tambienPublico: true,
          organizacion: { select: { modoAcceso: true } },
        },
      },
    },
  });

  if (!leccion || !(await puedeVerCursoPublicado(leccion.curso, idUsuario))) {
    throw new ErrorApi(404, MENSAJES_LECCION.leccionNoDisponible);
  }

  const actividades = Array.isArray(leccion.actividades) ? leccion.actividades : [];
  if (indiceActividad >= actividades.length) {
    throw new ErrorApi(400, "La actividad indicada no existe en esta lección.");
  }

  const creado = await bd.reporteActividad.create({
    data: {
      idCurso,
      idLeccion,
      indiceActividad,
      idUsuario,
      mensaje,
    },
    select: {
      id: true,
      idCurso: true,
      idLeccion: true,
      indiceActividad: true,
      mensaje: true,
      resuelto: true,
      creadoEn: true,
      usuario: { select: { name: true } },
    },
  });

  return {
    id: creado.id,
    idCurso: creado.idCurso,
    tituloCurso: leccion.curso.titulo,
    idLeccion: creado.idLeccion,
    tituloLeccion: leccion.titulo,
    indiceActividad: creado.indiceActividad,
    mensaje: creado.mensaje,
    nombreAutorReporte: creado.usuario.name,
    resuelto: creado.resuelto,
    creadoEn: creado.creadoEn.toISOString(),
  };
}

export async function traerReportesDelAutor(idAutor: string): Promise<ReporteActividad[]> {
  const filas = await bd.reporteActividad.findMany({
    where: { curso: { idAutor } },
    orderBy: [{ resuelto: "asc" }, { creadoEn: "desc" }],
    select: {
      id: true,
      idCurso: true,
      idLeccion: true,
      indiceActividad: true,
      mensaje: true,
      resuelto: true,
      creadoEn: true,
      curso: { select: { titulo: true } },
      leccion: { select: { titulo: true } },
      usuario: { select: { name: true } },
    },
  });

  return filas.map((r) => ({
    id: r.id,
    idCurso: r.idCurso,
    tituloCurso: r.curso.titulo,
    idLeccion: r.idLeccion,
    tituloLeccion: r.leccion.titulo,
    indiceActividad: r.indiceActividad,
    mensaje: r.mensaje,
    nombreAutorReporte: r.usuario.name,
    resuelto: r.resuelto,
    creadoEn: r.creadoEn.toISOString(),
  }));
}

export async function cambiarEstadoReporte(
  idAutor: string,
  idReporte: string,
  resuelto: boolean,
): Promise<ReporteActividad> {
  const existente = await bd.reporteActividad.findUnique({
    where: { id: idReporte },
    select: {
      id: true,
      curso: { select: { idAutor: true, titulo: true } },
      leccion: { select: { titulo: true } },
      usuario: { select: { name: true } },
    },
  });

  if (!existente || existente.curso.idAutor !== idAutor) {
    throw new ErrorApi(404, MENSAJES_REPORTE.noEncontrado);
  }

  const actualizado = await bd.reporteActividad.update({
    where: { id: idReporte },
    data: { resuelto },
    select: {
      id: true,
      idCurso: true,
      idLeccion: true,
      indiceActividad: true,
      mensaje: true,
      resuelto: true,
      creadoEn: true,
    },
  });

  return {
    id: actualizado.id,
    idCurso: actualizado.idCurso,
    tituloCurso: existente.curso.titulo,
    idLeccion: actualizado.idLeccion,
    tituloLeccion: existente.leccion.titulo,
    indiceActividad: actualizado.indiceActividad,
    mensaje: actualizado.mensaje,
    nombreAutorReporte: existente.usuario.name,
    resuelto: actualizado.resuelto,
    creadoEn: actualizado.creadoEn.toISOString(),
  };
}
