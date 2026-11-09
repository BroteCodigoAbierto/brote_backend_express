import { createHash } from "node:crypto";
import { bd } from "../config/bd.ts";
import { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_ARCHIVOS,
  MENSAJES_ARCHIVOS,
  MENSAJES_AUDIOS,
  type Audio,
  type FormatoAudio,
} from "../tipos/contrato.ts";
import type { AudioSubido } from "../validacion/audios.ts";
import { limpiarArchivosSinUsar, pesoArchivosCurso } from "./archivos.ts";
import { conCursoEditable } from "./editor.ts";

// Los audios de los cursos (spec F14; brote_specs, research de F14, puntos 1, 6 y 7), con las
// reglas de las imágenes de F13. Los bytes viven en la tabla `audio` (decisión 0017): ninguna
// consulta de aquí los pide, salvo traerAudio. Un audio se usa si está en `leccion.audios` de
// su curso; lo que se deja de usar se borra al guardar, y lo que nunca se usó, al día
// siguiente.

type Transaccion = Prisma.TransactionClient;

export const seleccionAudio = {
  id: true,
  formato: true,
  duracion: true,
  peso: true,
} satisfies Prisma.AudioSelect;

type FilaAudio = Prisma.AudioGetPayload<{ select: typeof seleccionAudio }>;

// `formato` es texto en la base, pero el CHECK de la migración solo deja los tres.
export function aAudio(fila: FilaAudio): Audio {
  return { ...fila, formato: fila.formato as FormatoAudio };
}

// Los de esa lista que son de ese curso: un audio de otro curso cuenta como que no está.
export async function audiosDelCurso(
  tx: Transaccion,
  idCurso: string,
  ids: string[],
): Promise<Audio[]> {
  if (ids.length === 0) return [];
  const filas = await tx.audio.findMany({
    where: { idCurso, id: { in: ids } },
    select: seleccionAudio,
  });
  return filas.map(aAudio);
}

// Borra, de esa lista, los que ya no usa ninguna lección del curso. La llaman guardar y
// eliminar una lección, después de escribir.
export async function borrarAudiosSinUso(tx: Transaccion, idCurso: string, ids: string[]) {
  if (ids.length === 0) return;
  const filas = await tx.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT unnest(audios) AS id FROM leccion WHERE id_curso = ${idCurso}
  `;
  const enUso = new Set(filas.map(({ id }) => id));
  const sobran = ids.filter((id) => !enUso.has(id));
  if (sobran.length > 0) await tx.audio.deleteMany({ where: { idCurso, id: { in: sobran } } });
}

// Sube un audio, ya limpio, al borrador de quien llama. La huella es la del audio limpio: el
// mismo audio con otro título es el mismo audio, con su `subida_en` renovado para que no se
// borre mientras se usa en un formulario. Con el curso bloqueado, una imagen y un audio
// subidos a la vez no se pasan de los 200 MB.
export async function subirAudio(
  idAutor: string,
  idCurso: string,
  { bytes, formato, duracion }: AudioSubido,
): Promise<{ audio: Audio; nuevo: boolean }> {
  const huella = createHash("sha256").update(bytes).digest("hex");
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    await limpiarArchivosSinUsar(idCurso, tx);
    const existente = await tx.audio.findUnique({
      where: { idCurso_huella: { idCurso, huella } },
      select: seleccionAudio,
    });
    if (existente) {
      await tx.audio.update({ where: { id: existente.id }, data: { subidaEn: new Date() } });
      return { audio: aAudio(existente), nuevo: false };
    }
    if ((await pesoArchivosCurso(tx, idCurso)) + bytes.length > LIMITES_ARCHIVOS.pesoCursoMax) {
      throw new ErrorApi(400, MENSAJES_ARCHIVOS.cursoLleno);
    }
    const audio = await tx.audio.create({
      data: {
        idCurso,
        huella,
        formato,
        duracion,
        peso: bytes.length,
        // Prisma pide un Uint8Array sobre un ArrayBuffer propio; el audio limpio puede ser
        // un pedazo del cuerpo de express.raw
        datos: new Uint8Array(bytes),
      },
      select: seleccionAudio,
    });
    return { audio: aAudio(audio), nuevo: true };
  });
}

export type ArchivoAudio = { datos: Buffer; formato: FormatoAudio; huella: string };

// Un audio se oye donde se ve su curso: el de un borrador o un curso en revisión, solo su
// autor; el de un curso publicado, cualquiera con sesión. Si no, el mismo 404 que si no
// existe, para no revelar cursos sin publicar.
export async function traerAudio(idUsuario: string, idAudio: string): Promise<ArchivoAudio> {
  const audio = await bd.audio.findUnique({
    where: { id: idAudio },
    select: {
      datos: true,
      formato: true,
      huella: true,
      curso: { select: { publicado: true, idAutor: true } },
    },
  });
  if (!audio || (!audio.curso.publicado && audio.curso.idAutor !== idUsuario)) {
    throw new ErrorApi(404, MENSAJES_AUDIOS.audioNoDisponible);
  }
  return {
    datos: Buffer.from(audio.datos),
    formato: audio.formato as FormatoAudio,
    huella: audio.huella,
  };
}
