import { createHash } from "node:crypto";
import { bd } from "../config/bd.ts";
import { Prisma } from "../generado/prisma/client.ts";
import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_IMAGENES,
  MENSAJES_IMAGENES,
  type FormatoImagen,
  type Imagen,
} from "../tipos/contrato.ts";
import type { ImagenSubida } from "../validacion/imagenes.ts";
import { conCursoEditable } from "./editor.ts";

// Las imágenes de los cursos (spec F13; brote_specs, research de F13, puntos 1 y 6). Los
// bytes viven en la tabla `imagen` (decisión 0016): ninguna consulta de aquí los pide, salvo
// traerImagen. Una imagen se usa si está en `leccion.imagenes` de su curso o es su portada;
// lo que se deja de usar se borra al guardar, y lo que nunca se usó, al día siguiente.

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

// Las de más de un día que nada usa: se subieron y nunca se guardaron. Con `idCurso`, solo
// las de ese curso (antes de contar su espacio); sin él, las de todos (cada hora).
export async function limpiarImagenesSinUsar(
  idCurso?: string,
  cliente: Transaccion = bd,
): Promise<number> {
  const delCurso = idCurso ? Prisma.sql`AND i.id_curso = ${idCurso}` : Prisma.empty;
  return cliente.$executeRaw`
    DELETE FROM imagen i
    WHERE i.subida_en < now() - interval '1 day' ${delCurso}
      AND NOT EXISTS (
        SELECT 1 FROM leccion l WHERE l.id_curso = i.id_curso AND i.id = ANY (l.imagenes)
      )
      AND NOT EXISTS (SELECT 1 FROM curso c WHERE c.id_portada = i.id)
  `;
}

// Sube una imagen al borrador de quien llama. El mismo archivo otra vez es la misma imagen,
// con su `subida_en` renovado para que no se borre mientras se usa en un formulario. Con el
// curso bloqueado, dos subidas a la vez no se pasan de los 200 MB.
export async function subirImagen(
  idAutor: string,
  idCurso: string,
  { bytes, formato, ancho, alto }: ImagenSubida,
): Promise<{ imagen: Imagen; nueva: boolean }> {
  const huella = createHash("sha256").update(bytes).digest("hex");
  return conCursoEditable(idAutor, idCurso, async (tx) => {
    await limpiarImagenesSinUsar(idCurso, tx);
    const existente = await tx.imagen.findUnique({
      where: { idCurso_huella: { idCurso, huella } },
      select: seleccionImagen,
    });
    if (existente) {
      await tx.imagen.update({ where: { id: existente.id }, data: { subidaEn: new Date() } });
      return { imagen: aImagen(existente), nueva: false };
    }
    const { _sum } = await tx.imagen.aggregate({ where: { idCurso }, _sum: { peso: true } });
    if ((_sum.peso ?? 0) + bytes.length > LIMITES_IMAGENES.pesoCursoMax) {
      throw new ErrorApi(400, MENSAJES_IMAGENES.cursoLleno);
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
