// Herramienta de desarrollo: los archivos para subir al validar F13 (brote_specs, quickstart
// de F13, sección 1.2). Los PNG y los GIF los dibuja imagenes-prueba.ts; los JPEG y el HEIC
// los convierte `sips` de macOS, y el EXIF de la foto de lado y de la foto con ubicación se
// escribe aquí a mano.
//
//   npm run imagenes:validacion -- <carpeta>

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  bloqueAnimacionPng,
  codificarPng,
  crearLienzo,
  dibujarFigura,
  gifDeRuido,
  type Lienzo,
} from "./imagenes-prueba.ts";

const MB = 1024 * 1024;

const carpeta = process.argv[2];
if (!carpeta) {
  console.error("Uso: npm run imagenes:validacion -- <carpeta>");
  process.exit(1);
}
mkdirSync(carpeta, { recursive: true });

function guardar(nombre: string, bytes: Buffer) {
  writeFileSync(join(carpeta!, nombre), bytes);
}

// sips viene con macOS: convierte un PNG a JPEG o a HEIC.
function convertir(png: Buffer, formato: "jpeg" | "heic"): Buffer {
  const entrada = join(carpeta!, ".temporal.png");
  const salida = join(carpeta!, `.temporal.${formato}`);
  writeFileSync(entrada, png);
  try {
    execFileSync("sips", ["-s", "format", formato, entrada, "--out", salida], { stdio: "ignore" });
  } catch {
    console.error("Falta sips (solo existe en macOS): no se pueden hacer los JPEG ni el HEIC.");
    process.exit(1);
  }
  const bytes = readFileSync(salida);
  rmSync(entrada);
  rmSync(salida);
  return bytes;
}

// Una "foto": un degradado con algo de ruido (para que pese como una foto) y un círculo.
function foto(ancho: number, alto: number): Lienzo {
  const lienzo = crearLienzo(ancho, alto);
  let semilla = 7;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      semilla = (semilla * 1103515245 + 12345) >>> 0;
      const ruido = (semilla >>> 24) % 24;
      const i = (y * ancho + x) * 4;
      lienzo.pixeles.set(
        [
          Math.round((x / ancho) * 200) + ruido,
          Math.round((y / alto) * 160) + ruido,
          180 + ruido,
          255,
        ],
        i,
      );
    }
  }
  const radio = Math.min(ancho, alto) * 0.3;
  dibujarFigura(lienzo, {
    forma: "circulo",
    color: "amarilla",
    relleno: true,
    centro: [ancho / 2, alto / 2],
    radio,
  });
  return lienzo;
}

// Una flecha que apunta a la izquierda, en 800 × 600. Con la orientación EXIF 6 (girar 90°
// a la derecha), bien enderezada mide 600 × 800 y apunta hacia arriba.
function flechaDeLado(): Lienzo {
  const lienzo = crearLienzo(800, 600, "fondo");
  dibujarFigura(lienzo, {
    forma: "poligono",
    lados: 3,
    color: "indigo",
    relleno: true,
    centro: [300, 300],
    radio: 200,
  });
  // el triángulo apunta hacia arriba: se gira copiando los pixeles
  const girado = crearLienzo(800, 600, "fondo");
  for (let y = 0; y < 600; y++) {
    for (let x = 0; x < 800; x++) {
      // girar 90° a la izquierda alrededor de (300, 300): la punta de arriba queda a la izquierda
      const ox = 300 - (y - 300);
      const oy = 300 + (x - 300);
      if (ox < 0 || ox >= 800 || oy < 0 || oy >= 600) continue;
      const desde = (oy * 800 + ox) * 4;
      girado.pixeles.set(lienzo.pixeles.subarray(desde, desde + 4), (y * 800 + x) * 4);
    }
  }
  dibujarFigura(girado, {
    forma: "poligono",
    lados: 4,
    color: "indigo",
    relleno: true,
    centro: [560, 300],
    radio: 120,
  });
  return girado;
}

// ---------------------------------------------------------------------------
// EXIF a mano: https://www.cipa.jp/std/documents/e/DC-X008-Translation-2019-E.pdf
// TIFF little endian, IFD0 (orientación, marca, modelo y el puntero al GPS) y el IFD del GPS.
// ---------------------------------------------------------------------------

type Entrada = { etiqueta: number; tipo: 2 | 3 | 4 | 5; valores: number[] | string };

const TAMANO_TIPO = { 2: 1, 3: 2, 4: 4, 5: 8 } as const;

function valoresDe({ tipo, valores }: Entrada): Buffer {
  if (tipo === 2) return Buffer.from(`${valores as string}\0`, "latin1");
  const numeros = valores as number[];
  const bytes = Buffer.alloc(numeros.length * TAMANO_TIPO[tipo]);
  numeros.forEach((n, i) => {
    if (tipo === 3) bytes.writeUInt16LE(n, i * 2);
    if (tipo === 4) bytes.writeUInt32LE(n, i * 4);
    if (tipo === 5) {
      bytes.writeUInt32LE(n, i * 8); // numerador; el denominador es 1
      bytes.writeUInt32LE(1, i * 8 + 4);
    }
  });
  return bytes;
}

// Un IFD que empieza en `inicio` (desde el principio del TIFF), con sus datos largos después.
function ifd(entradas: Entrada[], inicio: number): Buffer {
  const cabeza = Buffer.alloc(2 + entradas.length * 12 + 4);
  cabeza.writeUInt16LE(entradas.length, 0);
  const datos: Buffer[] = [];
  let posicionDatos = inicio + cabeza.length;
  entradas.forEach((entrada, i) => {
    const valor = valoresDe(entrada);
    const base = 2 + i * 12;
    const cantidad = entrada.tipo === 2 ? valor.length : (entrada.valores as number[]).length;
    cabeza.writeUInt16LE(entrada.etiqueta, base);
    cabeza.writeUInt16LE(entrada.tipo, base + 2);
    cabeza.writeUInt32LE(cantidad, base + 4);
    if (valor.length <= 4) {
      valor.copy(cabeza, base + 8);
    } else {
      cabeza.writeUInt32LE(posicionDatos, base + 8);
      datos.push(valor);
      posicionDatos += valor.length;
    }
  });
  return Buffer.concat([cabeza, ...datos]);
}

function exif({ orientacion, conUbicacion }: { orientacion: number; conUbicacion: boolean }) {
  const ifd0 = (punteroGps: number): Entrada[] => [
    { etiqueta: 0x010f, tipo: 2, valores: "Brote" },
    { etiqueta: 0x0110, tipo: 2, valores: "Brote Cam" },
    { etiqueta: 0x0112, tipo: 3, valores: [orientacion] },
    ...(conUbicacion ? [{ etiqueta: 0x8825, tipo: 4 as const, valores: [punteroGps] }] : []),
  ];
  const largoIfd0 = ifd(ifd0(0), 8).length;
  const primero = ifd(ifd0(8 + largoIfd0), 8);
  const gps: Entrada[] = [
    { etiqueta: 0x0001, tipo: 2, valores: "N" },
    { etiqueta: 0x0002, tipo: 5, valores: [19, 25, 48] }, // 19.43° N
    { etiqueta: 0x0003, tipo: 2, valores: "W" },
    { etiqueta: 0x0004, tipo: 5, valores: [99, 7, 48] }, // 99.13° O
  ];
  const tiff = Buffer.concat([
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]),
    primero,
    ...(conUbicacion ? [ifd(gps, 8 + primero.length)] : []),
  ]);
  const contenido = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const cabecera = Buffer.from([0xff, 0xe1, 0, 0]);
  cabecera.writeUInt16BE(contenido.length + 2, 2);
  return Buffer.concat([cabecera, contenido]);
}

// Quita los APPn que puso sips y pone el EXIF propio justo después de SOI.
function conExif(jpeg: Buffer, bloque: Buffer): Buffer {
  const partes: Buffer[] = [jpeg.subarray(0, 2), bloque];
  let posicion = 2;
  while (posicion < jpeg.length) {
    const marcador = jpeg[posicion + 1]!;
    if (marcador === 0xda) break; // SOS: lo demás va tal cual
    const largo = jpeg.readUInt16BE(posicion + 2);
    if (marcador < 0xe0 || marcador > 0xef)
      partes.push(jpeg.subarray(posicion, posicion + 2 + largo));
    posicion += 2 + largo;
  }
  partes.push(jpeg.subarray(posicion));
  return Buffer.concat(partes);
}

const figuraPng = (() => {
  const lienzo = crearLienzo(400, 400);
  dibujarFigura(lienzo, {
    forma: "poligono",
    lados: 4,
    color: "azul",
    relleno: true,
    centro: [200, 200],
    radio: 160,
  });
  return codificarPng(lienzo);
})();

const transparente = (() => {
  const lienzo = crearLienzo(600, 600);
  dibujarFigura(lienzo, {
    forma: "circulo",
    color: "verde",
    relleno: true,
    centro: [300, 300],
    radio: 200,
  });
  return codificarPng(lienzo);
})();

const foto800 = convertir(codificarPng(foto(800, 600)), "jpeg");

guardar("foto-4000x3000.jpg", convertir(codificarPng(foto(4000, 3000)), "jpeg"));
guardar("foto-800x600.jpg", foto800);
guardar("transparente.png", transparente);
guardar("figura.png", figuraPng);
guardar("animado.png", codificarPng(crearLienzo(10, 10, "azul"), [bloqueAnimacionPng()]));
guardar(
  "de-lado.jpg",
  conExif(
    convertir(codificarPng(flechaDeLado()), "jpeg"),
    exif({ orientacion: 6, conUbicacion: false }),
  ),
);
guardar("con-ubicacion.jpg", conExif(foto800, exif({ orientacion: 1, conUbicacion: true })));
guardar("gif-2mb.gif", gifDeRuido(2 * MB, 1));
guardar("gif-6mb.gif", gifDeRuido(6 * MB, 2));
for (let i = 1; i <= 6; i++) guardar(`gif-5mb-${i}.gif`, gifDeRuido(4.9 * MB, 10 + i));
guardar("grande-11mb.jpg", Buffer.concat([foto800, Buffer.alloc(11 * MB - foto800.length)]));
guardar(
  "dibujo.svg",
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle r="5" cx="5" cy="5"/></svg>\n',
  ),
);
guardar("foto.heic", convertir(figuraPng, "heic"));
guardar("texto.png", Buffer.from("Esto no es una imagen.\n"));

console.log(`Archivos para validar F13 en ${carpeta}`);
