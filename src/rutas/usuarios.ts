import { Router } from "express";
import { requerirSesion, usuarioDe } from "../middleware/sesion.ts";
import { aUsuario } from "../servicios/cuentas.ts";
import { traerCursosEmpezados } from "../servicios/progreso.ts";
import type { RespuestaCursosEmpezados, RespuestaUsuario } from "../tipos/contrato.ts";

export const rutasUsuarios = Router();

// Quién soy: los clientes la llaman al arrancar para saber si la sesión sigue.
rutasUsuarios.get("/yo", requerirSesion, (_req, res) => {
  const respuesta: RespuestaUsuario = { usuario: aUsuario(usuarioDe(res)) };
  res.json(respuesta);
});

// Los cursos que empezó quien llama, con su avance (spec F04: "Mis cursos" y
// "Mi panel"). /yo/cursos queda libre para los cursos de los que es autor (F05).
rutasUsuarios.get("/yo/cursos-empezados", requerirSesion, async (_req, res) => {
  const respuesta: RespuestaCursosEmpezados = {
    cursos: await traerCursosEmpezados(usuarioDe(res).id),
  };
  res.json(respuesta);
});
