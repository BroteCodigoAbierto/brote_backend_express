import { Router } from "express";
import { requerirAdministrador, requerirSesion } from "../middleware/sesion.ts";
import {
  aprobarCurso,
  rechazarCurso,
  traerCursoEnModeracion,
  traerCursosEnRevision,
} from "../servicios/moderacion.ts";
import type { RespuestaCursoEnModeracion, RespuestaCursosEnRevision } from "../tipos/contrato.ts";
import { validarCuerpoRechazo } from "../validacion/moderacion.ts";

// Moderación (decisión 0018): solo administradores. Orden: sesión (401),
// administrador (403), cuerpo (400), curso (404) y estado (409).
export const rutasModeracion = Router();

type ParamsCurso = { idCurso: string };

rutasModeracion.use(requerirSesion, requerirAdministrador);

rutasModeracion.get("/cursos", async (_req, res) => {
  const respuesta: RespuestaCursosEnRevision = { cursos: await traerCursosEnRevision() };
  res.json(respuesta);
});

// Para probarlo: probar no registra progreso.
rutasModeracion.get<ParamsCurso>("/cursos/:idCurso", async (req, res) => {
  const respuesta: RespuestaCursoEnModeracion = {
    curso: await traerCursoEnModeracion(req.params.idCurso),
  };
  res.json(respuesta);
});

rutasModeracion.post<ParamsCurso>("/cursos/:idCurso/aprobacion", async (req, res) => {
  await aprobarCurso(req.params.idCurso);
  res.sendStatus(204);
});

rutasModeracion.post<ParamsCurso>("/cursos/:idCurso/rechazo", async (req, res) => {
  const motivo = validarCuerpoRechazo(req.body);
  await rechazarCurso(req.params.idCurso, motivo);
  res.sendStatus(204);
});
