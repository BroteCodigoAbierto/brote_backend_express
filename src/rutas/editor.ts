import { Router } from "express";
import { requerirSesion, usuarioDe } from "../middleware/sesion.ts";
import {
  actualizarCurso,
  borrarCurso,
  borrarLeccion,
  crearCurso,
  crearLeccion,
  enviarARevision,
  guardarLeccion,
  ordenarLecciones,
  retirarDelCatalogo,
  retirarDeRevision,
  traerCursoEnEditor,
  traerLeccionEnEditor,
} from "../servicios/editor.ts";
import type {
  RespuestaCursoEnEditor,
  RespuestaLeccionEnEditor,
  RespuestaLeccionEnMapa,
} from "../tipos/contrato.ts";
import {
  validarCuerpoLeccion,
  validarDatosCurso,
  validarNuevaLeccion,
  validarOrdenLecciones,
} from "../validacion/editor.ts";

// El editor de cursos (spec F05). Va aparte de /cursos, que solo entrega cursos
// publicados a cualquiera (brote_specs, research de F05, punto 1). El autor sale
// siempre de la sesión. Orden: sesión (401), cuerpo (400), curso (404 o 403),
// lección (404) y versión (409). Enviar y retirar (F06) no llevan cuerpo: sesión
// (401), curso (404), estado (409) y contenido (400). Los identificadores no se
// validan: uno que no existe es un 404 como cualquier otro.
export const rutasEditor = Router();

type ParamsCurso = { idCurso: string };
type ParamsLeccion = ParamsCurso & { idLeccion: string };

rutasEditor.post("/cursos", requerirSesion, async (req, res) => {
  const datos = validarDatosCurso(req.body);
  const respuesta: RespuestaCursoEnEditor = {
    curso: await crearCurso(usuarioDe(res).id, datos),
  };
  res.status(201).json(respuesta);
});

rutasEditor.get<ParamsCurso>("/cursos/:idCurso", requerirSesion, async (req, res) => {
  const respuesta: RespuestaCursoEnEditor = {
    curso: await traerCursoEnEditor(usuarioDe(res).id, req.params.idCurso),
  };
  res.json(respuesta);
});

rutasEditor.put<ParamsCurso>("/cursos/:idCurso", requerirSesion, async (req, res) => {
  const datos = validarDatosCurso(req.body);
  const respuesta: RespuestaCursoEnEditor = {
    curso: await actualizarCurso(usuarioDe(res).id, req.params.idCurso, datos),
  };
  res.json(respuesta);
});

rutasEditor.delete<ParamsCurso>("/cursos/:idCurso", requerirSesion, async (req, res) => {
  await borrarCurso(usuarioDe(res).id, req.params.idCurso);
  res.status(204).end();
});

rutasEditor.post<ParamsCurso>("/cursos/:idCurso/revision", requerirSesion, async (req, res) => {
  const respuesta: RespuestaCursoEnEditor = {
    curso: await enviarARevision(usuarioDe(res).id, req.params.idCurso),
  };
  res.json(respuesta);
});

rutasEditor.delete<ParamsCurso>("/cursos/:idCurso/revision", requerirSesion, async (req, res) => {
  const respuesta: RespuestaCursoEnEditor = {
    curso: await retirarDeRevision(usuarioDe(res).id, req.params.idCurso),
  };
  res.json(respuesta);
});

// No hay POST: el autor no puede publicar (decisión 0014).
rutasEditor.delete<ParamsCurso>(
  "/cursos/:idCurso/publicacion",
  requerirSesion,
  async (req, res) => {
    const respuesta: RespuestaCursoEnEditor = {
      curso: await retirarDelCatalogo(usuarioDe(res).id, req.params.idCurso),
    };
    res.json(respuesta);
  },
);

rutasEditor.post<ParamsCurso>("/cursos/:idCurso/lecciones", requerirSesion, async (req, res) => {
  const cuerpo = validarNuevaLeccion(req.body);
  const respuesta: RespuestaLeccionEnMapa = {
    leccion: await crearLeccion(usuarioDe(res).id, req.params.idCurso, cuerpo),
  };
  res.status(201).json(respuesta);
});

// No cuelga de /lecciones/ para no confundirse con /lecciones/:idLeccion.
rutasEditor.put<ParamsCurso>(
  "/cursos/:idCurso/lecciones-orden",
  requerirSesion,
  async (req, res) => {
    const { idsLecciones } = validarOrdenLecciones(req.body);
    const respuesta: RespuestaCursoEnEditor = {
      curso: await ordenarLecciones(usuarioDe(res).id, req.params.idCurso, idsLecciones),
    };
    res.json(respuesta);
  },
);

rutasEditor.get<ParamsLeccion>(
  "/cursos/:idCurso/lecciones/:idLeccion",
  requerirSesion,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    const respuesta: RespuestaLeccionEnEditor = {
      leccion: await traerLeccionEnEditor(usuarioDe(res).id, idCurso, idLeccion),
    };
    res.json(respuesta);
  },
);

rutasEditor.put<ParamsLeccion>(
  "/cursos/:idCurso/lecciones/:idLeccion",
  requerirSesion,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    const cuerpo = validarCuerpoLeccion(req.body);
    const respuesta: RespuestaLeccionEnEditor = {
      leccion: await guardarLeccion(usuarioDe(res).id, idCurso, idLeccion, cuerpo),
    };
    res.json(respuesta);
  },
);

rutasEditor.delete<ParamsLeccion>(
  "/cursos/:idCurso/lecciones/:idLeccion",
  requerirSesion,
  async (req, res) => {
    const { idCurso, idLeccion } = req.params;
    await borrarLeccion(usuarioDe(res).id, idCurso, idLeccion);
    res.status(204).end();
  },
);
