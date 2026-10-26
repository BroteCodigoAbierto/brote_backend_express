// Herramienta de desarrollo: marca sesiones como expiradas para validar a mano
// qué pasa cuando una sesión termina (quickstart de F01). Sin argumentos expira
// todas; con un correo, solo las de esa cuenta.
//
//   npm run sesiones:expirar [-- correo]

import { bd } from "../src/config/bd.ts";

const correo = process.argv[2]?.trim().toLowerCase();
// con Prisma la fecha se guarda en UTC, igual que las que escribe Better Auth
const haceUnMinuto = new Date(Date.now() - 60_000);

const { count } = await bd.session.updateMany({
  where: correo ? { user: { email: correo } } : {},
  data: { expiresAt: haceUnMinuto },
});

console.log(`${count} sesiones expiradas${correo ? ` de ${correo}` : ""}`);
await bd.$disconnect();
