import { Router } from "express";
import {
  requerirSesion,
  sesionOpcional,
  usuarioDe,
  usuarioOpcionalDe,
} from "../middleware/sesion.ts";
import {
  crearOrganizacion,
  traerMisOrganizaciones,
  traerOrganizacionPorSlug,
  unirseAOrganizacion,
} from "../servicios/organizaciones.ts";
import type {
  RespuestaOrganizacion,
  RespuestaOrganizacionPublica,
  RespuestaOrganizaciones,
} from "../tipos/contrato.ts";
import {
  validarCrearOrganizacion,
  validarUnirseOrganizacion,
} from "../validacion/organizaciones.ts";

export const rutasOrganizaciones = Router();

rutasOrganizaciones.get("/mias", requerirSesion, async (_req, res) => {
  const respuesta: RespuestaOrganizaciones = {
    organizaciones: await traerMisOrganizaciones(usuarioDe(res).id),
  };
  res.json(respuesta);
});

rutasOrganizaciones.post("/", requerirSesion, async (req, res) => {
  const datos = validarCrearOrganizacion(req.body);
  const respuesta: RespuestaOrganizacion = {
    organizacion: await crearOrganizacion(usuarioDe(res).id, datos),
  };
  res.status(201).json(respuesta);
});

rutasOrganizaciones.post("/unirse", requerirSesion, async (req, res) => {
  const { codigo } = validarUnirseOrganizacion(req.body);
  const usuario = usuarioDe(res);
  const respuesta: RespuestaOrganizacion = {
    organizacion: await unirseAOrganizacion(usuario.id, usuario.email, codigo),
  };
  res.json(respuesta);
});

rutasOrganizaciones.get<{ slug: string }>("/:slug", sesionOpcional, async (req, res) => {
  const usuario = usuarioOpcionalDe(res);
  const respuesta: RespuestaOrganizacionPublica = await traerOrganizacionPorSlug(
    req.params.slug,
    usuario?.id ?? null,
  );
  res.json(respuesta);
});
