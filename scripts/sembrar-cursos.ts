// Herramienta de desarrollo: deja la base con las cuentas y los cursos de prueba
// de F02 (quickstart de F02, sección 1.1). Correrlo otra vez regresa al estado
// inicial: borra los cursos de las cuentas @brote.test y los vuelve a crear.
//
//   npm run bd:sembrar

import { auth } from "../src/config/auth.ts";
import { bd } from "../src/config/bd.ts";
import { CUENTAS_PRUEBA, CURSOS_PRUEBA } from "./datos-prueba.ts";

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
              create: curso.lecciones.map((titulo, i) => ({ titulo, posicion: i + 1 })),
            },
          },
        });
      }
    },
    { timeout: 30_000 },
  );

  const publicados = CURSOS_PRUEBA.filter((curso) => curso.publicado).length;
  console.log(`${CURSOS_PRUEBA.length} cursos de prueba creados; ${publicados} publicados`);
} finally {
  await bd.$disconnect();
}
