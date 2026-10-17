import express, { type Express } from "express";
import { entorno } from "./config/entorno.ts";
import { manejarErrores, rutaNoEncontrada } from "./middleware/errores.ts";
import { rutas } from "./rutas/index.ts";

// La app se arma aparte de servidor.ts para poder levantarla sin abrir un puerto.
export function crearApp(): Express {
  const app = express();

  app.use(express.json({ limit: "2mb" })); // un curso importado completo cabe en 2 MB

  // CORS mínimo para la web; el móvil no lo necesita
  app.use((req, res, siguiente) => {
    const origen = req.headers.origin;
    if (origen && entorno.origenesPermitidos.includes(origen)) {
      res.setHeader("Access-Control-Allow-Origin", origen);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    siguiente();
  });

  app.use(rutas);
  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
}
