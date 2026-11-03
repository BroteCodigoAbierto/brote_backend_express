import { Router } from "express";
import { requerirSesion } from "../middleware/sesion.ts";
import { traerCatalogo, traerCursoPublicado } from "../servicios/cursos.ts";
import type { RespuestaCatalogo, RespuestaCurso } from "../tipos/contrato.ts";
import { validarConsultaCatalogo } from "../validacion/catalogo.ts";

export const rutasCursos = Router();

// La sesión va antes que la validación: sin sesión es 401 aunque los
// parámetros estén mal.

// Catálogo y búsqueda, de 10 en 10 (spec F02).
rutasCursos.get("/", requerirSesion, async (req, res) => {
  const consulta = validarConsultaCatalogo(req.query);
  const respuesta: RespuestaCatalogo = await traerCatalogo(consulta);
  res.json(respuesta);
});

// Detalle de un curso publicado con sus lecciones.
rutasCursos.get<{ idCurso: string }>("/:idCurso", requerirSesion, async (req, res) => {
  const respuesta: RespuestaCurso = { curso: await traerCursoPublicado(req.params.idCurso) };
  res.json(respuesta);
});
