// Audios de prueba de F14: melodías de notas senoidales, hechas en código (brote_specs,
// research de F14, punto 16). No son una voz, así que no se confunden con la del dispositivo,
// en una nota sostenida se oye fácil si "Más lento" la vuelve más grave, y no dependen de la
// licencia de ninguna voz. El WAV se codifica aquí; el MP3 y el M4A no se pueden codificar
// sin un paquete grande, así que van en scripts/audios-prueba/, ya hechos con
// `npm run audios:generar`.

import { readFileSync } from "node:fs";

export type Sonido = { muestras: Int16Array; frecuencia: number; canales: number };

export type Nota = { hz: number; segundos: number };

// http://soundfile.sapp.org/doc/WaveFormat/: PCM de 16 bits, con solo `fmt ` y `data`.
export function codificarWav({ muestras, frecuencia, canales }: Sonido): Buffer {
  const datos = Buffer.alloc(muestras.length * 2);
  muestras.forEach((muestra, i) => datos.writeInt16LE(muestra, i * 2));
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0); // PCM
  fmt.writeUInt16LE(canales, 2);
  fmt.writeUInt32LE(frecuencia, 4);
  fmt.writeUInt32LE(frecuencia * canales * 2, 8); // bytes por segundo
  fmt.writeUInt16LE(canales * 2, 12); // bytes por muestra de todos los canales
  fmt.writeUInt16LE(16, 14);
  const bloque = (nombre: string, contenido: Buffer) => {
    const cabecera = Buffer.alloc(8);
    cabecera.write(nombre, 0, "latin1");
    cabecera.writeUInt32LE(contenido.length, 4);
    return Buffer.concat([cabecera, contenido, Buffer.alloc(contenido.length % 2)]);
  };
  return bloque(
    "RIFF",
    Buffer.concat([Buffer.from("WAVE", "latin1"), bloque("fmt ", fmt), bloque("data", datos)]),
  );
}

// 10 ms de ataque y de caída en cada nota, para que no truene al empezar ni al terminar.
const ORILLA_SEGUNDOS = 0.01;
const VOLUMEN = 0.5;

// Mono. Las notas van una tras otra, cada una de su duración exacta en muestras.
export function melodia(notas: Nota[], frecuencia = 22050): Sonido {
  const largos = notas.map(({ segundos }) => Math.round(segundos * frecuencia));
  const muestras = new Int16Array(largos.reduce((total, largo) => total + largo, 0));
  const orilla = Math.round(ORILLA_SEGUNDOS * frecuencia);
  let posicion = 0;
  notas.forEach(({ hz }, n) => {
    const largo = largos[n]!;
    for (let i = 0; i < largo; i++) {
      const envolvente = Math.min(1, i / orilla, (largo - 1 - i) / orilla);
      const valor = Math.sin((2 * Math.PI * hz * i) / frecuencia) * envolvente * VOLUMEN;
      muestras[posicion + i] = Math.round(valor * 32767);
    }
    posicion += largo;
  });
  return { muestras, frecuencia, canales: 1 };
}

export const NOTAS = { do: 262, re: 294, mi: 330, fa: 349, sol: 392 } as const;

type NombreNota = keyof typeof NOTAS;

function notas(nombres: NombreNota[], segundos: number): Nota[] {
  return nombres.map((nombre) => ({ hz: NOTAS[nombre], segundos }));
}

const SUBE: NombreNota[] = ["do", "re", "mi", "fa", "sol"];

// Las melodías de los cursos de prueba. La de treinta segundos sube y baja despacio: 9 notas
// de 30 / 9 s, que a 22 050 Hz son 73 500 muestras exactas cada una.
export const MELODIAS = {
  "escala-sube": notas(SUBE, 0.8),
  "escala-baja": notas([...SUBE].reverse(), 0.8),
  "tres-notas": notas(["do", "mi", "sol"], 0.8),
  "treinta-segundos": notas([...SUBE, "fa", "mi", "re", "do"], 30 / 9),
} satisfies Record<string, Nota[]>;

function enCarpeta(nombre: string): () => Buffer {
  return () => readFileSync(new URL(`./audios-prueba/${nombre}`, import.meta.url));
}

// Nombre → los bytes del audio. Se arman solo los que se piden.
export const AUDIOS_PRUEBA: Record<string, () => Buffer> = {
  "escala-sube.wav": () => codificarWav(melodia(MELODIAS["escala-sube"])),
  "escala-baja.wav": () => codificarWav(melodia(MELODIAS["escala-baja"])),
  "tres-notas.wav": () => codificarWav(melodia(MELODIAS["tres-notas"])),
  "treinta-segundos.wav": () => codificarWav(melodia(MELODIAS["treinta-segundos"])),
  "escala-sube.mp3": enCarpeta("escala-sube.mp3"),
  "escala-baja.m4a": enCarpeta("escala-baja.m4a"),
};
