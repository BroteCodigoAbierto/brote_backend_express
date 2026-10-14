import { defineConfig, env } from "prisma/config";

// Prisma 7 no lee .env solo; Node sí sabe hacerlo sin dotenv.
try {
  process.loadEnvFile();
} catch {
  // sin .env se usan las variables que ya traiga el entorno
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
