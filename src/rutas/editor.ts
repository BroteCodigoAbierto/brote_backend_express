import express, { Router, type NextFunction, type Request, type Response } from "express";
import { ErrorApi } from "../middleware/errores.ts";
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
import { subirAudio } from "../servicios/audios.ts";
import { subirImagen } from "../servicios/imagenes.ts";
import {
  LIMITES_AUDIOS,
  LIMITES_IMAGENES,
  MENSAJES_AUDIOS,
  MENSAJES_IMAGENES,
  TIPO_MIME_IMAGEN,
  TIPOS_MIME_AUDIO_SUBIDA,
  type RespuestaAudio,
  type RespuestaCursoEnEditor,
  type RespuestaImagen,
  type RespuestaLeccionEnEditor,
  type RespuestaLeccionEnMapa,
} from "../tipos/contrato.ts";
import {
  validarCuerpoLeccion,
  validarDatosCurso,
  validarNuevaLeccion,
  validarOrdenLecciones,
} from "../validacion/editor.ts";
import { comprobarAudioSubido } from "../validacion/audios.ts";
import { comprobarImagenSubida } from "../validacion/imagenes.ts";

// El editor de cursos (spec F05). Va aparte de /cursos, que solo entrega cursos
// publicados a cualquiera (brote_specs, research de F05, punto 1). El autor sale
// siempre de la sesión. Orden: sesión (401), cuerpo (400), curso (404 o 403),
// lección (404) y versión (409). Enviar y retirar (F06) no llevan cuerpo: sesión
// (401), curso (404), estado (409) y contenido (400). Subir una imagen (F13): sesión
// (401), tamaño (413), formato (400), curso (404 o 403) y espacio (400). Subir un audio
// (F14): sesión (401), tamaño (413), formato, lectura y duración (400), curso (404 o 403) y
// espacio (400). Los identificadores no se validan: uno que no existe es un 404 como
// cualquier otro.
export const rutasEditor = Router();

type ParamsCurso = { idCurso: string };

// El archivo crudo, solo en las rutas de subir (brote_specs, research de F13, punto 2, y de
// F14, punto 2). Un cuerpo de más de `limite` es un 413 con su mensaje, para no confundirlo
// con el límite del JSON. Un Content-Type que no es de `tipos` deja el cuerpo sin leer, y la
// validación responde que el formato no es válido.
function lectorDeArchivo(tipos: readonly string[], limite: number, mensaje413: string) {
  const lector = express.raw({ type: [...tipos], limit: limite });
  return function leerArchivo(req: Request, res: Response, siguiente: NextFunction) {
    lector(req, res, (error?: unknown) => {
      if ((error as { type?: unknown } | undefined)?.type === "entity.too.large") {
        siguiente(new ErrorApi(413, mensaje413));
        return;
      }
      siguiente(error);
    });
  };
}

const leerImagen = lectorDeArchivo(
  Object.values(TIPO_MIME_IMAGEN),
  LIMITES_IMAGENES.pesoMax,
  MENSAJES_IMAGENES.imagenPesada,
);

const leerAudio = lectorDeArchivo(
  TIPOS_MIME_AUDIO_SUBIDA,
  LIMITES_AUDIOS.pesoMax,
  MENSAJES_AUDIOS.audioPesado,
);

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

rutasEditor.post<ParamsCurso>(
  "/cursos/:idCurso/imagenes",
  requerirSesion,
  leerImagen,
  async (req, res) => {
    const archivo = comprobarImagenSubida(req.body, req.get("Content-Type"));
    const { imagen, nueva } = await subirImagen(usuarioDe(res).id, req.params.idCurso, archivo);
    const respuesta: RespuestaImagen = { imagen };
    res.status(nueva ? 201 : 200).json(respuesta);
  },
);

// F14: el mismo audio (ya limpio) otra vez responde 200 con el que había.
rutasEditor.post<ParamsCurso>(
  "/cursos/:idCurso/audios",
  requerirSesion,
  leerAudio,
  async (req, res) => {
    const archivo = comprobarAudioSubido(req.body, req.get("Content-Type"));
    const { audio, nuevo } = await subirAudio(usuarioDe(res).id, req.params.idCurso, archivo);
    const respuesta: RespuestaAudio = { audio };
    res.status(nuevo ? 201 : 200).json(respuesta);
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
