import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_GRUPO,
  MENSAJES_EDITOR,
  type CuerpoCrearGrupo,
  type CuerpoUnirseGrupo,
} from "../tipos/contrato.ts";

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function largo(texto: string): number {
  return Array.from(texto).length;
}

export function validarCrearGrupo(cuerpo: unknown): CuerpoCrearGrupo {
  if (!esObjeto(cuerpo)) throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  const idCurso = typeof cuerpo.idCurso === "string" ? cuerpo.idCurso.trim() : "";

  const errores: Record<string, string> = {};
  if (!nombre) errores.nombre = MENSAJES_EDITOR.campoObligatorio;
  else if (largo(nombre) > LIMITES_GRUPO.nombreMax) errores.nombre = MENSAJES_EDITOR.textoLargo;

  if (!idCurso) errores.idCurso = MENSAJES_EDITOR.campoObligatorio;

  let idOrganizacion: string | null | undefined;
  if ("idOrganizacion" in cuerpo) {
    if (cuerpo.idOrganizacion === null) idOrganizacion = null;
    else if (typeof cuerpo.idOrganizacion === "string" && cuerpo.idOrganizacion.trim() !== "") {
      idOrganizacion = cuerpo.idOrganizacion.trim();
    } else {
      errores.idOrganizacion = MENSAJES_EDITOR.datosInvalidos;
    }
  }

  if (Object.keys(errores).length > 0) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, errores);
  }
  return {
    nombre,
    idCurso,
    ...(idOrganizacion !== undefined && { idOrganizacion }),
  };
}

export function validarUnirseGrupo(cuerpo: unknown): CuerpoUnirseGrupo {
  if (!esObjeto(cuerpo)) throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos);
  const codigo = typeof cuerpo.codigo === "string" ? cuerpo.codigo.trim().toUpperCase() : "";
  if (!codigo || largo(codigo) > LIMITES_GRUPO.codigoMax) {
    throw new ErrorApi(400, MENSAJES_EDITOR.datosInvalidos, {
      codigo: MENSAJES_EDITOR.campoObligatorio,
    });
  }
  return { codigo };
}
