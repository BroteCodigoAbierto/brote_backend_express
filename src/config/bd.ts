import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generado/prisma/client.ts";
import { entorno } from "./entorno.ts";

// Única conexión a la base. Solo la importan los servicios (y Better Auth);
// las rutas nunca. Prisma 7 se conecta a PostgreSQL con un driver adapter.
export const bd = new PrismaClient({
  adapter: new PrismaPg({ connectionString: entorno.urlBaseDatos }),
});
