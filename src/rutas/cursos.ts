import { Router } from "express";
import {
  requerirSesion,
  sesionOpcional,
  usuarioDe,
  usuarioOpcionalDe,
} from "../middleware/sesion.ts";
import {
  traerCatalogo,
  traerCursoPorEnlace,
  traerCursoPublicado,
} from "../servicios/cursos.ts";
import { traerLeccionPublicada } from "../servicios/lecciones.ts";
import { registrarProgreso } from "../servicios/progreso.ts";
import { crearReporteActividad } from "../servicios/reportes.ts";
import type {
  RespuestaCatalogo,
  RespuestaCurso,
  RespuestaLeccion,
  RespuestaProgresoLeccion,
} from "../tipos/contrato.ts";
import { validarConsultaCatalogo } from "../validacion/catalogo.ts";
import { validarCuerpoProgreso } from "../validacion/progreso.ts";
import { validarReporteActividad } from "../validacion/reportes.ts";

export const rutasCursos = Router();

// Catálogo y búsqueda (spec F02 + decisión 0020): accesible también sin sesión para
// visitantes en cursos públicos u organizaciones abiertas.
rutasCursos.get("/", sesionOpcional, async (req, res) => {
  const consulta = validarConsultaCatalogo(req.query);
  const usuario = usuarioOpcionalDe(res);
  const respuesta: RespuestaCatalogo = await traerCatalogo(consulta, usuario?.id ?? null);
  res.json(respuesta);
});

// Acceso directo a un curso publicado con visibilidad "enlacePrivado".
rutasCursos.get<{ clave: string }>("/enlace/:clave", sesionOpcional, async (req, res) => {
  const usuario = usuarioOpcionalDe(res);
  const respuesta: RespuestaCurso = {
    curso: await traerCursoPorEnlace(req.params.clave, usuario?.id ?? null),
  };
  res.json(respuesta);
});

// Detalle de un curso publicado con sus lecciones y, si hay sesión, el progreso
// de quien pregunta en cada una.
rutasCursos.get<{ idCurso: string }>("/:idCurso", sesionOpcional, async (req, res) => {
  const usuario = usuarioOpcionalDe(res);
  const clave = typeof req.query.clave === "string" ? req.query.clave : null;
  const respuesta: RespuestaCurso = {
    curso: await traerCursoPublicado(req.params.idCurso, usuario?.id ?? null, clave),
  };
  res.json(respuesta);
});

// Una lección para cursarla, con sus actividades (spec F03). Sin sesión solo se
// permite la primera lección como muestra abierta (decisión 0020).
rutasCursos.get<{ idCurso: string; idLeccion: string }>(
  "/:idCurso/lecciones/:idLeccion",
  sesionOpcional,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    const usuario = usuarioOpcionalDe(res);
    const clave = typeof req.query.clave === "string" ? req.query.clave : null;
    const respuesta: RespuestaLeccion = {
      leccion: await traerLeccionPublicada(idCurso, idLeccion, usuario?.id ?? null, clave),
    };
    res.json(respuesta);
  },
);

// Registra (o reemplaza) el resultado de quien llama al completar una lección (spec F04).
rutasCursos.put<{ idCurso: string; idLeccion: string }>(
  "/:idCurso/lecciones/:idLeccion/progreso",
  requerirSesion,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    const cuerpo = validarCuerpoProgreso(req.body);
    const respuesta: RespuestaProgresoLeccion = await registrarProgreso(
      usuarioDe(res).id,
      idCurso,
      idLeccion,
      cuerpo,
    );
    res.json(respuesta);
  },
);

// Reporta un error en una actividad específica para que el autor lo vea en Estudio (F16).
rutasCursos.post<{ idCurso: string; idLeccion: string }>(
  "/:idCurso/lecciones/:idLeccion/reportes",
  requerirSesion,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    const cuerpo = validarReporteActividad(req.body);
    const reporte = await crearReporteActividad(usuarioDe(res).id, idCurso, idLeccion, cuerpo);
    res.status(201).json({ reporte });
  },
);
