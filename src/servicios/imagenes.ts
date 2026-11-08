import { createHash } from "node:crypto";
import { bd } from "../config/bd.ts";
import { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_ARCHIVOS,
  MENSAJES_ARCHIVOS,
  MENSAJES_IMAGENES,
  type FormatoImagen,
  type Imagen,
} from "../tipos/contrato.ts";
import type { ImagenSubida } from "../validacion/imagenes.ts";
import { limpiarArchivosSinUsar, pesoArchivosCurso } from "./archivos.ts";
import { conCursoEditable } from "./editor.ts";

// Las imágenes de los cursos (spec F13; brote_specs, research de F13, puntos 1 y 6). Los
// bytes viven en la tabla `imagen` (decisión 0016): ninguna consulta de aquí los pide, salvo
// traerImagen. Una imagen se usa si está en `leccion.imagenes` de su curso o es su portada;
// lo que se deja de usar se borra al guardar, y lo que nunca se usó, al día siguiente (con los
// audios, en servicios/archivos.ts). Desde F14, el espacio del curso cuenta imágenes y audios.

type Transaccion = Prisma.TransactionClient;

export const seleccionImagen = {
  id: true,
  formato: true,
  ancho: true,
  alto: true,
  peso: true,
} satisfies Prisma.ImagenSelect;

type FilaImagen = Prisma.ImagenGetPayload<{ select: typeof seleccionImagen }>;

// `formato` es texto en la base, pero el CHECK de la migración solo deja los cuatro.
export function aImagen(fila: FilaImagen): Imagen {
  return { ...fila, formato: fila.formato as FormatoImagen };
}

// Las de esa lista que son de ese curso: una imagen de otro curso cuenta como que no está.
export async function imagenesDelCurso(
  tx: Transaccion,
  idCurso: string,
  ids: string[],
): Promise<Imagen[]> {
  if (ids.length === 0) return [];
  const filas = await tx.imagen.findMany({
    where: { idCurso, id: { in: ids } },
    select: seleccionImagen,
  });
  return filas.map(aImagen);
}

async function idsEnUso(tx: Transaccion, idCurso: string): Promise<Set<string>> {
  const filas = await tx.$queryRaw<{ id: string }[]>`
    SELECT unnest(imagenes) AS id FROM leccion WHERE id_curso = ${idCurso}
    UNION
    SELECT id_portada AS id FROM curso WHERE id = ${idCurso} AND id_portada IS NOT NULL
  `;
  return new Set(filas.map(({ id }) => id));
}

// Borra, de esa lista, las que ya no usa ninguna lección del curso ni su portada. La llaman
// guardar una lección, cambiar la portada y eliminar una lección, después de escribir.
export async function borrarSinUso(tx: Transaccion, idCurso: string, ids: string[]) {
  if (ids.length === 0) return;
  const enUso = await idsEnUso(tx, idCurso);
  const sobran = ids.filter((id) => !enUso.has(id));
  if (sobran.length > 0) await tx.imagen.deleteMany({ where: { idCurso, id: { in: sobran } } });
}

// Sube una imagen al borrador de quien llama. El mismo archivo otra vez es la misma imagen,
// con su `subida_en` renovado para que no se borre mientras se usa en un formulario. Con el
// curso bloqueado, dos subidas a la vez (de imágenes o de audios) no se pasan de los 200 MB.
export async function subirImagen(
  idAutor: string,
  idCurso: string,
  { bytes, formato, ancho, alto }: ImagenSubida,
): Promise<{ imagen: Imagen; nueva: boolean }> {
  const huella = createHash("sha256").update(bytes).digest("hex");
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    await limpiarArchivosSinUsar(idCurso, tx);
    const existente = await tx.imagen.findUnique({
      where: { idCurso_huella: { idCurso, huella } },
      select: seleccionImagen,
    });
    if (existente) {
      await tx.imagen.update({ where: { id: existente.id }, data: { subidaEn: new Date() } });
      return { imagen: aImagen(existente), nueva: false };
    }
    if ((await pesoArchivosCurso(tx, idCurso)) + bytes.length > LIMITES_ARCHIVOS.pesoCursoMax) {
      throw new ErrorApi(400, MENSAJES_ARCHIVOS.cursoLleno);
    }
    const imagen = await tx.imagen.create({
      data: {
        idCurso,
        huella,
        formato,
        ancho,
        alto,
        peso: bytes.length,
        // Prisma pide un Uint8Array sobre un ArrayBuffer propio; el Buffer de express.raw
        // puede venir de un fondo compartido
        datos: new Uint8Array(bytes),
      },
      select: seleccionImagen,
    });
    return { imagen: aImagen(imagen), nueva: true };
  });
}

export type ArchivoImagen = { datos: Buffer; formato: FormatoImagen; huella: string };

// Una imagen se ve donde se ve su curso: la de un borrador o un curso en revisión, solo su
// autor; la de un curso publicado, cualquiera con sesión. Si no, el mismo 404 que si no
// existe, para no revelar cursos sin publicar.
export async function traerImagen(idUsuario: string, idImagen: string): Promise<ArchivoImagen> {
  const imagen = await bd.imagen.findUnique({
    where: { id: idImagen },
    select: {
      datos: true,
      formato: true,
      huella: true,
      curso: { select: { publicado: true, idAutor: true } },
    },
  });
  if (!imagen || (!imagen.curso.publicado && imagen.curso.idAutor !== idUsuario)) {
    throw new ErrorApi(404, MENSAJES_IMAGENES.imagenNoDisponible);
  }
  return {
    datos: Buffer.from(imagen.datos),
    formato: imagen.formato as FormatoImagen,
    huella: imagen.huella,
  };
}
