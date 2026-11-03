-- Búsqueda y orden sin acentos ni mayúsculas (brote_specs, research de F02, punto 2).
-- Prisma no escribe extensiones: esta línea se agregó a mano.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- CreateTable
CREATE TABLE "curso" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "id_autor" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leccion" (
    "id" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curso_id_autor_idx" ON "curso"("id_autor");

-- CreateIndex
CREATE UNIQUE INDEX "leccion_id_curso_posicion_key" ON "leccion"("id_curso", "posicion");

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leccion" ADD CONSTRAINT "leccion_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
