// Herramienta de desarrollo: deja la base con las cuentas, los cursos y las
// actividades de prueba de F02 y F03 (quickstart de cada una, sección 1.1).
// Correrlo otra vez regresa al estado inicial: borra los cursos de las cuentas
// @brote.test y los vuelve a crear. Si una actividad no pasa
// validarActividades, falla sin tocar la base.
//
//   npm run bd:sembrar

import { auth } from "../src/config/auth.ts";
import { bd } from "../src/config/bd.ts";
import { validarActividades } from "../src/validacion/actividades.ts";
import { CUENTAS_PRUEBA, CURSOS_PRUEBA } from "./datos-prueba.ts";

// Antes de abrir la transacción: si algo está mal, la base ni se toca.
for (const curso of CURSOS_PRUEBA) {
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
  await bd.$transaction(
    async (tx) => {
      // las lecciones se borran en cascada
      await tx.curso.deleteMany({ where: { autor: { email: { endsWith: "@brote.test" } } } });
      for (const curso of CURSOS_PRUEBA) {
        await tx.curso.create({
          data: {
            titulo: curso.titulo,
            descripcion: curso.descripcion,
            publicado: curso.publicado,
            idAutor: idPorCorreo.get(curso.correoAutor)!,
            lecciones: {
              create: curso.lecciones.map(({ titulo, actividades }, i) => ({
                titulo,
                posicion: i + 1,
                actividades,
              })),
            },
          },
        });
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
    `${CURSOS_PRUEBA.length} cursos de prueba creados; ${publicados} publicados; ${actividades} actividades`,
  );
} finally {
  await bd.$disconnect();
}
