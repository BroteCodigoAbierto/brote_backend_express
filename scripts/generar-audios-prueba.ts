// Rehace los dos audios de prueba que van en git ya codificados (brote_specs, research de
// F14, punto 16): `npm run audios:generar`. Parte de los WAV de scripts/audios-prueba.ts:
// el M4A (AAC) sale con afconvert, que viene con macOS, y el MP3 con lame (Homebrew: `brew
// install lame`). Solo hace falta para cambiarlos, no para correr ni validar Brote.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIOS_PRUEBA } from "./audios-prueba.ts";

const DESTINO = fileURLToPath(new URL("./audios-prueba/", import.meta.url));

// Cada uno: el WAV del que sale, el programa, sus argumentos y cómo instalarlo si falta.
const CONVERSIONES = [
  {
    archivo: "escala-baja.m4a",
    desde: "escala-baja.wav",
    programa: "afconvert",
    argumentos: (wav: string, salida: string) => ["-f", "m4af", "-d", "aac", wav, salida],
    falta: "afconvert viene con macOS; en otro sistema, haz el M4A en una Mac.",
  },
  {
    archivo: "escala-sube.mp3",
    desde: "escala-sube.wav",
    programa: "lame",
    // mono, 64 kbps: unos 32 KB para 4 s
    argumentos: (wav: string, salida: string) => ["--quiet", "-m", "m", "-b", "64", wav, salida],
    falta: "Instálalo con `brew install lame`.",
  },
];

function existe(programa: string): boolean {
  try {
    execFileSync("which", [programa], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const faltan = CONVERSIONES.filter(({ programa }) => !existe(programa));
if (faltan.length > 0) {
  for (const { programa, falta } of faltan) console.error(`✗ Falta ${programa}. ${falta}`);
  process.exit(1);
}

const temporal = mkdtempSync(join(tmpdir(), "brote-audios-"));
try {
  mkdirSync(DESTINO, { recursive: true });
  for (const { archivo, desde, programa, argumentos } of CONVERSIONES) {
    const wav = join(temporal, desde);
    writeFileSync(wav, AUDIOS_PRUEBA[desde]!());
    execFileSync(programa, argumentos(wav, join(DESTINO, archivo)), { stdio: "inherit" });
    console.log(`✓ scripts/audios-prueba/${archivo}`);
  }
} finally {
  rmSync(temporal, { recursive: true, force: true });
}
