import { Router } from "express";
import { sesionOpcional, usuarioOpcionalDe } from "../middleware/sesion.ts";
import { traerPerfilAutor } from "../servicios/autores.ts";
import type { RespuestaPerfilAutor } from "../tipos/contrato.ts";

export const rutasAutores = Router();

rutasAutores.get<{ idAutor: string }>("/:idAutor", sesionOpcional, async (req, res) => {
  const usuario = usuarioOpcionalDe(res);
  const respuesta: RespuestaPerfilAutor = {
    autor: await traerPerfilAutor(req.params.idAutor, usuario?.id ?? null),
  };
  res.json(respuesta);
});
