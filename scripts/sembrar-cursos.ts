// Herramienta de desarrollo: deja la base con las cuentas, los cursos y las
// actividades de prueba de F02 en adelante (quickstart de cada una, sección 1.1), con
// las imágenes de F13 dibujadas por imagenes-prueba.ts.
// Correrlo otra vez regresa al estado inicial: borra los cursos de las cuentas
// @brote.test y los vuelve a crear. Si una actividad no pasa
// validarActividades, falla sin tocar la base.
//
//   npm run bd:sembrar

import { createHash } from "node:crypto";
import { auth } from "../src/config/auth.ts";
import { bd } from "../src/config/bd.ts";
import type { Prisma } from "../src/generado/prisma/client.ts";
import type { Actividad, FormatoImagen, ImagenActividad } from "../src/tipos/contrato.ts";
import {
  idsDeImagenes,
  mapearImagenes,
  validarActividades,
} from "../src/validacion/actividades.ts";
import { leerImagen } from "../src/validacion/imagenes.ts";
import {
  CUENTAS_PRUEBA,
  CURSOS_PRUEBA,
  PREFIJO_IMAGEN_PRUEBA,
  type CursoPrueba,
} from "./datos-prueba.ts";
import { IMAGENES_PRUEBA } from "./imagenes-prueba.ts";

type Transaccion = Prisma.TransactionClient;

// F13: los nombres de las imágenes de prueba que usa un curso, en su portada y sus lecciones.
function nombresDeImagenes(curso: CursoPrueba): string[] {
  const ids = idsDeImagenes(curso.lecciones.flatMap(({ actividades }) => actividades));
  const nombres = ids.map((id) => id.slice(PREFIJO_IMAGEN_PRUEBA.length));
  return [...new Set([...(curso.portadaPrueba ? [curso.portadaPrueba] : []), ...nombres])];
}

// Crea en el curso cada imagen por su nombre y devuelve nombre → imagen guardada. Dos
// nombres que dibujan lo mismo (poligono-5 y pentagono-naranja) son la misma imagen, como
// cuando se sube dos veces el mismo archivo.
async function crearImagenes(
  tx: Transaccion,
  idCurso: string,
  nombres: string[],
): Promise<Map<string, ImagenActividad>> {
  const creadas = new Map<string, ImagenActividad>();
  const porHuella = new Map<string, ImagenActividad>();
  for (const nombre of nombres) {
    const bytes = IMAGENES_PRUEBA[nombre]!();
    const datos = leerImagen(bytes);
    if (!datos) throw new Error(`imagenes-prueba.ts dibujó "${nombre}" mal`);
    const huella = createHash("sha256").update(bytes).digest("hex");
    const igual = porHuella.get(huella);
    if (igual) {
      creadas.set(nombre, igual);
      continue;
    }
    const { formato, ancho, alto } = datos;
    const imagen = await tx.imagen.create({
      data: {
        idCurso,
        huella,
        formato,
        ancho,
        alto,
        peso: bytes.length,
        datos: new Uint8Array(bytes),
      },
      select: { id: true, formato: true, ancho: true, alto: true, peso: true },
    });
    const guardada = { ...imagen, formato: imagen.formato as FormatoImagen };
    creadas.set(nombre, guardada);
    porHuella.set(huella, guardada);
  }
  return creadas;
}

// Cambia cada referencia "prueba:<nombre>" por la imagen creada, con su texto alternativo.
function conImagenesCreadas(
  actividades: Actividad[],
  creadas: Map<string, ImagenActividad>,
): Actividad[] {
  return actividades.map((actividad) =>
    mapearImagenes(actividad, ({ id, textoAlternativo }) => ({
      ...creadas.get(id.slice(PREFIJO_IMAGEN_PRUEBA.length))!,
      ...(textoAlternativo !== undefined && { textoAlternativo }),
    })),
  );
}

// Antes de abrir la transacción: si algo está mal, la base ni se toca.
for (const curso of CURSOS_PRUEBA) {
  for (const nombre of nombresDeImagenes(curso)) {
    if (!IMAGENES_PRUEBA[nombre]) {
      throw new Error(`"${curso.titulo}": imagenes-prueba.ts no tiene "${nombre}"`);
    }
  }
  for (const [i, leccion] of curso.lecciones.entries()) {
    try {
      validarActividades(leccion.actividades);
    } catch (error) {
      const donde = `"${curso.titulo}", lección ${i + 1} ("${leccion.titulo}")`;
      throw new Error(`${donde}: ${(error as Error).message}`, { cause: error });
    }
  }
}

try {
  // Con Better Auth la contraseña queda con el mismo hash que la de una cuenta
  // normal, así se puede entrar con ellas. Crea también una sesión que no se usa.
  for (const { correo, nombre, contrasena } of CUENTAS_PRUEBA) {
    const existe = await bd.user.findUnique({ where: { email: correo }, select: { id: true } });
    if (!existe) {
      await auth.api.signUpEmail({ body: { name: nombre, email: correo, password: contrasena } });
    }
  }

  const autores = await bd.user.findMany({
    where: { email: { in: CUENTAS_PRUEBA.map((cuenta) => cuenta.correo) } },
    select: { id: true, email: true },
  });
  const idPorCorreo = new Map(autores.map((autor) => [autor.email, autor.id]));

  // todo o nada: si algo falla a la mitad, la base queda como estaba
  let imagenesCreadas = 0;
  await bd.$transaction(
    async (tx) => {
      // las lecciones se borran en cascada
      await tx.curso.deleteMany({ where: { autor: { email: { endsWith: "@brote.test" } } } });
      for (const curso of CURSOS_PRUEBA) {
        const { id: idCurso } = await tx.curso.create({
          data: {
            titulo: curso.titulo,
            descripcion: curso.descripcion,
            publicado: curso.publicado,
            revision: curso.revision ?? null,
            idAutor: idPorCorreo.get(curso.correoAutor)!,
          },
          select: { id: true },
        });
        const creadas = await crearImagenes(tx, idCurso, nombresDeImagenes(curso));
        imagenesCreadas += new Set([...creadas.values()].map(({ id }) => id)).size;
        await tx.leccion.createMany({
          data: curso.lecciones.map(({ titulo, actividades }, i) => {
            const conImagenes = conImagenesCreadas(actividades, creadas);
            return {
              idCurso,
              titulo,
              posicion: i + 1,
              actividades: conImagenes as unknown as Prisma.InputJsonValue,
              imagenes: idsDeImagenes(conImagenes),
            };
          }),
        });
        if (curso.portadaPrueba) {
          await tx.curso.update({
            where: { id: idCurso },
            data: { idPortada: creadas.get(curso.portadaPrueba)!.id },
          });
        }
      }
    },
    { timeout: 30_000 },
  );

  const publicados = CURSOS_PRUEBA.filter((curso) => curso.publicado).length;
  const actividades = CURSOS_PRUEBA.flatMap((curso) => curso.lecciones).reduce(
    (total, leccion) => total + leccion.actividades.length,
    0,
  );
  console.log(
    `${CURSOS_PRUEBA.length} cursos de prueba creados; ${publicados} publicados; ${actividades} actividades; ${imagenesCreadas} imágenes`,
  );
} finally {
  await bd.$disconnect();
}
