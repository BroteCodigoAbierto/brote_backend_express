import { bd } from "../config/bd.ts";
import type { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  MENSAJES_CUENTA,
  MENSAJES_LECCION,
  type Actividad,
  type DetalleLeccion,
  type IdiomaCurso,
} from "../tipos/contrato.ts";
import { puedeVerCursoPublicado } from "./cursos.ts";

// Una lección para cursarla (spec F03 + decisión 0020).
// Soporta visitantes sin cuenta para la lección de muestra (posición 1) y respeta
// permisos de organización y enlace privado.

const seleccionLeccion = {
  id: true,
  titulo: true,
  modulo: true,
  posicion: true,
  actividades: true,
  curso: {
    select: {
      id: true,
      idioma: true,
      publicado: true,
      visibilidad: true,
      claveEnlace: true,
      idAutor: true,
      idOrganizacion: true,
      tambienPublico: true,
      organizacion: { select: { modoAcceso: true } },
    },
  },
} satisfies Prisma.LeccionSelect;

type LeccionConActividades = Prisma.LeccionGetPayload<{ select: typeof seleccionLeccion }>;

function aDetalleLeccion(leccion: LeccionConActividades): DetalleLeccion {
  return {
    id: leccion.id,
    titulo: leccion.titulo,
    modulo: leccion.modulo,
    posicion: leccion.posicion,
    actividades: leccion.actividades as unknown as Actividad[],
    idioma: leccion.curso.idioma as IdiomaCurso,
  };
}

export function dondeLeccionPublicada(idCurso: string, idLeccion: string) {
  return { id: idLeccion, idCurso, curso: { publicado: true } } satisfies Prisma.LeccionWhereInput;
}

export async function traerLeccionPublicada(
  idCurso: string,
  idLeccion: string,
  idUsuario: string | null = null,
  claveEnlace?: string | null,
): Promise<DetalleLeccion> {
  const leccion = await bd.leccion.findFirst({
    where: { id: idLeccion, idCurso },
    select: seleccionLeccion,
  });
  if (!leccion || !(await puedeVerCursoPublicado(leccion.curso, idUsuario, claveEnlace))) {
    throw new ErrorApi(404, MENSAJES_LECCION.leccionNoDisponible);
  }
  // Un visitante sin cuenta puede probar la primera lección como muestra abierta.
  if (!idUsuario && leccion.posicion > 1) {
    throw new ErrorApi(401, MENSAJES_CUENTA.sesionTerminada);
  }
  return aDetalleLeccion(leccion);
}
