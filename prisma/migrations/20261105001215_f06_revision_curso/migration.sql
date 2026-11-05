-- AlterTable
ALTER TABLE "curso" ADD COLUMN     "motivo_rechazo" TEXT,
ADD COLUMN     "revision" TEXT;

-- F06: lo que se escribe a mano en la base tiene que ser coherente (Prisma no sabe
-- declarar CHECK). IS NOT DISTINCT FROM y no "=": con revision en NULL, "=" da NULL y
-- un CHECK acepta NULL
ALTER TABLE "curso" ADD CONSTRAINT "curso_revision_valida" CHECK (
  ("revision" IS NULL OR "revision" IN ('pendiente', 'rechazada'))
  AND NOT ("publicado" AND "revision" IS NOT NULL)
  AND ("motivo_rechazo" IS NULL OR "revision" IS NOT DISTINCT FROM 'rechazada')
  AND ("motivo_rechazo" IS NULL OR char_length("motivo_rechazo") <= 1000)
);

-- F06: un administrador aprueba y retira cambiando solo `publicado`, directo en la base
-- (decisión 0014), así que el backend no está en ese camino. Sin esto, la marca de
-- revisión sobreviviría a la aprobación, y al retirar el curso volvería a "en revisión"
CREATE FUNCTION curso_limpiar_revision() RETURNS trigger AS $$
BEGIN
  NEW.revision := NULL;
  NEW.motivo_rechazo := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER curso_publicado_limpia_revision
  BEFORE UPDATE OF publicado ON curso
  FOR EACH ROW
  WHEN (OLD.publicado IS DISTINCT FROM NEW.publicado)
  EXECUTE FUNCTION curso_limpiar_revision();
