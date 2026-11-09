-- AlterTable
ALTER TABLE "curso" ADD COLUMN     "id_portada" TEXT;

-- AlterTable
ALTER TABLE "leccion" ADD COLUMN     "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "imagen" (
    "id" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "huella" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "peso" INTEGER NOT NULL,
    "datos" BYTEA NOT NULL,
    "subida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "imagen_id_curso_huella_key" ON "imagen"("id_curso", "huella");

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_portada_fkey" FOREIGN KEY ("id_portada") REFERENCES "imagen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagen" ADD CONSTRAINT "imagen_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- F13: lo que llega a la tabla tiene que ser una imagen coherente, también si se escribe a
-- mano en la base (Prisma no sabe declarar CHECK). Los límites son los de LIMITES_IMAGENES:
-- 1600 px por lado salvo un GIF, 10 MB, y 5 MB un GIF (brote_specs, data-model de F13)
ALTER TABLE "imagen" ADD CONSTRAINT "imagen_valida" CHECK (
  "formato" IN ('jpeg', 'png', 'webp', 'gif')
  AND "ancho" > 0 AND "alto" > 0
  AND ("formato" = 'gif' OR ("ancho" <= 1600 AND "alto" <= 1600))
  AND "peso" = octet_length("datos")
  AND "peso" <= 10485760
  AND ("formato" <> 'gif' OR "peso" <= 5242880)
);
