import { bd } from "../config/bd.ts";
import { entorno } from "../config/entorno.ts";
import { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_CATALOGO,
  MENSAJES_CATALOGO,
  MENSAJES_ORGANIZACION,
  type CategoriaCurso,
  type DetalleCurso,
  type IdiomaCurso,
  type NivelCurso,
  type ReferenciaOrganizacion,
  type RespuestaCatalogo,
  type ResumenCurso,
  type VisibilidadCurso,
} from "../tipos/contrato.ts";
import { crearCursor, type ConsultaCatalogo } from "../validacion/catalogo.ts";
import { aProgresoLeccion } from "./progreso.ts";

// Catálogo de cursos publicados (F02 + decisión 0020): soporta exploración pública
// sin cuenta, filtros por categoría/nivel/idioma/orden, toggle de completados y
// filtrado por organización (silo opcional).

type FilaCatalogo = {
  id: string;
  titulo: string;
  descripcion: string;
  creadoEn: Date;
  idAutor: string;
  nombreAutor: string;
  cantidadLecciones: number;
  idPortada: string | null;
  idioma: string;
  categoria: string;
  nivel: string;
  daInsignia: boolean;
  permiteFork: boolean;
  completado: boolean;
  orgId: string | null;
  orgSlug: string | null;
  orgNombre: string | null;
  orgColorMarca: string | null;
  clave: string;
};

function aReferenciaOrg(
  org: { id: string; slug: string; nombre: string; colorMarca: string | null } | null,
): ReferenciaOrganizacion | null {
  if (!org) return null;
  return { id: org.id, slug: org.slug, nombre: org.nombre, colorMarca: org.colorMarca };
}

function aResumenCurso(fila: FilaCatalogo): ResumenCurso {
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    autor: { id: fila.idAutor, nombre: fila.nombreAutor },
    cantidadLecciones: fila.cantidadLecciones,
    idPortada: fila.idPortada,
    idioma: fila.idioma as IdiomaCurso,
    categoria: fila.categoria as CategoriaCurso,
    nivel: fila.nivel as NivelCurso,
    daInsignia: fila.daInsignia,
    permiteFork: fila.permiteFork,
    completado: fila.completado,
    organizacion:
      fila.orgId && fila.orgSlug && fila.orgNombre
        ? {
            id: fila.orgId,
            slug: fila.orgSlug,
            nombre: fila.orgNombre,
            colorMarca: fila.orgColorMarca,
          }
        : null,
  };
}

function escaparLike(palabra: string): string {
  return palabra.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

function condicionPalabra(palabra: string): Prisma.Sql {
  return Prisma.sql`texto LIKE '%' || lower(unaccent(${escaparLike(palabra)}::text)) || '%' ESCAPE '\\'`;
}

// Comprueba si quien pregunta puede acceder a un curso publicado según su visibilidad.
export async function puedeVerCursoPublicado(
  curso: {
    id: string;
    publicado: boolean;
    visibilidad: string;
    claveEnlace: string | null;
    idAutor: string;
    idOrganizacion: string | null;
    tambienPublico: boolean;
    organizacion: { modoAcceso: string } | null;
  },
  idUsuario: string | null,
  claveEnlace?: string | null,
): Promise<boolean> {
  if (!curso.publicado) return false;
  if (idUsuario && curso.idAutor === idUsuario) return true;
  if (curso.visibilidad === "publico") return true;
  if (curso.visibilidad === "organizacion") {
    if (curso.tambienPublico) return true;
    if (curso.organizacion?.modoAcceso === "abierto") return true;
    if (!idUsuario || !curso.idOrganizacion) return false;
    const miembro = await bd.miembroOrganizacion.findUnique({
      where: {
        idOrganizacion_idUsuario: { idOrganizacion: curso.idOrganizacion, idUsuario },
      },
      select: { rol: true },
    });
    return miembro !== null;
  }
  if (curso.visibilidad === "enlacePrivado") {
    if (claveEnlace && curso.claveEnlace && claveEnlace === curso.claveEnlace) return true;
    if (!idUsuario) return false;
    // Si el alumno ya empezó el curso o está en un grupo del curso, puede seguir viéndolo.
    const [progreso, grupo] = await Promise.all([
      bd.progreso.findFirst({
        where: { idUsuario, leccion: { idCurso: curso.id } },
        select: { idLeccion: true },
      }),
      bd.miembroGrupo.findFirst({
        where: { idUsuario, grupo: { idCurso: curso.id } },
        select: { idGrupo: true },
      }),
    ]);
    return progreso !== null || grupo !== null;
  }
  return false;
}

export async function traerCatalogo(
  consulta: ConsultaCatalogo,
  idUsuario: string | null,
): Promise<RespuestaCatalogo> {
  const { palabras, categoria, nivel, idioma, orden, ocultarCompletados, despues } = consulta;
  const slugOrg =
    consulta.organizacion ??
    (entorno.modoInstancia === "organizacion" ? entorno.slugOrganizacionFija : null);

  let idOrganizacionFiltrada: string | null = null;
  if (slugOrg) {
    const org = await bd.organizacion.findUnique({
      where: { slug: slugOrg },
      select: { id: true, modoAcceso: true },
    });
    if (!org) throw new ErrorApi(404, MENSAJES_ORGANIZACION.noEncontrada);
    if (org.modoAcceso !== "abierto") {
      if (!idUsuario) throw new ErrorApi(404, MENSAJES_ORGANIZACION.noEncontrada);
      const miembro = await bd.miembroOrganizacion.findUnique({
        where: { idOrganizacion_idUsuario: { idOrganizacion: org.id, idUsuario } },
        select: { rol: true },
      });
      if (!miembro) throw new ErrorApi(404, MENSAJES_ORGANIZACION.noEncontrada);
    }
    idOrganizacionFiltrada = org.id;
  }

  const condiciones: Prisma.Sql[] = palabras.map(condicionPalabra);
  if (categoria) condiciones.push(Prisma.sql`categoria = ${categoria}`);
  if (nivel) condiciones.push(Prisma.sql`nivel = ${nivel}`);
  if (idioma) condiciones.push(Prisma.sql`idioma = ${idioma}`);
  if (ocultarCompletados && idUsuario) {
    condiciones.push(Prisma.sql`NOT completado`);
  }

  const donde =
    condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;

  const filtroVisibilidad = idOrganizacionFiltrada
    ? Prisma.sql`c.id_organizacion = ${idOrganizacionFiltrada} AND c.visibilidad IN ('organizacion', 'publico')`
    : Prisma.sql`(c.visibilidad = 'publico' OR (c.visibilidad = 'organizacion' AND c.tambien_publico = true))`;

  const exprCompletado = idUsuario
    ? Prisma.sql`(
        EXISTS (SELECT 1 FROM leccion l WHERE l.id_curso = c.id)
        AND NOT EXISTS (
          SELECT 1 FROM leccion l
          WHERE l.id_curso = c.id
            AND NOT EXISTS (
              SELECT 1 FROM progreso p WHERE p.id_leccion = l.id AND p.id_usuario = ${idUsuario}
            )
        )
      )`
    : Prisma.sql`false`;

  let orderBy: Prisma.Sql;
  if (orden === "recientes") {
    orderBy = Prisma.sql`ORDER BY "creadoEn" DESC, id COLLATE "C"`;
  } else if (orden === "az") {
    orderBy = Prisma.sql`ORDER BY clave COLLATE "C", "creadoEn", id COLLATE "C"`;
  } else {
    orderBy = Prisma.sql`ORDER BY "puntajeDestacado" DESC, "creadoEn" DESC, id COLLATE "C"`;
  }

  const porCarga = LIMITES_CATALOGO.cursosPorCarga;
  const desplazamiento = despues?.desplazamiento ?? 0;

  const filas = await bd.$queryRaw<FilaCatalogo[]>`
    SELECT
      id, titulo, descripcion, "creadoEn", "idAutor", "nombreAutor",
      "cantidadLecciones", "idPortada", idioma, categoria, nivel,
      "daInsignia", "permiteFork", completado,
      "orgId", "orgSlug", "orgNombre", "orgColorMarca", clave
    FROM (
      SELECT
        c.id,
        c.titulo,
        c.descripcion,
        c.creado_en AS "creadoEn",
        u.id AS "idAutor",
        u.name AS "nombreAutor",
        (SELECT count(*)::int FROM leccion l WHERE l.id_curso = c.id) AS "cantidadLecciones",
        c.id_portada AS "idPortada",
        c.idioma,
        c.categoria,
        c.nivel,
        c.da_insignia AS "daInsignia",
        c.permite_fork AS "permiteFork",
        ${exprCompletado} AS completado,
        o.id AS "orgId",
        o.slug AS "orgSlug",
        o.nombre AS "orgNombre",
        o.color_marca AS "orgColorMarca",
        (
          (SELECT count(DISTINCT p.id_usuario)::int FROM progreso p JOIN leccion l2 ON l2.id = p.id_leccion WHERE l2.id_curso = c.id)
          + CASE WHEN c.da_insignia THEN 2 ELSE 0 END
          + CASE WHEN c.id_portada IS NOT NULL THEN 1 ELSE 0 END
        ) AS "puntajeDestacado",
        regexp_replace(lower(unaccent(c.titulo)), '^[^[:alnum:]]+', '') AS clave,
        lower(unaccent(c.titulo || ' ' || c.descripcion || ' ' || u.name || ' ' || array_to_string(c.etiquetas, ' '))) AS texto
      FROM curso c
      JOIN "user" u ON u.id = c.id_autor
      LEFT JOIN organizacion o ON o.id = c.id_organizacion
      WHERE c.publicado
        AND ${filtroVisibilidad}
    ) AS publicados
    ${donde}
    ${orderBy}
    LIMIT ${porCarga + 1}
    OFFSET ${desplazamiento}
  `;

  const cursos = filas.slice(0, porCarga);
  const siguiente =
    filas.length > porCarga
      ? crearCursor({
          clave: "",
          creadoEn: new Date(0),
          id: "",
          desplazamiento: desplazamiento + porCarga,
        })
      : null;

  return { cursos: cursos.map(aResumenCurso), siguiente };
}

function seleccionDetalle(idUsuario: string | null) {
  return {
    id: true,
    titulo: true,
    descripcion: true,
    publicado: true,
    idPortada: true,
    idioma: true,
    categoria: true,
    nivel: true,
    etiquetas: true,
    daInsignia: true,
    visibilidad: true,
    claveEnlace: true,
    idOrganizacion: true,
    tambienPublico: true,
    permiteFork: true,
    idAutor: true,
    autor: { select: { id: true, name: true } },
    organizacion: {
      select: { id: true, slug: true, nombre: true, colorMarca: true, modoAcceso: true },
    },
    cursoOrigen: {
      select: { id: true, titulo: true, autor: { select: { name: true } } },
    },
    lecciones: {
      orderBy: { posicion: "asc" },
      select: {
        id: true,
        titulo: true,
        modulo: true,
        posicion: true,
        ...(idUsuario
          ? {
              progresos: {
                where: { idUsuario },
                select: { aciertos: true, preguntas: true, completadaEn: true },
              },
            }
          : {}),
      },
    },
  } satisfies Prisma.CursoSelect;
}

export async function traerCursoPublicado(
  id: string,
  idUsuario: string | null,
  claveEnlace?: string | null,
): Promise<DetalleCurso> {
  const curso = await bd.curso.findUnique({
    where: { id },
    select: seleccionDetalle(idUsuario),
  });
  if (!curso || !(await puedeVerCursoPublicado(curso, idUsuario, claveEnlace))) {
    throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  }
  return mapearDetalleCurso(curso, idUsuario, claveEnlace);
}

export async function traerCursoPorEnlace(
  claveEnlace: string,
  idUsuario: string | null,
): Promise<DetalleCurso> {
  const curso = await bd.curso.findUnique({
    where: { claveEnlace },
    select: seleccionDetalle(idUsuario),
  });
  if (!curso || !curso.publicado) {
    throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  }
  return mapearDetalleCurso(curso, idUsuario, claveEnlace);
}

type FilaLeccionDetalle = {
  id: string;
  titulo: string;
  modulo: string | null;
  posicion: number;
  progresos?: { aciertos: number; preguntas: number; completadaEn: Date }[];
};

type FilaDetalle = {
  id: string;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  idPortada: string | null;
  idioma: string;
  categoria: string;
  nivel: string;
  etiquetas: string[];
  daInsignia: boolean;
  visibilidad: string;
  claveEnlace: string | null;
  idOrganizacion: string | null;
  tambienPublico: boolean;
  permiteFork: boolean;
  idAutor: string;
  autor: { id: string; name: string };
  organizacion: {
    id: string;
    slug: string;
    nombre: string;
    colorMarca: string | null;
    modoAcceso: string;
  } | null;
  cursoOrigen: { id: string; titulo: string; autor: { name: string } } | null;
  lecciones: FilaLeccionDetalle[];
};

function mapearDetalleCurso(
  curso: FilaDetalle,
  idUsuario: string | null,
  claveEnlace?: string | null,
): DetalleCurso {
  const lecciones = curso.lecciones.map((leccion) => {
    const progresos = leccion.progresos ?? [];
    const primero = progresos[0];
    return {
      id: leccion.id,
      titulo: leccion.titulo,
      modulo: leccion.modulo,
      posicion: leccion.posicion,
      progreso: primero ? aProgresoLeccion(primero) : null,
    };
  });

  const completado =
    idUsuario !== null && lecciones.length > 0 && lecciones.every((l) => l.progreso !== null);

  return {
    id: curso.id,
    titulo: curso.titulo,
    descripcion: curso.descripcion,
    autor: { id: curso.autor.id, nombre: curso.autor.name },
    cantidadLecciones: lecciones.length,
    idPortada: curso.idPortada,
    idioma: curso.idioma as IdiomaCurso,
    categoria: curso.categoria as CategoriaCurso,
    nivel: curso.nivel as NivelCurso,
    etiquetas: curso.etiquetas,
    daInsignia: curso.daInsignia,
    permiteFork: curso.permiteFork,
    completado,
    visibilidad: curso.visibilidad as VisibilidadCurso,
    claveEnlace:
      idUsuario === curso.idAutor || (claveEnlace && claveEnlace === curso.claveEnlace)
        ? curso.claveEnlace
        : null,
    tambienPublico: curso.tambienPublico,
    organizacion: aReferenciaOrg(curso.organizacion),
    cursoOrigen: curso.cursoOrigen
      ? {
          id: curso.cursoOrigen.id,
          titulo: curso.cursoOrigen.titulo,
          nombreAutor: curso.cursoOrigen.autor.name,
        }
      : null,
    lecciones,
  };
}
