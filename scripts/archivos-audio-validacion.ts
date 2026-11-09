// Herramienta de desarrollo: los audios para subir al validar F14 (brote_specs, quickstart de
// F14, sección 1.2). Los WAV salen de audios-prueba.ts; el MP3 es el de los cursos de prueba,
// con etiquetas escritas aquí a mano; el M4A sin pérdida lo convierte `afconvert` de macOS.
//
//   npm run audios:validacion -- <carpeta>

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUDIOS_PRUEBA,
  MELODIAS,
  NOTAS,
  codificarWav,
  melodia,
  type Sonido,
} from "./audios-prueba.ts";
import { codificarPng, crearLienzo, dibujarFigura } from "./imagenes-prueba.ts";

const MB = 1024 * 1024;

const carpeta = process.argv[2];
if (!carpeta) {
  console.error("Uso: npm run audios:validacion -- <carpeta>");
  process.exit(1);
}
mkdirSync(carpeta, { recursive: true });

function guardar(nombre: string, bytes: Buffer) {
  writeFileSync(join(carpeta!, nombre), bytes);
}

// Un tono que sube despacio, en estéreo, hasta llenar `bytes` de datos: para los WAV que
// tienen que pesar algo exacto. `nota` los hace distintos entre sí.
function tonoEstereo(frecuencia: number, bytes: number, nota: number): Sonido {
  const muestras = new Int16Array(Math.floor(bytes / 4) * 2);
  for (let i = 0; i < muestras.length / 2; i++) {
    const t = i / frecuencia;
    const valor = Math.round(Math.sin(2 * Math.PI * (nota + t * 4) * t) * 0.4 * 32767);
    muestras[2 * i] = valor;
    muestras[2 * i + 1] = valor;
  }
  return { muestras, frecuencia, canales: 2 };
}

// https://id3.org/id3v2.3.0: la cabecera ("ID3", versión 3.0, sin banderas y el tamaño en
// bytes de 7 bits) y los cuadros (nombre, tamaño normal, dos bytes de banderas, contenido).
function cuadroId3(nombre: string, contenido: Buffer): Buffer {
  const cabecera = Buffer.alloc(10);
  cabecera.write(nombre, 0, "latin1");
  cabecera.writeUInt32BE(contenido.length, 4);
  return Buffer.concat([cabecera, contenido]);
}

function textoId3(nombre: string, texto: string): Buffer {
  return cuadroId3(nombre, Buffer.concat([Buffer.from([0]), Buffer.from(texto, "latin1")]));
}

function etiquetaId3(cuadros: Buffer[]): Buffer {
  const cuerpo = Buffer.concat(cuadros);
  const tamano = cuerpo.length;
  const cabecera = Buffer.from([
    0x49,
    0x44,
    0x33,
    3,
    0,
    0,
    (tamano >> 21) & 0x7f,
    (tamano >> 14) & 0x7f,
    (tamano >> 7) & 0x7f,
    tamano & 0x7f,
  ]);
  return Buffer.concat([cabecera, cuerpo]);
}

// ID3v1: "TAG" y 125 bytes de campos fijos, al final del archivo.
function etiquetaId3v1(titulo: string, artista: string): Buffer {
  const etiqueta = Buffer.alloc(128);
  etiqueta.write("TAG", 0, "latin1");
  etiqueta.write(titulo.slice(0, 30), 3, "latin1");
  etiqueta.write(artista.slice(0, 30), 33, "latin1");
  return etiqueta;
}

function caratula(): Buffer {
  const lienzo = crearLienzo(300, 300, "indigo");
  dibujarFigura(lienzo, {
    forma: "estrella",
    color: "amarilla",
    relleno: true,
    centro: [150, 150],
    radio: 120,
  });
  return codificarPng(lienzo);
}

function conEtiquetas(mp3: Buffer): Buffer {
  const apic = cuadroId3(
    "APIC",
    Buffer.concat([
      Buffer.from([0]), // texto en ISO-8859-1
      Buffer.from("image/png\0", "latin1"),
      Buffer.from([3, 0]), // portada; sin descripción
      caratula(),
    ]),
  );
  const id3 = etiquetaId3([
    textoId3("TIT2", "Título de prueba"),
    textoId3("TPE1", "Artista de prueba"),
    apic,
  ]);
  return Buffer.concat([id3, mp3, etiquetaId3v1("Título de prueba", "Artista de prueba")]);
}

// afconvert viene con macOS: el M4A sin pérdida (ALAC), que Brote rechaza.
function sinPerdida(wav: Buffer): Buffer | null {
  const entrada = join(carpeta!, ".temporal.wav");
  const salida = join(carpeta!, ".temporal.m4a");
  writeFileSync(entrada, wav);
  try {
    execFileSync("afconvert", ["-f", "m4af", "-d", "alac", entrada, salida], { stdio: "ignore" });
    return readFileSync(salida);
  } catch {
    return null;
  } finally {
    rmSync(entrada, { force: true });
    rmSync(salida, { force: true });
  }
}

const escala = AUDIOS_PRUEBA["escala-sube.wav"]!();
const mp3 = AUDIOS_PRUEBA["escala-sube.mp3"]!();

guardar("escala.wav", escala);
guardar("escala-4s.mp3", mp3);
guardar("con-etiquetas.mp3", conEtiquetas(mp3));
guardar(
  "largo-31s.wav",
  codificarWav(melodia([...MELODIAS["escala-sube"], { hz: NOTAS.do, segundos: 27 }])),
);
// 96 kHz, estéreo, 16 s: 6 MB, que pasan del peso pero no de la duración
guardar("pesado-6mb.wav", codificarWav(tonoEstereo(96000, 96000 * 4 * 16, NOTAS.do)));
// 48 kHz, estéreo, 16 bits: 4.9 MB son unos 26.8 s
guardar("pesado-5mb-1.wav", codificarWav(tonoEstereo(48000, 4.9 * MB, NOTAS.mi)));
guardar("pesado-5mb-2.wav", codificarWav(tonoEstereo(48000, 4.9 * MB, NOTAS.sol)));
guardar("audio.ogg", Buffer.concat([Buffer.from("OggS", "latin1"), Buffer.alloc(4096)]));
guardar("audio.flac", Buffer.concat([Buffer.from("fLaC", "latin1"), Buffer.alloc(4096)]));
guardar("texto.mp3", Buffer.from("Esto no es un audio.\n"));

const alac = sinPerdida(escala);
if (alac) guardar("sin-perdida.m4a", alac);
else console.error("Falta afconvert (solo existe en macOS): no se hizo sin-perdida.m4a.");

console.log(`Archivos para validar F14 en ${carpeta}`);
