-- AlterTable
ALTER TABLE "curso" ADD COLUMN     "idioma" TEXT NOT NULL DEFAULT 'es';

-- AlterTable
ALTER TABLE "leccion" ADD COLUMN     "audios" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "audio" (
    "id" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "duracion" INTEGER NOT NULL,
    "peso" INTEGER NOT NULL,
    "datos" BYTEA NOT NULL,
    "subida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_id_curso_huella_key" ON "audio"("id_curso", "huella");

-- AddForeignKey
ALTER TABLE "audio" ADD CONSTRAINT "audio_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- F14: lo que llega a la tabla tiene que ser un audio coherente, también si se escribe a
-- mano en la base (Prisma no sabe declarar CHECK). Los límites son los de LIMITES_AUDIOS: 30 s
-- redondeados a décimas (hasta 30 049 ms) y 5 MB (brote_specs, data-model de F14)
ALTER TABLE "audio" ADD CONSTRAINT "audio_valido" CHECK (
  "formato" IN ('mp3', 'm4a', 'wav')
  AND "duracion" > 0 AND "duracion" <= 30049
  AND "peso" > 0
  AND "peso" = octet_length("datos")
  AND "peso" <= 5242880
);

-- F14: el idioma de un curso es uno de IDIOMAS_CURSO. El DEFAULT de arriba deja en español
-- los cursos que ya existen
ALTER TABLE "curso" ADD CONSTRAINT "curso_idioma_valido" CHECK (
  "idioma" IN ('es', 'en', 'fr', 'pt', 'de', 'it', 'ja', 'zh', 'ko')
);
