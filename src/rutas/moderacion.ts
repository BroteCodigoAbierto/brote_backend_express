import { Router } from "express";
import { ErrorApi } from "../middleware/errores.ts";
import { esAdministrador, requerirSesion, usuarioDe } from "../middleware/sesion.ts";
import {
  aprobarCurso,
  idsOrganizacionesAdministradas,
  rechazarCurso,
  traerCursoEnModeracion,
  traerCursosEnRevision,
} from "../servicios/moderacion.ts";
import {
  MENSAJES_MODERACION,
  type RespuestaCursoEnModeracion,
  type RespuestaCursosEnRevision,
} from "../tipos/contrato.ts";
import { validarCuerpoRechazo } from "../validacion/moderacion.ts";

// Moderación (decisiones 0018 y 0020): administradores globales de la instancia o
// administradores delegados ("dueno" / "admin") de alguna organización.
export const rutasModeracion = Router();

type ParamsCurso = { idCurso: string };

rutasModeracion.use(requerirSesion);

rutasModeracion.get("/cursos", async (_req, res) => {
  const usuario = usuarioDe(res);
  const adminGlobal = esAdministrador(usuario);
  if (!adminGlobal) {
    const idsOrg = await idsOrganizacionesAdministradas(usuario.id);
    if (idsOrg.length === 0) {
      throw new ErrorApi(403, MENSAJES_MODERACION.soloAdministradores);
    }
  }
  const respuesta: RespuestaCursosEnRevision = {
    cursos: await traerCursosEnRevision(adminGlobal, usuario.id),
  };
  res.json(respuesta);
});

// Para probarlo: probar no registra progreso.
rutasModeracion.get<ParamsCurso>("/cursos/:idCurso", async (req, res) => {
  const usuario = usuarioDe(res);
  const respuesta: RespuestaCursoEnModeracion = {
    curso: await traerCursoEnModeracion(req.params.idCurso, esAdministrador(usuario), usuario.id),
  };
  res.json(respuesta);
});

rutasModeracion.post<ParamsCurso>("/cursos/:idCurso/aprobacion", async (req, res) => {
  const usuario = usuarioDe(res);
  await aprobarCurso(req.params.idCurso, esAdministrador(usuario), usuario.id);
  res.sendStatus(204);
});

rutasModeracion.post<ParamsCurso>("/cursos/:idCurso/rechazo", async (req, res) => {
  const usuario = usuarioDe(res);
  const motivo = validarCuerpoRechazo(req.body);
  await rechazarCurso(req.params.idCurso, motivo, esAdministrador(usuario), usuario.id);
  res.sendStatus(204);
});
