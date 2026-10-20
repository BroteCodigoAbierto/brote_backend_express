import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins/bearer";
import { bd } from "./bd.ts";
import { entorno } from "./entorno.ts";

const DIA = 60 * 60 * 24; // en segundos, como los pide Better Auth

// Better Auth NO se monta como handler (/api/auth/*): solo lo usan los
// servicios con auth.api.*, para que toda entrada pase por nuestras rutas y
// validaciones (ver brote_specs, research de F01, punto 1).
export const auth = betterAuth({
  database: prismaAdapter(bd, { provider: "postgresql" }),
  secret: entorno.secretoAuth,
  baseURL: entorno.urlApi,
  trustedOrigins: entorno.origenesPermitidos,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // crear la cuenta deja la sesión iniciada
    minPasswordLength: 8,
    // la ruta ya limita a 128 caracteres Unicode; Better Auth mide en UTF-16
    // (un emoji cuenta 2), así que aquí solo es una red contra cuerpos enormes
    maxPasswordLength: 512,
  },
  session: {
    expiresIn: 30 * DIA, // expira tras 30 días sin usarse...
    updateAge: DIA, // ...porque cada uso la renueva (como máximo una vez al día)
  },
  // la spec deja fuera el límite de intentos; Better Auth lo enciende solo en
  // producción y así la app se portaría distinto en cada entorno
  rateLimit: { enabled: false },
  plugins: [bearer()], // el móvil usa token Bearer en lugar de cookie
});
