import { bd } from "../config/bd.ts";
import { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_CATALOGO,
  MENSAJES_CATALOGO,
  type DetalleCurso,
  type RespuestaCatalogo,
  type ResumenCurso,
} from "../tipos/contrato.ts";
import { crearCursor, type ConsultaCatalogo, type PosicionCurso } from "../validacion/catalogo.ts";
import { aProgresoLeccion } from "./progreso.ts";

// Catálogo de cursos publicados (spec F02). La búsqueda y el orden se hacen en
// PostgreSQL con unaccent, en una consulta propia porque Prisma no sabe quitar
// acentos (brote_specs, research de F02, puntos 2 a 4).

type FilaCatalogo = {
  id: string;
  titulo: string;
  descripcion: string;
  creadoEn: Date;
  idAutor: string;
  nombreAutor: string;
  cantidadLecciones: number;
  clave: string;
};

function aResumenCurso(fila: FilaCatalogo): ResumenCurso {
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    autor: { id: fila.idAutor, nombre: fila.nombreAutor },
    cantidadLecciones: fila.cantidadLecciones,
  };
}

// Lo que escribe el usuario se busca literal: "100%" no es un comodín.
function escaparLike(palabra: string): string {
  return palabra.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

// Cada palabra tiene que estar en el título, la descripción o el nombre del
// autor, sin importar mayúsculas, acentos ni ñ/n, aunque sea parte de otra.
function condicionPalabra(palabra: string): Prisma.Sql {
  return Prisma.sql`texto LIKE '%' || lower(unaccent(${escaparLike(palabra)}::text)) || '%' ESCAPE '\\'`;
}

// Los que van después del último curso entregado. La comparación de filas
// sigue exactamente el ORDER BY, y no depende de que ese curso siga existiendo.
// creado_en no tiene zona horaria y guarda UTC: se compara con el ISO
// convertido a timestamp para que la zona de la sesión no mueva la fecha.
function condicionDespues({ clave, creadoEn, id }: PosicionCurso): Prisma.Sql {
  return Prisma.sql`(clave COLLATE "C", "creadoEn", id COLLATE "C") > (${clave}::text COLLATE "C", CAST(${creadoEn.toISOString()} AS timestamp(3)), ${id}::text COLLATE "C")`;
}

export async function traerCatalogo({
  palabras,
  despues,
}: ConsultaCatalogo): Promise<RespuestaCatalogo> {
  const condiciones = palabras.map(condicionPalabra);
  if (despues) condiciones.push(condicionDespues(despues));
  const donde =
    condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
  const porCarga = LIMITES_CATALOGO.cursosPorCarga;

  // La clave quita mayúsculas, acentos y signos al inicio ("¿", "¡"); se
  // compara con COLLATE "C" para ordenar igual en cualquier servidor. Se pide
  // uno de más para saber si quedan cursos.
  const filas = await bd.$queryRaw<FilaCatalogo[]>`
    SELECT id, titulo, descripcion, "creadoEn", "idAutor", "nombreAutor", "cantidadLecciones", clave
    FROM (
      SELECT
        c.id,
        c.titulo,
        c.descripcion,
        c.creado_en AS "creadoEn",
        u.id AS "idAutor",
        u.name AS "nombreAutor",
        (SELECT count(*)::int FROM leccion l WHERE l.id_curso = c.id) AS "cantidadLecciones",
        regexp_replace(lower(unaccent(c.titulo)), '^[^[:alnum:]]+', '') AS clave,
        lower(unaccent(c.titulo || ' ' || c.descripcion || ' ' || u.name)) AS texto
      FROM curso c
      JOIN "user" u ON u.id = c.id_autor
      WHERE c.publicado
    ) AS publicados
    ${donde}
    ORDER BY clave COLLATE "C", "creadoEn", id COLLATE "C"
    LIMIT ${porCarga + 1}
  `;

  const cursos = filas.slice(0, porCarga);
  const ultimo = cursos.at(-1);
  const siguiente = filas.length > porCarga && ultimo ? crearCursor(ultimo) : null;
  return { cursos: cursos.map(aResumenCurso), siguiente };
}

// Cada lección trae el progreso de quien pregunta, en la misma consulta, para
// que el detalle no aparezca primero sin avance (spec F04, research, punto 5).
function seleccionDetalle(idUsuario: string) {
  return {
    id: true,
    titulo: true,
    descripcion: true,
    autor: { select: { id: true, name: true } },
    lecciones: {
      orderBy: { posicion: "asc" },
      select: {
        id: true,
        titulo: true,
        posicion: true,
        progresos: {
          where: { idUsuario },
          select: { aciertos: true, preguntas: true, completadaEn: true },
        },
      },
    },
  } satisfies Prisma.CursoSelect;
}

type CursoConLecciones = Prisma.CursoGetPayload<{
  select: ReturnType<typeof seleccionDetalle>;
}>;

function aDetalleCurso(curso: CursoConLecciones): DetalleCurso {
  return {
    id: curso.id,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    autor: { id: curso.autor.id, nombre: curso.autor.name },
    cantidadLecciones: curso.lecciones.length,
    lecciones: curso.lecciones.map(({ id, titulo, posicion, progresos }) => ({
      id,
      titulo,
      posicion,
      // a lo sumo hay una fila: la clave es (alumno, lección)
      progreso: progresos[0] ? aProgresoLeccion(progresos[0]) : null,
    })),
  };
}

// Un curso sin publicar responde igual que uno que no existe, para no revelar
// que existe (spec F02, "Casos de error").
export async function traerCursoPublicado(id: string, idUsuario: string): Promise<DetalleCurso> {
  const curso = await bd.curso.findFirst({
    where: { id, publicado: true },
    select: seleccionDetalle(idUsuario),
  });
  if (!curso) throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  return aDetalleCurso(curso);
}
