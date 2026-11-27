import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_ORGANIZACION,
  MENSAJES_EDITOR,
  MENSAJES_ORGANIZACION,
  MODOS_ACCESO_ORGANIZACION,
  type CuerpoCrearOrganizacion,
  type CuerpoUnirseOrganizacion,
  type ModoAccesoOrganizacion,
} from "../tipos/contrato.ts";

const PATRON_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATRON_COLOR = /^#[0-9a-fA-F]{6}$/;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function largo(texto: string): number {
  return Array.from(texto).length;
}

export function validarCrearOrganizacion(cuerpo: unknown): CuerpoCrearOrganizacion {
  if (!esObjeto(cuerpo)) throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);

  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  const slug = typeof cuerpo.slug === "string" ? cuerpo.slug.trim().toLowerCase() : "";
  const descripcion = typeof cuerpo.descripcion === "string" ? cuerpo.descripcion.trim() : "";

  const errores: Record<string, string> = {};
  if (!nombre) errores.nombre = MENSAJES_EDITOR.campoObligatorio;
  else if (largo(nombre) > LIMITES_ORGANIZACION.nombreMax) errores.nombre = MENSAJES_EDITOR.textoLargo;

  if (!slug || slug.length < 3 || slug.length > LIMITES_ORGANIZACION.slugMax || !PATRON_SLUG.test(slug)) {
    errores.slug = MENSAJES_ORGANIZACION.slugInvalido;
  }

  if (largo(descripcion) > LIMITES_ORGANIZACION.descripcionMax) {
    errores.descripcion = MENSAJES_EDITOR.textoLargo;
  }

  let colorMarca: string | null = null;
  if ("colorMarca" in cuerpo && cuerpo.colorMarca !== undefined && cuerpo.colorMarca !== null && cuerpo.colorMarca !== "") {
    if (typeof cuerpo.colorMarca === "string" && PATRON_COLOR.test(cuerpo.colorMarca.trim())) {
      colorMarca = cuerpo.colorMarca.trim();
    } else {
      errores.colorMarca = MENSAJES_EDITOR.datosInvalidos;
    }
  }

  let modoAcceso: ModoAccesoOrganizacion = "codigo";
  if ("modoAcceso" in cuerpo && cuerpo.modoAcceso !== undefined) {
    if ((MODOS_ACCESO_ORGANIZACION as readonly unknown[]).includes(cuerpo.modoAcceso)) {
      modoAcceso = cuerpo.modoAcceso as ModoAccesoOrganizacion;
    } else {
      errores.modoAcceso = MENSAJES_EDITOR.datosInvalidos;
    }
  }

  let dominiosPermitidos: string[] = [];
  if ("dominiosPermitidos" in cuerpo && cuerpo.dominiosPermitidos !== undefined) {
    if (!Array.isArray(cuerpo.dominiosPermitidos)) {
      errores.dominiosPermitidos = MENSAJES_EDITOR.datosInvalidos;
    } else {
      dominiosPermitidos = cuerpo.dominiosPermitidos
        .filter((d): d is string => typeof d === "string")
        .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
        .filter((d) => d.includes(".") && !d.includes(" "));
    }
  }

  const requiereRevision = typeof cuerpo.requiereRevision === "boolean" ? cuerpo.requiereRevision : false;

  if (Object.keys(errores).length > 0) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, errores);
  }

  return {
    nombre,
    slug,
    descripcion,
    colorMarca,
    modoAcceso,
    dominiosPermitidos,
    requiereRevision,
  };
}

export function validarUnirseOrganizacion(cuerpo: unknown): CuerpoUnirseOrganizacion {
  if (!esObjeto(cuerpo)) throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  const codigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo.trim().toUpperCase() : "";
  if (!codigo || largo(codigo) > LIMITES_ORGANIZACION.codigoMax) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      codigo: MENSAJES_EDITOR.campoObligatorio,
    });
  }
  return { codigo };
}
