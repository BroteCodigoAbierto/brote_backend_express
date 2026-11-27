import { bd } from "../config/bd.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  CALIFICA_ACTIVIDAD,
  MENSAJES_LECCION,
  MENSAJES_PROGRESO,
  type Actividad,
  type CuerpoProgresoLeccion,
  type CursoEmpezado,
  type InsigniaCurso,
  type ProgresoLeccion,
  type RespuestaProgresoLeccion,
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

// F08: si el curso da insignia y el alumno ya completó todas las lecciones que tiene hoy,
// se la da. createMany con skipDuplicates (ON CONFLICT DO NOTHING): si dos dispositivos
// terminan a la vez, solo uno crea la fila y solo ese la anuncia como nueva (brote_specs,
// research de F08, puntos 2 y 3).
async function darInsigniaSiCompleto(
  idUsuario: string,
  idCurso: string,
): Promise<InsigniaCurso | null> {
  const curso = await bd.curso.findUnique({
    where: { id: idCurso },
    select: { daInsignia: true, titulo: true, idPortada: true },
  });
  if (!curso?.daInsignia) return null;
  const [lecciones, completadas] = await Promise.all([
    bd.leccion.count({ where: { idCurso } }),
    bd.progreso.count({ where: { idUsuario, leccion: { idCurso } } }),
  ]);
  if (lecciones === 0 || completadas < lecciones) return null;
  const { count } = await bd.insignia.createMany({
    data: [{ idUsuario, idCurso }],
    skipDuplicates: true,
  });
  if (count === 0) return null;
  const { ganadaEn } = await bd.insignia.findUniqueOrThrow({
    where: { idUsuario_idCurso: { idUsuario, idCurso } },
    select: { ganadaEn: true },
  });
  return {
    idCurso,
    titulo: curso.titulo,
    idPortada: curso.idPortada,
    ganadaEn: ganadaEn.toISOString(),
  };
}

// Solo lecciones que se pueden abrir (el mismo 404 que F03) y con un resultado
// que cuadre con las preguntas que la lección tiene hoy. No se recalifican las
// respuestas: el cliente ya las conoce (research, punto 1). F08: además, la
// insignia que esta lección haya completado.
export async function registrarProgreso(
  idUsuario: string,
  idCurso: string,
  idLeccion: string,
  { aciertos, preguntas }: CuerpoProgresoLeccion,
): Promise<RespuestaProgresoLeccion> {
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
  return {
    progreso: aProgresoLeccion(fila),
    insigniaNueva: await darInsigniaSiCompleto(idUsuario, idCurso),
  };
}

// F08: las insignias de quien llama, de la más reciente a la más antigua. Incluye cursos
// que ya no están publicados: una insignia ganada no se pierde (research de F08, punto 4).
export async function traerInsignias(idUsuario: string): Promise<InsigniaCurso[]> {
  const filas = await bd.insignia.findMany({
    where: { idUsuario },
    orderBy: [{ ganadaEn: "desc" }, { idCurso: "asc" }],
    select: {
      idCurso: true,
      ganadaEn: true,
      curso: { select: { titulo: true, idPortada: true } },
    },
  });
  return filas.map(({ idCurso, ganadaEn, curso }) => ({
    idCurso,
    titulo: curso.titulo,
    idPortada: curso.idPortada,
    ganadaEn: ganadaEn.toISOString(),
  }));
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
              idPortada: true,
              idioma: true,
              categoria: true,
              nivel: true,
              daInsignia: true,
              permiteFork: true,
              autor: { select: { id: true, name: true } },
              organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
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
      empezado.completado =
        empezado.cantidadLecciones > 0 &&
        empezado.leccionesCompletadas >= empezado.cantidadLecciones;
      continue;
    }
    const cantidadLecciones = curso._count.lecciones;
    cursos.set(curso.id, {
      id: curso.id,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      autor: { id: curso.autor.id, nombre: curso.autor.name },
      cantidadLecciones,
      idPortada: curso.idPortada,
      idioma: curso.idioma as CursoEmpezado["idioma"],
      categoria: curso.categoria as CursoEmpezado["categoria"],
      nivel: curso.nivel as CursoEmpezado["nivel"],
      daInsignia: curso.daInsignia,
      permiteFork: curso.permiteFork,
      completado: cantidadLecciones > 0 && 1 >= cantidadLecciones,
      organizacion: curso.organizacion,
      leccionesCompletadas: 1,
      ultimoAvanceEn: completadaEn.toISOString(),
    });
  }
  return [...cursos.values()];
}
