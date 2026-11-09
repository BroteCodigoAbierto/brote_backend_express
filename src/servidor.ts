import { crearApp } from "./app.ts";
import { entorno } from "./config/entorno.ts";
import { limpiarImagenesSinUsar } from "./servicios/imagenes.ts";

const HORA_MS = 60 * 60 * 1000;

// F13: las imágenes que se subieron y nunca se guardaron se borran al día siguiente
// (brote_specs, research de F13, punto 6). Un error aquí no tumba la API.
async function limpiarImagenes() {
  try {
    await limpiarImagenesSinUsar();
  } catch (error) {
    console.error("No se pudieron limpiar las imágenes sin usar:", error);
  }
}

crearApp().listen(entorno.puerto, () => {
  console.log(`API de Brote en http://localhost:${entorno.puerto}`);
  void limpiarImagenes();
  // unref: el temporizador no mantiene vivo el proceso por sí solo
  setInterval(() => void limpiarImagenes(), HORA_MS).unref();
});
