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

// Moderación (decisión 0018): lo que un administrador ve y hace desde "Mi panel". La
// ruta ya comprobó que quien llama es administrador.

const EN_REVISION = { publicado: false, revision: "pendiente" } satisfies Prisma.CursoWhereInput;

const seleccionCurso = {
  id: true,
  titulo: true,
  descripcion: true,
  idPortada: true,
  actualizadoEn: true,
  autor: { select: { name: true } },
  _count: { select: { lecciones: true } },
} satisfies Prisma.CursoSelect;

type CursoSeleccionado = Prisma.CursoGetPayload<{ select: typeof seleccionCurso }>;

// Un curso en revisión no se edita, así que `actualizadoEn` es cuándo se envió.
function aCursoEnRevision(curso: CursoSeleccionado): CursoEnRevision {
  return {
    id: curso.id,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    nombreAutor: curso.autor.name,
    cantidadLecciones: curso._count.lecciones,
    idPortada: curso.idPortada,
    enviadoEn: curso.actualizadoEn.toISOString(),
  };
}

// 404 si el curso no existe; 409 si existe pero ya no está en revisión.
async function errorCursoNoEnRevision(idCurso: string): Promise<ErrorApi> {
  const existe = await bd.curso.count({ where: { id: idCurso } });
  return existe
    ? new ErrorApi(409, MENSAJES_MODERACION.yaNoEnRevision)
    : new ErrorApi(404, MENSAJES_MODERACION.cursoNoExiste);
}

// Los cursos que esperan decisión, del enviado hace más tiempo al más reciente.
export async function traerCursosEnRevision(): Promise<CursoEnRevision[]> {
  const cursos = await bd.curso.findMany({
    where: EN_REVISION,
    orderBy: [{ actualizadoEn: "asc" }, { id: "asc" }],
    select: seleccionCurso,
  });
  return cursos.map(aCursoEnRevision);
}

// Todo el curso, con las actividades de cada lección, para probarlo antes de decidir.
export async function traerCursoEnModeracion(idCurso: string): Promise<CursoEnModeracion> {
  const curso = await bd.curso.findFirst({
    where: { id: idCurso, ...EN_REVISION },
    select: {
      ...seleccionCurso,
      idioma: true,
      daInsignia: true,
      lecciones: {
        orderBy: { posicion: "asc" },
        select: { id: true, titulo: true, posicion: true, actividades: true },
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
      posicion: leccion.posicion,
      // la columna solo se escribe después de validarActividades
      actividades: leccion.actividades as unknown as Actividad[],
      idioma,
    })),
  };
}

// Publica el curso si sigue en revisión. El trigger de F06 limpia `revision` al cambiar
// `publicado`, igual que cuando se aprobaba directo en la base. La condición va en el
// mismo UPDATE para que un autor que lo retira al mismo tiempo no termine publicado.
export async function aprobarCurso(idCurso: string): Promise<void> {
  const { count } = await bd.curso.updateMany({
    where: { id: idCurso, ...EN_REVISION },
    data: { publicado: true },
  });
  if (count !== 1) throw await errorCursoNoEnRevision(idCurso);
}

// No lo publica: vuelve a borrador con "Revisión no aprobada" y el motivo, si hay, que su
// autor ve en el mapa del curso (F06). Es lo mismo que rechazarlo en la base.
export async function rechazarCurso(idCurso: string, motivo: string | null): Promise<void> {
  const { count } = await bd.curso.updateMany({
    where: { id: idCurso, ...EN_REVISION },
    data: { revision: "rechazada", motivoRechazo: motivo },
  });
  if (count !== 1) throw await errorCursoNoEnRevision(idCurso);
}
