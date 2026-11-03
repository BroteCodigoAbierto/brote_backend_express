import { Router } from "express";
import { requerirSesion, usuarioDe } from "../middleware/sesion.ts";
import { traerCatalogo, traerCursoPublicado } from "../servicios/cursos.ts";
import { traerLeccionPublicada } from "../servicios/lecciones.ts";
import { registrarProgreso } from "../servicios/progreso.ts";
import type {
  RespuestaCatalogo,
  RespuestaCurso,
  RespuestaLeccion,
  RespuestaProgresoLeccion,
} from "../tipos/contrato.ts";
import { validarConsultaCatalogo } from "../validacion/catalogo.ts";
import { validarCuerpoProgreso } from "../validacion/progreso.ts";

export const rutasCursos = Router();

// La sesión va antes que la validación: sin sesión es 401 aunque los
// parámetros estén mal.

// Catálogo y búsqueda, de 10 en 10 (spec F02).
rutasCursos.get("/", requerirSesion, async (req, res) => {
  const consulta = validarConsultaCatalogo(req.query);
  const respuesta: RespuestaCatalogo = await traerCatalogo(consulta);
  res.json(respuesta);
});

// Detalle de un curso publicado con sus lecciones y, desde F04, el progreso
// de quien pregunta en cada una.
rutasCursos.get<{ idCurso: string }>("/:idCurso", requerirSesion, async (req, res) => {
  const respuesta: RespuestaCurso = {
    curso: await traerCursoPublicado(req.params.idCurso, usuarioDe(res).id),
  };
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

// Registra (o reemplaza) el resultado de quien llama al completar una lección
// (spec F04). El alumno sale siempre de la sesión. Orden: sesión (401), forma
// del cuerpo (400), lección (404) y coherencia con la lección (400).
rutasCursos.put<{ idCurso: string; idLeccion: string }>(
  "/:idCurso/lecciones/:idLeccion/progreso",
  requerirSesion,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    const cuerpo = validarCuerpoProgreso(req.body);
    const respuesta: RespuestaProgresoLeccion = {
      progreso: await registrarProgreso(usuarioDe(res).id, idCurso, idLeccion, cuerpo),
    };
    res.json(respuesta);
  },
);
