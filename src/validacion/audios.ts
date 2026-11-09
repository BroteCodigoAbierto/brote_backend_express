import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_AUDIOS,
  MENSAJES_AUDIOS,
  TIPOS_MIME_AUDIO_SUBIDA,
  type FormatoAudio,
} from "../tipos/contrato.ts";

// Leer un audio sin paquetes (brote_specs, research de F14, puntos 3 y 4): su formato real,
// su duración y el mismo audio sin sus datos ocultos (título, artista, carátula, el lugar de
// una nota de voz). Solo se recorren las cabeceras y los bloques de cada formato: el sonido
// se copia tal cual, sin volver a comprimirlo. Un audio que guarda el sonido de una forma
// que no se oye en todos los clientes cuenta como que no se pudo leer.

type Leido = { duracion: number; limpio: Buffer };

export type AudioLeido = Leido & { formato: FormatoAudio };

function ascii(bytes: Buffer, desde: number, largo: number): string {
  return bytes.toString("latin1", desde, desde + largo);
}

// ---------------------------------------------------------------------------
// MP3
// ---------------------------------------------------------------------------

// https://www.mp3-tech.org/programmer/frame_header.html
// La tasa en kbps según su índice (1 a 14), en la capa III: MPEG 1, y MPEG 2 y 2.5.
const TASAS_MPEG1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const TASAS_MPEG2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
// La frecuencia según su índice (0 a 2), por versión: 3 es MPEG 1, 2 es MPEG 2 y 0 es MPEG 2.5
// (1 está reservada).
const FRECUENCIAS_MPEG: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};
// Menos cuadros seguidos que esto son datos que por casualidad parecen un encabezado.
const CUADROS_MINIMOS = 10;

type CuadroMp3 = { version: number; frecuencia: number; largo: number; muestras: number };

function tieneSincroniaMpeg(bytes: Buffer, posicion: number): boolean {
  return bytes[posicion] === 0xff && ((bytes[posicion + 1] ?? 0) & 0xe0) === 0xe0;
}

// Un encabezado de cuadro de la capa III: las capas I y II, la tasa libre y los valores
// reservados no cuentan.
function leerCuadroMp3(bytes: Buffer, posicion: number): CuadroMp3 | null {
  if (posicion + 4 > bytes.length || !tieneSincroniaMpeg(bytes, posicion)) return null;
  const b1 = bytes[posicion + 1]!;
  const b2 = bytes[posicion + 2]!;
  const version = (b1 >> 3) & 0b11;
  const capa = (b1 >> 1) & 0b11;
  const indiceTasa = b2 >> 4;
  const indiceFrecuencia = (b2 >> 2) & 0b11;
  if (version === 1 || capa !== 0b01) return null;
  if (indiceTasa === 0 || indiceTasa === 15 || indiceFrecuencia === 3) return null;
  const mpeg1 = version === 3;
  const tasa = (mpeg1 ? TASAS_MPEG1 : TASAS_MPEG2)[indiceTasa]! * 1000;
  const frecuencia = FRECUENCIAS_MPEG[version]![indiceFrecuencia]!;
  const relleno = (b2 >> 1) & 1;
  return {
    version,
    frecuencia,
    largo: Math.floor(((mpeg1 ? 144 : 72) * tasa) / frecuencia) + relleno,
    muestras: mpeg1 ? 1152 : 576,
  };
}

// https://id3.org/id3v2.4.0-structure: "ID3", la versión, las banderas y el tamaño en cuatro
// bytes de 7 bits (synchsafe), sin los 10 de la cabecera ni los 10 del pie, si lo trae. Puede
// haber más de una etiqueta seguida. Devuelve dónde terminan, o -1 si se salen del archivo.
function saltarId3(bytes: Buffer): number {
  let posicion = 0;
  while (ascii(bytes, posicion, 3) === "ID3") {
    if (posicion + 10 > bytes.length) return -1;
    const tamano =
      ((bytes[posicion + 6]! & 0x7f) << 21) |
      ((bytes[posicion + 7]! & 0x7f) << 14) |
      ((bytes[posicion + 8]! & 0x7f) << 7) |
      (bytes[posicion + 9]! & 0x7f);
    const pie = bytes[posicion + 5]! & 0x10 ? 10 : 0;
    posicion += 10 + tamano + pie;
  }
  return posicion > bytes.length ? -1 : posicion;
}

type CadenaMp3 = { fin: number; cuadros: number; muestras: number; frecuencia: number };

// Los cuadros completos seguidos desde `inicio`, de la misma versión y frecuencia (la tasa
// puede cambiar: un MP3 de tasa variable). Termina en lo que no es un cuadro: la etiqueta
// ID3v1 (TAG), una APE (APETAGEX), Lyrics3 (LYRICS) o basura.
function recorrerCuadros(bytes: Buffer, inicio: number): CadenaMp3 | null {
  const primero = leerCuadroMp3(bytes, inicio);
  if (!primero) return null;
  let posicion = inicio;
  let cuadros = 0;
  let muestras = 0;
  for (;;) {
    const cuadro = leerCuadroMp3(bytes, posicion);
    if (
      !cuadro ||
      cuadro.version !== primero.version ||
      cuadro.frecuencia !== primero.frecuencia ||
      posicion + cuadro.largo > bytes.length
    ) {
      break;
    }
    cuadros += 1;
    muestras += cuadro.muestras;
    posicion += cuadro.largo;
  }
  return { fin: posicion, cuadros, muestras, frecuencia: primero.frecuencia };
}

// Lo limpio son solo los cuadros, uno tras otro: se van las etiquetas del inicio y del final.
// El cuadro Xing o Info del codificador se queda: es un cuadro más y solo dice cómo se
// codificó.
export function leerMp3(bytes: Buffer): Leido | null {
  const desde = saltarId3(bytes);
  if (desde < 0) return null;
  for (let inicio = desde; inicio + 4 <= bytes.length; inicio++) {
    if (bytes[inicio] !== 0xff) continue;
    const cadena = recorrerCuadros(bytes, inicio);
    if (cadena && cadena.cuadros >= CUADROS_MINIMOS) {
      return {
        duracion: Math.round((cadena.muestras / cadena.frecuencia) * 1000),
        limpio: bytes.subarray(inicio, cadena.fin),
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// WAV
// ---------------------------------------------------------------------------

// http://soundfile.sapp.org/doc/WaveFormat/ y, para WAVE_FORMAT_EXTENSIBLE (0xFFFE),
// https://learn.microsoft.com/windows/win32/api/mmreg/ns-mmreg-waveformatextensible
// El subformato PCM es el GUID 00000001-0000-0010-8000-00aa00389b71, con sus tres primeros
// campos en little endian.
const SUBFORMATO_PCM = Buffer.from("0100000000001000800000aa00389b71", "hex");

// PCM entero: ni punto flotante, ni ADPCM, ni µ-law.
function esPcmEntero(fmt: Buffer): boolean {
  if (fmt.length < 16) return false;
  const formato = fmt.readUInt16LE(0);
  if (formato === 1) return true;
  return formato === 0xfffe && fmt.length >= 40 && fmt.subarray(24, 40).equals(SUBFORMATO_PCM);
}

// Un bloque de RIFF: su nombre, su largo y su contenido, con un byte de relleno si es impar.
function bloqueRiff(nombre: string, contenido: Buffer): Buffer {
  const cabecera = Buffer.alloc(8);
  cabecera.write(nombre, 0, "latin1");
  cabecera.writeUInt32LE(contenido.length, 4);
  return Buffer.concat([cabecera, contenido, Buffer.alloc(contenido.length % 2)]);
}

// Lo limpio es un WAV nuevo con solo `fmt ` y `data`: se van LIST/INFO, id3, bext, iXML y lo
// demás.
export function leerWav(bytes: Buffer): Leido | null {
  if (bytes.length < 12 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WAVE") {
    return null;
  }
  let fmt: Buffer | null = null;
  let datos: Buffer | null = null;
  let posicion = 12;
  while (posicion + 8 <= bytes.length) {
    const nombre = ascii(bytes, posicion, 4);
    const largo = bytes.readUInt32LE(posicion + 4);
    const inicio = posicion + 8;
    if (inicio + largo > bytes.length) {
      // un `fmt ` o un `data` que se salen del archivo: está cortado
      if (nombre === "fmt " || nombre === "data") return null;
      break;
    }
    if (nombre === "fmt " && !fmt) fmt = bytes.subarray(inicio, inicio + largo);
    if (nombre === "data" && !datos) datos = bytes.subarray(inicio, inicio + largo);
    posicion = inicio + largo + (largo % 2);
  }
  if (!fmt || !datos || !esPcmEntero(fmt)) return null;
  const canales = fmt.readUInt16LE(2);
  const frecuencia = fmt.readUInt32LE(4);
  const bits = fmt.readUInt16LE(14);
  if (![1, 2].includes(canales) || ![8, 16, 24].includes(bits)) return null;
  if (frecuencia < 8000 || frecuencia > 48000) return null;
  const bytesPorSegundo = frecuencia * canales * (bits / 8);
  return {
    duracion: Math.round((datos.length / bytesPorSegundo) * 1000),
    limpio: bloqueRiff(
      "RIFF",
      Buffer.concat([
        Buffer.from("WAVE", "latin1"),
        bloqueRiff("fmt ", fmt),
        bloqueRiff("data", datos),
      ]),
    ),
  };
}

// ---------------------------------------------------------------------------
// M4A
// ---------------------------------------------------------------------------

// ISO/IEC 14496-12 (ISO Base Media File Format): un archivo es una lista de cajas, cada una
// con su largo (4 bytes, o 8 más si vale 1, o hasta el final si vale 0), su tipo y su
// contenido, que en las contenedoras son más cajas.
// https://developer.apple.com/documentation/quicktime-file-format
type Caja = { tipo: string; contenido: Buffer; inicio: number };

function leerCajas(bytes: Buffer): Caja[] | null {
  const cajas: Caja[] = [];
  let posicion = 0;
  while (posicion < bytes.length) {
    if (posicion + 8 > bytes.length) return null;
    const tipo = ascii(bytes, posicion, 4 + 4).slice(4);
    let largo = bytes.readUInt32BE(posicion);
    let cabecera = 8;
    if (largo === 1) {
      if (posicion + 16 > bytes.length) return null;
      const largo64 = bytes.readBigUInt64BE(posicion + 8);
      if (largo64 > BigInt(bytes.length)) return null;
      largo = Number(largo64);
      cabecera = 16;
    } else if (largo === 0) {
      largo = bytes.length - posicion;
    }
    if (largo < cabecera || posicion + largo > bytes.length) return null;
    cajas.push({
      tipo,
      contenido: bytes.subarray(posicion + cabecera, posicion + largo),
      inicio: posicion + cabecera,
    });
    posicion += largo;
  }
  return cajas;
}

function buscar(cajas: Caja[] | null | undefined, tipo: string): Caja | null {
  return cajas?.find((caja) => caja.tipo === tipo) ?? null;
}

function hijas(caja: Caja | null): Caja[] | null {
  return caja ? leerCajas(caja.contenido) : null;
}

function caja(tipo: string, contenido: Buffer): Buffer {
  const cabecera = Buffer.alloc(8);
  cabecera.writeUInt32BE(8 + contenido.length, 0);
  cabecera.write(tipo, 4, "latin1");
  return Buffer.concat([cabecera, contenido]);
}

// `hdlr` (una caja completa: versión y banderas, 4 bytes de nada y el tipo): "soun" es una
// pista de sonido; "vide", de video; "meta", "text", "sbtl" y "tmcd", de otras cosas.
function tipoDePista(trak: Caja): string | null {
  const hdlr = buscar(hijas(buscar(hijas(trak), "mdia")), "hdlr");
  return hdlr && hdlr.contenido.length >= 12 ? ascii(hdlr.contenido, 8, 4) : null;
}

// El largo de un descriptor de MPEG-4 (ISO/IEC 14496-1, 8.3.3): de 1 a 4 bytes de 7 bits.
function leerDescriptor(
  bytes: Buffer,
  posicion: number,
): { etiqueta: number; inicio: number } | null {
  if (posicion >= bytes.length) return null;
  const etiqueta = bytes[posicion]!;
  let i = posicion + 1;
  for (let n = 0; n < 4; n++) {
    const byte = bytes[i++];
    if (byte === undefined) return null;
    if (!(byte & 0x80)) break;
  }
  return { etiqueta, inicio: i };
}

// `esds` lleva un ES_Descriptor (0x03) con su DecoderConfigDescriptor (0x04), cuyo primer byte
// dice el códec: 0x40 es el audio de MPEG-4, AAC.
function esAac(esds: Buffer): boolean {
  const es = leerDescriptor(esds, 4); // después de la versión y las banderas
  if (es?.etiqueta !== 0x03) return false;
  let posicion = es.inicio + 2; // ES_ID
  const banderas = esds[posicion];
  if (banderas === undefined) return false;
  posicion += 1;
  if (banderas & 0x80) posicion += 2; // depende de otro flujo
  if (banderas & 0x40) posicion += 1 + (esds[posicion] ?? 0); // una URL
  if (banderas & 0x20) posicion += 2; // OCR
  const config = leerDescriptor(esds, posicion);
  return config?.etiqueta === 0x04 && esds[config.inicio] === 0x40;
}

// La única entrada de `stsd` (versión, banderas y cuántas hay; luego las entradas) es `mp4a`
// con un `esds` de AAC. Antes de sus cajas, `mp4a` lleva 8 bytes de SampleEntry y 20 de
// AudioSampleEntry; las versiones 1 y 2 de QuickTime agregan 16 o 36, y pueden guardar
// `esds` dentro de `wave`. ALAC (`alac`) y Opus (`Opus`) no se oyen en todos los clientes.
function esPistaAac(stsd: Caja | null): boolean {
  if (!stsd || stsd.contenido.length < 8 || stsd.contenido.readUInt32BE(4) !== 1) return false;
  const entrada = leerCajas(stsd.contenido.subarray(8))?.[0];
  if (entrada?.tipo !== "mp4a" || entrada.contenido.length < 28) return false;
  const version = entrada.contenido.readUInt16BE(8);
  const desde = 28 + (version === 1 ? 16 : version === 2 ? 36 : 0);
  const cajas = leerCajas(entrada.contenido.subarray(desde));
  const esds = buscar(cajas, "esds") ?? buscar(hijas(buscar(cajas, "wave")), "esds");
  return esds !== null && esAac(esds.contenido);
}

// `mdhd`: la escala (unidades por segundo) y la duración, de 32 bits en la versión 0 y de 64
// en la 1.
function duracionDePista(mdhd: Caja | null): number | null {
  if (!mdhd) return null;
  const datos = mdhd.contenido;
  const v1 = datos[0] === 1;
  if (datos.length < (v1 ? 32 : 20)) return null;
  const escala = datos.readUInt32BE(v1 ? 20 : 12);
  const duracion = v1 ? Number(datos.readBigUInt64BE(24)) : datos.readUInt32BE(16);
  return escala === 0 ? null : Math.round((duracion / escala) * 1000);
}

type Trozo = { inicio: number; largo: number };

type Trozos = { trozos: Trozo[]; tabla: Caja };

// Dónde empieza cada trozo de la pista lo dice `stco` (32 bits) o `co64` (64), y cuánto mide,
// la suma de sus muestras: `stsc` dice cuántas tiene cada trozo (por tramos: desde qué trozo,
// cuántas) y `stsz`, cuánto mide cada una (o todas, si es fijo).
function trozosDePista(stbl: Caja[]): Trozos | null {
  const stsc = buscar(stbl, "stsc")?.contenido;
  const stsz = buscar(stbl, "stsz")?.contenido;
  const tabla = buscar(stbl, "stco") ?? buscar(stbl, "co64");
  if (!stsc || !stsz || !tabla || (buscar(stbl, "stco") && buscar(stbl, "co64"))) return null;

  const ancho = tabla.tipo === "stco" ? 4 : 8;
  const cantidad = tabla.contenido.readUInt32BE(4);
  if (8 + cantidad * ancho > tabla.contenido.length) return null;
  const inicioDe = (t: number) =>
    ancho === 4
      ? tabla.contenido.readUInt32BE(8 + 4 * t)
      : Number(tabla.contenido.readBigUInt64BE(8 + 8 * t));

  const tamanoFijo = stsz.readUInt32BE(4);
  const muestras = stsz.readUInt32BE(8);
  if (tamanoFijo === 0 && 12 + muestras * 4 > stsz.length) return null;
  const tamanoDe = (m: number) => tamanoFijo || stsz.readUInt32BE(12 + 4 * m);

  const tramos = stsc.readUInt32BE(4);
  if (tramos === 0 || 8 + tramos * 12 > stsc.length) return null;
  const primerTrozo = (e: number) => stsc.readUInt32BE(8 + 12 * e);
  const porTrozo = (e: number) => stsc.readUInt32BE(8 + 12 * e + 4);
  if (primerTrozo(0) !== 1) return null;

  const trozos: Trozo[] = [];
  let tramo = 0;
  let muestra = 0;
  for (let t = 0; t < cantidad; t++) {
    while (tramo + 1 < tramos && primerTrozo(tramo + 1) <= t + 1) tramo += 1;
    const deEste = porTrozo(tramo);
    if (deEste === 0 || muestra + deEste > muestras) return null;
    let largo = 0;
    for (let m = 0; m < deEste; m++) largo += tamanoDe(muestra++);
    trozos.push({ inicio: inicioDe(t), largo });
  }
  return muestra === muestras ? { trozos, tabla } : null;
}

// Fuera de la pista de sonido no queda nada; dentro, tampoco sus datos ocultos.
const QUITAR_DE_LA_PISTA = new Set(["udta", "meta", "uuid"]);

// Rearma `contenedora` sin lo que hay que quitar, bajando por `ruta` (mdia, minf, stbl)
// hasta la tabla de inicios de los trozos, que cambia por `tabla`.
function rearmar(contenedora: Caja, ruta: string[], tabla: Buffer): Buffer | null {
  const cajas = leerCajas(contenedora.contenido);
  if (!cajas) return null;
  const partes: Buffer[] = [];
  for (const hija of cajas) {
    if (QUITAR_DE_LA_PISTA.has(hija.tipo)) continue;
    if (ruta.length > 0 && hija.tipo === ruta[0]) {
      const rearmada = rearmar(hija, ruta.slice(1), tabla);
      if (!rearmada) return null;
      partes.push(rearmada);
    } else if (ruta.length === 0 && (hija.tipo === "stco" || hija.tipo === "co64")) {
      partes.push(caja(hija.tipo, tabla));
    } else {
      partes.push(caja(hija.tipo, hija.contenido));
    }
  }
  return caja(contenedora.tipo, Buffer.concat(partes));
}

// La tabla de inicios con su versión y banderas, su cantidad y un inicio por trozo.
function tablaDeInicios(original: Caja, inicios: number[]): Buffer {
  const ancho = original.tipo === "stco" ? 4 : 8;
  const tabla = Buffer.alloc(8 + inicios.length * ancho);
  original.contenido.copy(tabla, 0, 0, 4);
  tabla.writeUInt32BE(inicios.length, 4);
  inicios.forEach((inicio, t) => {
    if (ancho === 4) tabla.writeUInt32BE(inicio, 8 + 4 * t);
    else tabla.writeBigUInt64BE(BigInt(inicio), 8 + 8 * t);
  });
  return tabla;
}

// Lo limpio es `ftyp` + `moov` (con `mvhd` y solo la pista de sonido) + un `mdat` nuevo con
// solo los trozos de esa pista, en orden: así tampoco quedan dentro los datos de las pistas
// descartadas, como el lugar de una nota de voz del iPhone. Se van `free`, `skip`, `wide`,
// `udta`, `meta` y `uuid`. El sonido no se toca.
export function leerM4a(bytes: Buffer): Leido | null {
  const cajas = leerCajas(bytes);
  if (!cajas || cajas[0]?.tipo !== "ftyp") return null;
  const moovs = cajas.filter(({ tipo }) => tipo === "moov");
  const mdats = cajas.filter(({ tipo }) => tipo === "mdat");
  // un archivo fragmentado (moof) guarda el sonido en otra parte
  if (moovs.length !== 1 || mdats.length !== 1 || buscar(cajas, "moof")) return null;
  const [moov, mdat] = [moovs[0]!, mdats[0]!];

  const enMoov = leerCajas(moov.contenido);
  const mvhd = buscar(enMoov, "mvhd");
  if (!enMoov || !mvhd) return null;
  const pistas = enMoov.filter(({ tipo }) => tipo === "trak");
  const tipos = pistas.map(tipoDePista);
  if (tipos.includes("vide")) return null;
  const deSonido = pistas.filter((_, i) => tipos[i] === "soun");
  if (deSonido.length !== 1) return null;
  const pista = deSonido[0]!;

  const mdia = buscar(hijas(pista), "mdia");
  const stbl = hijas(buscar(hijas(buscar(hijas(mdia), "minf")), "stbl"));
  if (!stbl || !esPistaAac(buscar(stbl, "stsd"))) return null;
  const duracion = duracionDePista(buscar(hijas(mdia), "mdhd"));
  const deLaPista = trozosDePista(stbl);
  if (duracion === null || !deLaPista) return null;
  const { trozos, tabla } = deLaPista;
  const finMdat = mdat.inicio + mdat.contenido.length;
  if (trozos.some(({ inicio, largo }) => inicio < mdat.inicio || inicio + largo > finMdat)) {
    return null;
  }

  // Los inicios nuevos dependen del largo del moov, que no depende de sus valores: se arma
  // una vez con ceros para medirlo y otra con los de verdad.
  const ftyp = caja("ftyp", cajas[0].contenido);
  const armarMoov = (inicios: number[]) => {
    const trak = rearmar(pista, ["mdia", "minf", "stbl"], tablaDeInicios(tabla, inicios));
    return trak && caja("moov", Buffer.concat([caja("mvhd", mvhd.contenido), trak]));
  };
  const medida = armarMoov(trozos.map(() => 0));
  if (!medida) return null;
  let siguiente = ftyp.length + medida.length + 8; // después de la cabecera del mdat nuevo
  const inicios = trozos.map(({ largo }) => {
    const inicio = siguiente;
    siguiente += largo;
    return inicio;
  });
  const moovNuevo = armarMoov(inicios)!;
  const sonido = Buffer.concat(
    trozos.map(({ inicio, largo }) => bytes.subarray(inicio, inicio + largo)),
  );
  return { duracion, limpio: Buffer.concat([ftyp, moovNuevo, caja("mdat", sonido)]) };
}

// ---------------------------------------------------------------------------
// Cualquiera de los tres
// ---------------------------------------------------------------------------

const LECTORES: Record<FormatoAudio, (bytes: Buffer) => Leido | null> = {
  mp3: leerMp3,
  m4a: leerM4a,
  wav: leerWav,
};

// El formato por sus primeros bytes, no por su nombre ni su Content-Type.
function formatoPorFirma(bytes: Buffer): FormatoAudio | null {
  if (ascii(bytes, 0, 3) === "ID3" || tieneSincroniaMpeg(bytes, 0)) return "mp3";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") return "wav";
  if (ascii(bytes, 4, 4) === "ftyp") return "m4a";
  return null;
}

function leerSegunFirma(bytes: Buffer): AudioLeido | null {
  const formato = formatoPorFirma(bytes);
  const leido = formato && LECTORES[formato](bytes);
  return formato && leido && leido.duracion > 0 ? { formato, ...leido } : null;
}

// null si no es un MP3, un M4A ni un WAV que se oiga en todos los clientes, o está cortado.
// Lo limpio se vuelve a leer y tiene que dar lo mismo: un error al limpiar nunca guarda un
// audio roto (research de F14, punto 4).
export function leerAudio(bytes: Buffer): AudioLeido | null {
  try {
    const leido = leerSegunFirma(bytes);
    if (!leido) return null;
    const otraVez = leerSegunFirma(leido.limpio);
    if (otraVez?.formato !== leido.formato || otraVez.duracion !== leido.duracion) return null;
    return leido;
  } catch {
    // un largo de bloque o de caja que apunta fuera del archivo
    return null;
  }
}

export type AudioSubido = { bytes: Buffer; formato: FormatoAudio; duracion: number };

const TIPOS_ACEPTADOS: readonly string[] = TIPOS_MIME_AUDIO_SUBIDA;

// El cuerpo de POST /editor/cursos/:idCurso/audios, en el orden de contracts/api.md de F14:
// formato, lectura y duración. El formato que cuenta es el de los bytes; lo que se guarda, el
// audio limpio. La duración se compara redondeada a décimas: 30.04 s, por el relleno del
// codificador, cuentan como 30.
export function comprobarAudioSubido(cuerpo: unknown, tipo: string | undefined): AudioSubido {
  const tipoBase = tipo?.split(";")[0]?.trim().toLowerCase();
  if (
    !Buffer.isBuffer(cuerpo) ||
    cuerpo.length === 0 ||
    !TIPOS_ACEPTADOS.includes(tipoBase ?? "")
  ) {
    throw new ErrorApi(400, MENSAJES_AUDIOS.formatoInvalido);
  }
  const audio = leerAudio(cuerpo);
  if (!audio) throw new ErrorApi(400, MENSAJES_AUDIOS.audioIlegible);
  if (Math.round(audio.duracion / 100) * 100 > LIMITES_AUDIOS.duracionMax) {
    throw new ErrorApi(400, MENSAJES_AUDIOS.audioLargo);
  }
  return { bytes: audio.limpio, formato: audio.formato, duracion: audio.duracion };
}
