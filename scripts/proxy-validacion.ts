// Herramienta de desarrollo: un proxy de :3001 a la API en :3000 que, a pedido, bloquea,
// retrasa o daña los archivos de los cursos: las imágenes (GET /imagenes/*, F13) y los audios
// (GET /audios/*, F14). Sirve para validar en la web y en el iPhone "no cargó", el lugar
// reservado, el reintento y "no logró sonar" (brote_specs, quickstart de F13 y de F14, sección
// 1.4) sin apagar la API.
//
//   npm run proxy:validacion
//   curl -X POST localhost:3001/__modo/normal      (o bloquear, retrasar o danar)
//
// - bloquear: las imágenes y los audios responden con un error de red.
// - retrasar: tardan 4 s.
// - danar: solo los audios responden 200, con las cabeceras de la API y bytes al azar del
//   mismo largo, como un audio que se dañó en el camino.

import { randomBytes } from "node:crypto";
import { createServer, request, type IncomingMessage } from "node:http";
import { RUTA_AUDIOS, RUTA_IMAGENES } from "../src/tipos/contrato.ts";

type Modo = "normal" | "bloquear" | "retrasar" | "danar";

const PUERTO = 3001;
const DESTINO = { host: "localhost", port: 3000 };
const RETRASO_MS = 4000;
const MODOS: Modo[] = ["normal", "bloquear", "retrasar", "danar"];

let modo: Modo = "normal";

function esDe(peticion: IncomingMessage, ruta: string): boolean {
  return peticion.method === "GET" && (peticion.url?.startsWith(`${ruta}/`) ?? false);
}

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

  const esAudio = esDe(peticion, RUTA_AUDIOS);
  const esArchivo = esAudio || esDe(peticion, RUTA_IMAGENES);
  if (esArchivo && modo === "bloquear") {
    peticion.socket.destroy(); // como si se cayera la red
    return;
  }
  const danar = esAudio && modo === "danar";
  const cabeceras = { ...peticion.headers };
  // sin la huella que ya tiene el cliente, la API responde 200 y no 304, y hay algo que dañar
  if (danar) delete cabeceras["if-none-match"];

  function reenviar() {
    const salida = request(
      { ...DESTINO, method: peticion.method, path: peticion.url, headers: cabeceras },
      (llegada) => {
        if (!danar || llegada.statusCode !== 200) {
          respuesta.writeHead(llegada.statusCode ?? 502, llegada.headers);
          llegada.pipe(respuesta);
          return;
        }
        let largo = 0;
        llegada.on("data", (trozo: Buffer) => (largo += trozo.length));
        llegada.on("end", () => {
          respuesta.writeHead(200, llegada.headers);
          respuesta.end(randomBytes(largo));
        });
      },
    );
    salida.on("error", () => respuesta.writeHead(502).end());
    peticion.pipe(salida);
  }

  if (esArchivo && modo === "retrasar") setTimeout(reenviar, RETRASO_MS);
  else reenviar();
});

// en todas las interfaces, para que llegue el iPhone
servidor.listen(PUERTO, "0.0.0.0", () => {
  console.log(`Proxy de validación en :${PUERTO} hacia :${DESTINO.port} (modo: ${modo})`);
});
