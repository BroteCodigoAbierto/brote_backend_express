import { bd } from "../config/bd.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  CALIFICA_ACTIVIDAD,
  MENSAJES_LECCION,
  MENSAJES_PROGRESO,
  type Actividad,
  type CuerpoProgresoLeccion,
  type CursoEmpezado,
  type ProgresoLeccion,
} from "../tipos/contrato.ts";
import { dondeLeccionPublicada } from "./lecciones.ts";

// Progreso del alumno (spec F04): una fila por alumno y lección completada,
// con el resultado de la última vez (brote_specs, research de F04, puntos 1 a 6).

export function contarPreguntas(actividades: Actividad[]): number {
  return actividades.filter((actividad) => CALIFICA_ACTIVIDAD[actividad.tipo]).length;
}

type FilaProgreso = { aciertos: number; preguntas: number; completadaEn: Date };

export function aProgresoLeccion({
  aciertos,
  preguntas,
  completadaEn,
}: FilaProgreso): ProgresoLeccion {
  return { aciertos, preguntas, completadaEn: completadaEn.toISOString() };
}

// Solo lecciones que se pueden abrir (el mismo 404 que F03) y con un resultado
// que cuadre con las preguntas que la lección tiene hoy. No se recalifican las
// respuestas: el cliente ya las conoce (research, punto 1).
export async function registrarProgreso(
  idUsuario: string,
  idCurso: string,
  idLeccion: string,
  { aciertos, preguntas }: CuerpoProgresoLeccion,
): Promise<ProgresoLeccion> {
  const leccion = await bd.leccion.findFirst({
    where: dondeLeccionPublicada(idCurso, idLeccion),
    select: { actividades: true },
  });
  if (!leccion) throw new ErrorApi(404, MENSAJES_LECCION.leccionNoDisponible);
  // la columna solo se escribe después de validarActividades
  const actividades = leccion.actividades as unknown as Actividad[];
  if (preguntas !== contarPreguntas(actividades) || aciertos > preguntas) {
    throw new ErrorApi(400, MENSAJES_PROGRESO.resultadoInvalido);
  }

  // Sin escrituras anidadas, Prisma lo hace con INSERT ... ON CONFLICT: dos
  // dispositivos a la vez dejan una sola fila, con el último resultado.
  const fila = await bd.progreso.upsert({
    where: { idUsuario_idLeccion: { idUsuario, idLeccion } },
    create: { idUsuario, idLeccion, aciertos, preguntas },
    update: { aciertos, preguntas, completadaEn: new Date() },
    select: { aciertos: true, preguntas: true, completadaEn: true },
  });
  return aProgresoLeccion(fila);
}

// Los cursos publicados con alguna lección completada, del que avanzó más
// recientemente al más antiguo. Se agrupa aquí: son pocas filas por alumno
// (research, punto 6).
export async function traerCursosEmpezados(idUsuario: string): Promise<CursoEmpezado[]> {
  const filas = await bd.progreso.findMany({
    where: { idUsuario, leccion: { curso: { publicado: true } } },
    orderBy: [{ completadaEn: "desc" }, { idLeccion: "asc" }],
    select: {
      completadaEn: true,
      leccion: {
        select: {
          curso: {
            select: {
              id: true,
              titulo: true,
              descripcion: true,
              autor: { select: { id: true, name: true } },
              _count: { select: { lecciones: true } },
            },
          },
        },
      },
    },
  });

  // un Map conserva el orden de la primera aparición, que es la más reciente
  const cursos = new Map<string, CursoEmpezado>();
  for (const { completadaEn, leccion } of filas) {
    const { curso } = leccion;
    const empezado = cursos.get(curso.id);
    if (empezado) {
      empezado.leccionesCompletadas += 1;
      continue;
    }
    cursos.set(curso.id, {
      id: curso.id,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      autor: { id: curso.autor.id, nombre: curso.autor.name },
      cantidadLecciones: curso._count.lecciones,
      leccionesCompletadas: 1,
      ultimoAvanceEn: completadaEn.toISOString(),
    });
  }
  return [...cursos.values()];
}
