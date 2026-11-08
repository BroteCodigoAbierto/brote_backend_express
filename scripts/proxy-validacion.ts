// Herramienta de desarrollo: un proxy de :3001 a la API en :3000 que, a pedido, bloquea o
// retrasa las imágenes (GET /imagenes/*). Sirve para validar en la web y en el iPhone "no
// cargó", el lugar reservado y el reintento de F13 (brote_specs, quickstart de F13, sección
// 1.4) sin apagar la API.
//
//   npm run proxy:validacion
//   curl -X POST localhost:3001/__modo/normal      (o bloquear, o retrasar)

import { createServer, request } from "node:http";

type Modo = "normal" | "bloquear" | "retrasar";

const PUERTO = 3001;
const DESTINO = { host: "localhost", port: 3000 };
const RETRASO_MS = 4000;
const MODOS: Modo[] = ["normal", "bloquear", "retrasar"];

let modo: Modo = "normal";

const servidor = createServer((peticion, respuesta) => {
  const cambio = peticion.url?.match(/^\/__modo\/(\w+)$/);
  if (peticion.method === "POST" && cambio) {
    const pedido = cambio[1] as Modo;
    if (!MODOS.includes(pedido)) {
      respuesta.writeHead(400).end(`Modos: ${MODOS.join(", ")}\n`);
      return;
    }
    modo = pedido;
    console.log(`modo: ${modo}`);
    respuesta.end(`modo: ${modo}\n`);
    return;
  }

  const esImagen = peticion.method === "GET" && peticion.url?.startsWith("/imagenes/");
  if (esImagen && modo === "bloquear") {
    peticion.socket.destroy(); // como si se cayera la red
    return;
  }

  function reenviar() {
    const salida = request(
      { ...DESTINO, method: peticion.method, path: peticion.url, headers: peticion.headers },
      (llegada) => {
        respuesta.writeHead(llegada.statusCode ?? 502, llegada.headers);
        llegada.pipe(respuesta);
      },
    );
    salida.on("error", () => respuesta.writeHead(502).end());
    peticion.pipe(salida);
  }

  if (esImagen && modo === "retrasar") setTimeout(reenviar, RETRASO_MS);
  else reenviar();
});

// en todas las interfaces, para que llegue el iPhone
servidor.listen(PUERTO, "0.0.0.0", () => {
  console.log(`Proxy de validación en :${PUERTO} hacia :${DESTINO.port} (modo: ${modo})`);
});
