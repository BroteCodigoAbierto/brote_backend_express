-- AlterTable
ALTER TABLE "curso" ADD COLUMN     "categoria" TEXT NOT NULL DEFAULT 'otros',
ADD COLUMN     "clave_enlace" TEXT,
ADD COLUMN     "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "id_curso_origen" TEXT,
ADD COLUMN     "id_organizacion" TEXT,
ADD COLUMN     "nivel" TEXT NOT NULL DEFAULT 'principiante',
ADD COLUMN     "permite_fork" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tambien_publico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibilidad" TEXT NOT NULL DEFAULT 'publico';

-- AlterTable
ALTER TABLE "leccion" ADD COLUMN     "modulo" TEXT;

-- CreateTable
CREATE TABLE "organizacion" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "color_marca" TEXT,
    "modo_acceso" TEXT NOT NULL DEFAULT 'codigo',
    "codigo_acceso" TEXT,
    "dominios_permitidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiere_revision" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembro_organizacion" (
    "id_organizacion" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'alumno',
    "unido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembro_organizacion_pkey" PRIMARY KEY ("id_organizacion","id_usuario")
);

-- CreateTable
CREATE TABLE "grupo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "id_docente" TEXT NOT NULL,
    "id_organizacion" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembro_grupo" (
    "id_grupo" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "unido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "miembro_grupo_pkey" PRIMARY KEY ("id_grupo","id_usuario")
);

-- CreateTable
CREATE TABLE "reporte_actividad" (
    "id" TEXT NOT NULL,
    "id_curso" TEXT NOT NULL,
    "id_leccion" TEXT NOT NULL,
    "indice_actividad" INTEGER NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporte_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_slug_key" ON "organizacion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_codigo_acceso_key" ON "organizacion"("codigo_acceso");

-- CreateIndex
CREATE INDEX "miembro_organizacion_id_usuario_idx" ON "miembro_organizacion"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_codigo_key" ON "grupo"("codigo");

-- CreateIndex
CREATE INDEX "grupo_id_docente_idx" ON "grupo"("id_docente");

-- CreateIndex
CREATE INDEX "grupo_id_curso_idx" ON "grupo"("id_curso");

-- CreateIndex
CREATE INDEX "miembro_grupo_id_usuario_idx" ON "miembro_grupo"("id_usuario");

-- CreateIndex
CREATE INDEX "reporte_actividad_id_curso_resuelto_idx" ON "reporte_actividad"("id_curso", "resuelto");

-- CreateIndex
CREATE UNIQUE INDEX "curso_clave_enlace_key" ON "curso"("clave_enlace");

-- CreateIndex
CREATE INDEX "curso_id_organizacion_idx" ON "curso"("id_organizacion");

-- CreateIndex
CREATE INDEX "curso_categoria_nivel_idx" ON "curso"("categoria", "nivel");

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_organizacion_fkey" FOREIGN KEY ("id_organizacion") REFERENCES "organizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curso" ADD CONSTRAINT "curso_id_curso_origen_fkey" FOREIGN KEY ("id_curso_origen") REFERENCES "curso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_organizacion" ADD CONSTRAINT "miembro_organizacion_id_organizacion_fkey" FOREIGN KEY ("id_organizacion") REFERENCES "organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_organizacion" ADD CONSTRAINT "miembro_organizacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_id_organizacion_fkey" FOREIGN KEY ("id_organizacion") REFERENCES "organizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_grupo" ADD CONSTRAINT "miembro_grupo_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_grupo" ADD CONSTRAINT "miembro_grupo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_actividad" ADD CONSTRAINT "reporte_actividad_id_curso_fkey" FOREIGN KEY ("id_curso") REFERENCES "curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_actividad" ADD CONSTRAINT "reporte_actividad_id_leccion_fkey" FOREIGN KEY ("id_leccion") REFERENCES "leccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte_actividad" ADD CONSTRAINT "reporte_actividad_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

