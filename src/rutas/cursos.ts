import { Router } from "express";
import { requerirSesion } from "../middleware/sesion.ts";
import { traerCatalogo, traerCursoPublicado } from "../servicios/cursos.ts";
import { traerLeccionPublicada } from "../servicios/lecciones.ts";
import type { RespuestaCatalogo, RespuestaCurso, RespuestaLeccion } from "../tipos/contrato.ts";
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

// Una lección para cursarla, con sus actividades (spec F03). Los
// identificadores no se validan: uno que no existe es un 404 como cualquier otro.
rutasCursos.get<{ idCurso: string; idLeccion: string }>(
  "/:idCurso/lecciones/:idLeccion",
  requerirSesion,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    const respuesta: RespuestaLeccion = {
      leccion: await traerLeccionPublicada(idCurso, idLeccion),
    };
    res.json(respuesta);
  },
);
