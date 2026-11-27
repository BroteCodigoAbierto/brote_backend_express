import { bd } from "../config/bd.ts";
import { ErrorApi } from "../middleware/errores.ts";
import type {
  CategoriaCurso,
  IdiomaCurso,
  NivelCurso,
  PerfilAutor,
  ResumenCurso,
} from "../tipos/contrato.ts";

// Perfil público de un autor con sus cursos visibles y organizaciones públicas.

export async function traerPerfilAutor(
  idAutor: string,
  idUsuarioVisitante: string | null,
): Promise<PerfilAutor> {
  const autor = await bd.user.findUnique({
    where: { id: idAutor },
    select: {
      id: true,
      name: true,
      createdAt: true,
      membresiasOrganizacion: {
        where: { rol: { in: ["dueno", "admin", "docente"] } },
        select: {
          organizacion: {
            select: { id: true, slug: true, nombre: true, colorMarca: true, modoAcceso: true },
          },
        },
      },
      cursos: {
        where: {
          publicado: true,
          OR: [
            { visibilidad: "publico" },
            { visibilidad: "organizacion", tambienPublico: true },
          ],
        },
        orderBy: [{ creadoEn: "desc" }],
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
          organizacion: { select: { id: true, slug: true, nombre: true, colorMarca: true } },
          lecciones: {
            select: {
              id: true,
              ...(idUsuarioVisitante
                ? {
                    progresos: {
                      where: { idUsuario: idUsuarioVisitante },
                      select: { idLeccion: true },
                    },
                  }
                : {}),
            },
          },
        },
      },
    },
  });

  if (!autor) throw new ErrorApi(404, "Este perfil no existe.");

  const cursos: ResumenCurso[] = autor.cursos.map((c) => {
    const completado =
      idUsuarioVisitante !== null &&
      c.lecciones.length > 0 &&
      c.lecciones.every((l) => "progresos" in l && Array.isArray(l.progresos) && l.progresos.length > 0);
    return {
      id: c.id,
      titulo: c.titulo,
      descripcion: c.descripcion,
      autor: { id: autor.id, nombre: autor.name },
      cantidadLecciones: c.lecciones.length,
      idPortada: c.idPortada,
      idioma: c.idioma as IdiomaCurso,
      categoria: c.categoria as CategoriaCurso,
      nivel: c.nivel as NivelCurso,
      daInsignia: c.daInsignia,
      permiteFork: c.permiteFork,
      completado,
      organizacion: c.organizacion,
    };
  });

  return {
    id: autor.id,
    nombre: autor.name,
    creadoEn: autor.createdAt.toISOString(),
    organizaciones: autor.membresiasOrganizacion
      .filter((m) => m.organizacion.modoAcceso === "abierto")
      .map((m) => ({
        id: m.organizacion.id,
        slug: m.organizacion.slug,
        nombre: m.organizacion.nombre,
        colorMarca: m.organizacion.colorMarca,
      })),
    cursos,
  };
}
