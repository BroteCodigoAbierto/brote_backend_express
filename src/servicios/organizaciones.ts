import { randomBytes } from "node:crypto";
import { bd } from "../config/bd.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  MENSAJES_ORGANIZACION,
  type CuerpoCrearOrganizacion,
  type ModoAccesoOrganizacion,
  type OrganizacionPropia,
  type OrganizacionPublica,
  type RolOrganizacion,
} from "../tipos/contrato.ts";

// Silos opcionales: organizaciones / espacios institucionales (decisión 0020).

function generarCodigoAcceso(slug: string): string {
  const prefijo = slug
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(3, "B");
  const sufijo = randomBytes(3).toString("hex").toUpperCase();
  return `${prefijo}-${sufijo}`;
}

export async function traerMisOrganizaciones(idUsuario: string): Promise<OrganizacionPropia[]> {
  const filas = await bd.miembroOrganizacion.findMany({
    where: { idUsuario },
    orderBy: [{ unidoEn: "asc" }],
    select: {
      rol: true,
      organizacion: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          descripcion: true,
          colorMarca: true,
          modoAcceso: true,
          codigoAcceso: true,
          dominiosPermitidos: true,
          requiereRevision: true,
          _count: {
            select: {
              miembros: true,
              cursos: { where: { publicado: true } },
            },
          },
        },
      },
    },
  });

  return filas.map(({ rol, organizacion: o }) => {
    const puedeVerCodigo = rol === "dueno" || rol === "admin" || rol === "docente";
    return {
      id: o.id,
      slug: o.slug,
      nombre: o.nombre,
      descripcion: o.descripcion,
      colorMarca: o.colorMarca,
      modoAcceso: o.modoAcceso as ModoAccesoOrganizacion,
      cantidadMiembros: o._count.miembros,
      cantidadCursos: o._count.cursos,
      rol: rol as RolOrganizacion,
      codigoAcceso: puedeVerCodigo ? o.codigoAcceso : null,
      dominiosPermitidos: o.dominiosPermitidos,
      requiereRevision: o.requiereRevision,
    };
  });
}

export async function crearOrganizacion(
  idUsuario: string,
  datos: CuerpoCrearOrganizacion,
): Promise<OrganizacionPropia> {
  const existente = await bd.organizacion.findUnique({
    where: { slug: datos.slug },
    select: { id: true },
  });
  if (existente) {
    throw new ErrorApi(409, MENSAJES_ORGANIZACION.slugOcupado, {
      slug: MENSAJES_ORGANIZACION.slugOcupado,
    });
  }

  const codigoAcceso = generarCodigoAcceso(datos.slug);
  const org = await bd.organizacion.create({
    data: {
      slug: datos.slug,
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? "",
      colorMarca: datos.colorMarca ?? null,
      modoAcceso: datos.modoAcceso ?? "codigo",
      codigoAcceso,
      dominiosPermitidos: datos.dominiosPermitidos ?? [],
      requiereRevision: datos.requiereRevision ?? false,
      miembros: {
        create: { idUsuario, rol: "dueno" },
      },
    },
    select: {
      id: true,
      slug: true,
      nombre: true,
      descripcion: true,
      colorMarca: true,
      modoAcceso: true,
      codigoAcceso: true,
      dominiosPermitidos: true,
      requiereRevision: true,
    },
  });

  return {
    id: org.id,
    slug: org.slug,
    nombre: org.nombre,
    descripcion: org.descripcion,
    colorMarca: org.colorMarca,
    modoAcceso: org.modoAcceso as ModoAccesoOrganizacion,
    cantidadMiembros: 1,
    cantidadCursos: 0,
    rol: "dueno",
    codigoAcceso: org.codigoAcceso,
    dominiosPermitidos: org.dominiosPermitidos,
    requiereRevision: org.requiereRevision,
  };
}

export async function unirseAOrganizacion(
  idUsuario: string,
  correoUsuario: string,
  codigo: string,
): Promise<OrganizacionPropia> {
  const org = await bd.organizacion.findFirst({
    where: {
      OR: [
        { codigoAcceso: { equals: codigo, mode: "insensitive" } },
        { slug: codigo.toLowerCase() },
      ],
    },
    select: {
      id: true,
      slug: true,
      nombre: true,
      descripcion: true,
      colorMarca: true,
      modoAcceso: true,
      codigoAcceso: true,
      dominiosPermitidos: true,
      requiereRevision: true,
      _count: { select: { miembros: true, cursos: { where: { publicado: true } } } },
    },
  });

  if (!org) throw new ErrorApi(404, MENSAJES_ORGANIZACION.codigoInvalido);

  // Si buscó por slug y no es abierto, exige coincidencia exacta del código de acceso.
  if (
    org.modoAcceso !== "abierto" &&
    (!org.codigoAcceso || org.codigoAcceso.toUpperCase() !== codigo.toUpperCase())
  ) {
    throw new ErrorApi(404, MENSAJES_ORGANIZACION.codigoInvalido);
  }

  if (org.modoAcceso === "dominio" && org.dominiosPermitidos.length > 0) {
    const dominio = correoUsuario.split("@")[1]?.toLowerCase() ?? "";
    if (!org.dominiosPermitidos.includes(dominio)) {
      throw new ErrorApi(403, MENSAJES_ORGANIZACION.dominioNoPermitido);
    }
  }

  const membresia = await bd.miembroOrganizacion.upsert({
    where: { idOrganizacion_idUsuario: { idOrganizacion: org.id, idUsuario } },
    create: { idOrganizacion: org.id, idUsuario, rol: "alumno" },
    update: {},
    select: { rol: true },
  });

  const cantidadMiembros = await bd.miembroOrganizacion.count({
    where: { idOrganizacion: org.id },
  });
  const puedeVerCodigo =
    membresia.rol === "dueno" || membresia.rol === "admin" || membresia.rol === "docente";

  return {
    id: org.id,
    slug: org.slug,
    nombre: org.nombre,
    descripcion: org.descripcion,
    colorMarca: org.colorMarca,
    modoAcceso: org.modoAcceso as ModoAccesoOrganizacion,
    cantidadMiembros,
    cantidadCursos: org._count.cursos,
    rol: membresia.rol as RolOrganizacion,
    codigoAcceso: puedeVerCodigo ? org.codigoAcceso : null,
    dominiosPermitidos: org.dominiosPermitidos,
    requiereRevision: org.requiereRevision,
  };
}

export async function traerOrganizacionPorSlug(
  slug: string,
  idUsuario: string | null,
): Promise<{ organizacion: OrganizacionPublica; miRol: RolOrganizacion | null }> {
  const org = await bd.organizacion.findUnique({
    where: { slug: slug.toLowerCase() },
    select: {
      id: true,
      slug: true,
      nombre: true,
      descripcion: true,
      colorMarca: true,
      modoAcceso: true,
      _count: { select: { miembros: true, cursos: { where: { publicado: true } } } },
    },
  });
  if (!org) throw new ErrorApi(404, MENSAJES_ORGANIZACION.noEncontrada);

  let miRol: RolOrganizacion | null = null;
  if (idUsuario) {
    const miembro = await bd.miembroOrganizacion.findUnique({
      where: { idOrganizacion_idUsuario: { idOrganizacion: org.id, idUsuario } },
      select: { rol: true },
    });
    miRol = (miembro?.rol as RolOrganizacion | undefined) ?? null;
  }

  if (org.modoAcceso !== "abierto" && !miRol) {
    throw new ErrorApi(404, MENSAJES_ORGANIZACION.noEncontrada);
  }

  return {
    organizacion: {
      id: org.id,
      slug: org.slug,
      nombre: org.nombre,
      descripcion: org.descripcion,
      colorMarca: org.colorMarca,
      modoAcceso: org.modoAcceso as ModoAccesoOrganizacion,
      cantidadMiembros: org._count.miembros,
      cantidadCursos: org._count.cursos,
    },
    miRol,
  };
}
