// Punto de entrada en Vercel: allí cada petición llega a una función y no hay un
// proceso que abra el puerto, así que se exporta la app sin listen (src/servidor.ts
// sigue siendo el arranque en local). La limpieza de archivos sin usar de servidor.ts
// no corre en Vercel: los archivos huérfanos se quedan hasta un arranque local.
import { crearApp } from "../src/app.ts";

export default crearApp();
