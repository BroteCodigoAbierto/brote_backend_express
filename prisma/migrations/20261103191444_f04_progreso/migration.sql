-- CreateTable
CREATE TABLE "progreso" (
    "id_usuario" TEXT NOT NULL,
    "id_leccion" TEXT NOT NULL,
    "aciertos" INTEGER NOT NULL,
    "preguntas" INTEGER NOT NULL,
    "completada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progreso_pkey" PRIMARY KEY ("id_usuario","id_leccion")
);

-- CreateIndex
CREATE INDEX "progreso_id_leccion_idx" ON "progreso"("id_leccion");

-- AddForeignKey
ALTER TABLE "progreso" ADD CONSTRAINT "progreso_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progreso" ADD CONSTRAINT "progreso_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "leccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- F04: el resultado tiene que ser coherente (Prisma no sabe declarar CHECK)
ALTER TABLE "progreso" ADD CONSTRAINT "progreso_resultado_valido" CHECK ("aciertos" >= 0 AND "aciertos" <= "preguntas");
