import { randomBytes } from "node:crypto";
import { bd } from "../config/bd.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  MENSAJES_CATALOGO,
  MENSAJES_GRUPO,
  type AvanceAlumnoGrupo,
  type CuerpoCrearGrupo,
  type GrupoResumen,
  type RespuestaAvanceGrupo,
} from "../tipos/contrato.ts";
import { puedeVerCursoPublicado } from "./cursos.ts";

// Aulas / Grupos con código y seguimiento de avance (decisión 0020).

function generarCodigoGrupo(): string {
  return `AULA-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function traerGruposDelUsuario(idUsuario: string): Promise<GrupoResumen[]> {
  const [comoDocente, comoAlumno] = await Promise.all([
    bd.grupo.findMany({
      where: { idDocente: idUsuario },
      orderBy: [{ creadoEn: "desc" }],
      select: {
        id: true,
        codigo: true,
        nombre: true,
        idCurso: true,
        curso: { select: { titulo: true, _count: { select: { lecciones: true } } } },
        docente: { select: { name: true } },
        organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
        _count: { select: { miembros: true } },
      },
    }),
    bd.miembroGrupo.findMany({
      where: { idUsuario },
      orderBy: [{ unidoEn: "desc" }],
      select: {
        grupo: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            idCurso: true,
            idDocente: true,
            curso: {
              select: {
                titulo: true,
                lecciones: {
                  select: {
                    id: true,
                    progresos: { where: { idUsuario }, select: { idLeccion: true } },
                  },
                },
              },
            },
            docente: { select: { name: true } },
            organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
            _count: { select: { miembros: true } },
          },
        },
      },
    }),
  ]);

  const idsDocente = new Set(comoDocente.map((g) => g.id));
  const listaDocente: GrupoResumen[] = comoDocente.map((g) => ({
    id: g.id,
    codigo: g.codigo,
    nombre: g.nombre,
    idCurso: g.idCurso,
    tituloCurso: g.curso.titulo,
    nombreDocente: g.docente.name,
    esDocente: true,
    organizacion: g.organizacion,
    cantidadAlumnos: g._count.miembros,
    cantidadLecciones: g.curso._count.lecciones,
  }));

  const listaAlumno: GrupoResumen[] = comoAlumno
    .filter(({ grupo }) => !idsDocente.has(grupo.id))
    .map(({ grupo: g }) => {
      const cantidadLecciones = g.curso.lecciones.length;
      const leccionesCompletadas = g.curso.lecciones.filter((l) => l.progresos.length > 0).length;
      return {
        id: g.id,
        codigo: g.codigo,
        nombre: g.nombre,
        idCurso: g.idCurso,
        tituloCurso: g.curso.titulo,
        nombreDocente: g.docente.name,
        esDocente: false,
        organizacion: g.organizacion,
        cantidadAlumnos: g._count.miembros,
        cantidadLecciones,
        leccionesCompletadas,
      };
    });

  return [...listaDocente, ...listaAlumno];
}

export async function crearGrupo(
  idDocente: string,
  { nombre, idCurso, idOrganizacion }: CuerpoCrearGrupo,
): Promise<GrupoResumen> {
  const curso = await bd.curso.findUnique({
    where: { id: idCurso },
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
      _count: { select: { lecciones: true } },
    },
  });

  if (!curso || !(await puedeVerCursoPublicado(curso, idDocente))) {
    throw new ErrorApi(404, MENSAJES_CATALOGO.cursoNoDisponible);
  }

  const idOrgFinal = idOrganizacion ?? curso.idOrganizacion ?? null;
  const grupo = await bd.grupo.create({
    data: {
      codigo: generarCodigoGrupo(),
      nombre,
      idCurso: curso.id,
      idDocente,
      idOrganizacion: idOrgFinal,
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      idCurso: true,
      docente: { select: { name: true } },
      organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
    },
  });

  return {
    id: grupo.id,
    codigo: grupo.codigo,
    nombre: grupo.nombre,
    idCurso: grupo.idCurso,
    tituloCurso: curso.titulo,
    nombreDocente: grupo.docente.name,
    esDocente: true,
    organizacion: grupo.organizacion,
    cantidadAlumnos: 0,
    cantidadLecciones: curso._count.lecciones,
  };
}

export async function unirseAGrupo(idUsuario: string, codigo: string): Promise<GrupoResumen> {
  const grupo = await bd.grupo.findFirst({
    where: { codigo: { equals: codigo, mode: "insensitive" } },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      idCurso: true,
      idDocente: true,
      curso: {
        select: {
          titulo: true,
          lecciones: {
            select: {
              id: true,
              progresos: { where: { idUsuario }, select: { idLeccion: true } },
            },
          },
        },
      },
      docente: { select: { name: true } },
      organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
    },
  });
  if (!grupo) throw new ErrorApi(404, MENSAJES_GRUPO.codigoInvalido);

  await bd.miembroGrupo.upsert({
    where: { idGrupo_idUsuario: { idGrupo: grupo.id, idUsuario } },
    create: { idGrupo: grupo.id, idUsuario },
    update: {},
  });

  const cantidadAlumnos = await bd.miembroGrupo.count({ where: { idGrupo: grupo.id } });
  const cantidadLecciones = grupo.curso.lecciones.length;
  const leccionesCompletadas = grupo.curso.lecciones.filter((l) => l.progresos.length > 0).length;

  return {
    id: grupo.id,
    codigo: grupo.codigo,
    nombre: grupo.nombre,
    idCurso: grupo.idCurso,
    tituloCurso: grupo.curso.titulo,
    nombreDocente: grupo.docente.name,
    esDocente: grupo.idDocente === idUsuario,
    organizacion: grupo.organizacion,
    cantidadAlumnos,
    cantidadLecciones,
    leccionesCompletadas,
  };
}

export async function traerAvanceGrupo(
  idDocente: string,
  idGrupo: string,
): Promise<RespuestaAvanceGrupo> {
  const grupo = await bd.grupo.findUnique({
    where: { id: idGrupo },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      idCurso: true,
      idDocente: true,
      curso: {
        select: {
          titulo: true,
          lecciones: { select: { id: true } },
        },
      },
      docente: { select: { name: true } },
      organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
      miembros: {
        orderBy: [{ unidoEn: "asc" }],
        select: {
          usuario: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!grupo) throw new ErrorApi(404, MENSAJES_GRUPO.noEncontrado);
  if (grupo.idDocente !== idDocente) throw new ErrorApi(403, MENSAJES_GRUPO.soloDocente);

  const idsLecciones = grupo.curso.lecciones.map((l) => l.id);
  const idsAlumnos = grupo.miembros.map((m) => m.usuario.id);

  const progresos =
    idsLecciones.length > 0 && idsAlumnos.length > 0
      ? await bd.progreso.findMany({
          where: { idLeccion: { in: idsLecciones }, idUsuario: { in: idsAlumnos } },
          select: {
            idUsuario: true,
            aciertos: true,
            preguntas: true,
            completadaEn: true,
          },
        })
      : [];

  const porAlumno = new Map<
    string,
    { lecciones: number; aciertos: number; preguntas: number; ultimo: Date | null }
  >();
  for (const p of progresos) {
    const actual = porAlumno.get(p.idUsuario) ?? {
      lecciones: 0,
      aciertos: 0,
      preguntas: 0,
      ultimo: null,
    };
    actual.lecciones += 1;
    actual.aciertos += p.aciertos;
    actual.preguntas += p.preguntas;
    if (!actual.ultimo || p.completadaEn > actual.ultimo) actual.ultimo = p.completadaEn;
    porAlumno.set(p.idUsuario, actual);
  }

  const totalLecciones = idsLecciones.length;
  const alumnos: AvanceAlumnoGrupo[] = grupo.miembros.map(({ usuario }) => {
    const stats = porAlumno.get(usuario.id);
    return {
      idUsuario: usuario.id,
      nombre: usuario.name,
      correo: usuario.email,
      leccionesCompletadas: stats?.lecciones ?? 0,
      totalLecciones,
      aciertosTotales: stats?.aciertos ?? 0,
      preguntasTotales: stats?.preguntas ?? 0,
      ultimoAvanceEn: stats?.ultimo ? stats.ultimo.toISOString() : null,
    };
  });

  return {
    grupo: {
      id: grupo.id,
      codigo: grupo.codigo,
      nombre: grupo.nombre,
      idCurso: grupo.idCurso,
      tituloCurso: grupo.curso.titulo,
      nombreDocente: grupo.docente.name,
      esDocente: true,
      organizacion: grupo.organizacion,
      cantidadAlumnos: alumnos.length,
      cantidadLecciones: totalLecciones,
    },
    alumnos,
  };
}
