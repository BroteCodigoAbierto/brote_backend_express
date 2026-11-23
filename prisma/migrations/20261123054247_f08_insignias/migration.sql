-- AlterTable
ALTER TABLE "curso" ADD COLUMN     "da_insignia" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "insignia" (
    "id_usuario" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "ganada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insignia_pkey" PRIMARY KEY ("id_usuario","id_curso")
);

-- CreateIndex
CREATE INDEX "insignia_id_curso_idx" ON "insignia"("id_curso");

-- AddForeignKey
ALTER TABLE "insignia" ADD CONSTRAINT "insignia_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insignia" ADD CONSTRAINT "insignia_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
