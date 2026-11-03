import { bd } from "../config/bd.ts";
import type { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import { MENSAJES_LECCION, type Actividad, type DetalleLeccion } from "../tipos/contrato.ts";

// Una lección para cursarla (spec F03). Solo sale si su curso está publicado y
// es el de la dirección; en cualquier otro caso, el mismo 404.

const seleccionLeccion = {
  id: true,
  titulo: true,
  posicion: true,
  actividades: true,
} satisfies Prisma.LeccionSelect;

type LeccionConActividades = Prisma.LeccionGetPayload<{ select: typeof seleccionLeccion }>;

function aDetalleLeccion(leccion: LeccionConActividades): DetalleLeccion {
  return {
    id: leccion.id,
    titulo: leccion.titulo,
    posicion: leccion.posicion,
    // la columna solo se escribe después de validarActividades
    actividades: leccion.actividades as unknown as Actividad[],
  };
}

// Una lección que se puede abrir: existe, es de ese curso y el curso está
// publicado. La usan abrirla (F03) y registrar su progreso (F04), para que las
// dos reglas no se separen.
export function dondeLeccionPublicada(idCurso: string, idLeccion: string) {
  return { id: idLeccion, idCurso, curso: { publicado: true } } satisfies Prisma.LeccionWhereInput;
}

// Mismo mensaje si la lección no existe, es de otro curso o su curso no está
// publicado, para no revelar cursos en borrador (spec F03, "Casos de error").
export async function traerLeccionPublicada(
  idCurso: string,
  idLeccion: string,
): Promise<DetalleLeccion> {
  const leccion = await bd.leccion.findFirst({
    where: dondeLeccionPublicada(idCurso, idLeccion),
    select: seleccionLeccion,
  });
  if (!leccion) throw new ErrorApi(404, MENSAJES_LECCION.leccionNoDisponible);
  return aDetalleLeccion(leccion);
}
