import { crearApp } from "./app.ts";
import { entorno } from "./config/entorno.ts";

crearApp().listen(entorno.puerto, () => {
  console.log(`API de Brote en http://localhost:${entorno.puerto}`);
});
