import { Router } from "express";
import { requerirSesion, usuarioDe } from "../middleware/sesion.ts";
import {
  crearGrupo,
  traerAvanceGrupo,
  traerGruposDelUsuario,
  unirseAGrupo,
} from "../servicios/grupos.ts";
import type {
  RespuestaAvanceGrupo,
  RespuestaGrupo,
  RespuestaGrupos,
} from "../tipos/contrato.ts";
import { validarCrearGrupo, validarUnirseGrupo } from "../validacion/grupos.ts";

export const rutasGrupos = Router();

rutasGrupos.use(requerirSesion);

rutasGrupos.get("/", async (_req, res) => {
  const respuesta: RespuestaGrupos = {
    grupos: await traerGruposDelUsuario(usuarioDe(res).id),
  };
  res.json(respuesta);
});

rutasGrupos.post("/", async (req, res) => {
  const datos = validarCrearGrupo(req.body);
  const respuesta: RespuestaGrupo = {
    grupo: await crearGrupo(usuarioDe(res).id, datos),
  };
  res.status(201).json(respuesta);
});

rutasGrupos.post("/unirse", async (req, res) => {
  const { codigo } = validarUnirseGrupo(req.body);
  const respuesta: RespuestaGrupo = {
    grupo: await unirseAGrupo(usuarioDe(res).id, codigo),
  };
  res.json(respuesta);
});

rutasGrupos.get<{ idGrupo: string }>("/:idGrupo/avance", async (req, res) => {
  const respuesta: RespuestaAvanceGrupo = await traerAvanceGrupo(
    usuarioDe(res).id,
    req.params.idGrupo,
  );
  res.json(respuesta);
});
