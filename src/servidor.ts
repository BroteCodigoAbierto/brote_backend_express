import { crearApp } from "./app.ts";
import { entorno } from "./config/entorno.ts";
import { limpiarArchivosSinUsar } from "./servicios/archivos.ts";

const HORA_MS = 60 * 60 * 1000;

// F13 y F14: las imágenes y los audios que se subieron y nunca se guardaron se borran al día
// siguiente (brote_specs, research de F13, punto 6, y de F14, punto 7). Un error aquí no
// tumba la API.
async function limpiarArchivos() {
  try {
    await limpiarArchivosSinUsar();
  } catch (error) {
    console.error("No se pudieron limpiar los archivos sin usar:", error);
  }
}

crearApp().listen(entorno.puerto, () => {
  console.log(`API de Brote en http://localhost:${entorno.puerto}`);
  void limpiarArchivos();
  // unref: el temporizador no mantiene vivo el proceso por sí solo
  setInterval(() => void limpiarArchivos(), HORA_MS).unref();
});
