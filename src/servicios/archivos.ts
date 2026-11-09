import { bd } from "../config/bd.ts";
import { Prisma } from "../generado/prisma/client.ts";

// Lo que comparten las imágenes (F13) y los audios (F14) de un curso: el espacio que ocupan
// entre todos y la limpieza de lo que se subió y nunca se guardó (brote_specs, research de
// F14, punto 7). Va aparte para que servicios/imagenes.ts y servicios/audios.ts lo usen sin
// importarse entre sí.

type Transaccion = Prisma.TransactionClient;

// Las imágenes de más de un día que nada usa: se subieron y nunca se guardaron. Con
// `idCurso`, solo las de ese curso (antes de contar su espacio); sin él, las de todos (cada
// hora).
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

// Lo mismo con los audios. Un audio no es portada: solo cuentan las lecciones.
export async function limpiarAudiosSinUsar(
  idCurso?: string,
  cliente: Transaccion = bd,
): Promise<number> {
  const delCurso = idCurso ? Prisma.sql`AND a.id_curso = ${idCurso}` : Prisma.empty;
  return cliente.$executeRaw`
    DELETE FROM audio a
    WHERE a.subida_en < now() - interval '1 day' ${delCurso}
      AND NOT EXISTS (
        SELECT 1 FROM leccion l WHERE l.id_curso = a.id_curso AND a.id = ANY (l.audios)
      )
  `;
}

export async function limpiarArchivosSinUsar(
  idCurso?: string,
  cliente: Transaccion = bd,
): Promise<number> {
  return (
    (await limpiarImagenesSinUsar(idCurso, cliente)) +
    (await limpiarAudiosSinUsar(idCurso, cliente))
  );
}

// Los bytes de todas las imágenes y los audios del curso, usados o no: lo que se subió y aún
// no se guarda también ocupa (research de F13, punto 6). Hasta LIMITES_ARCHIVOS.pesoCursoMax.
export async function pesoArchivosCurso(tx: Transaccion, idCurso: string): Promise<number> {
  const [{ peso }] = await tx.$queryRaw<[{ peso: bigint }]>`
    SELECT
      (SELECT coalesce(sum(peso), 0) FROM imagen WHERE id_curso = ${idCurso})
      + (SELECT coalesce(sum(peso), 0) FROM audio WHERE id_curso = ${idCurso})
      AS peso
  `;
  return Number(peso);
}
