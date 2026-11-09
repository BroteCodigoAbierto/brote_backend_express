import { ErrorApi } from "../middleware/errores.ts";
import {
  LIMITES_IMAGENES,
  MENSAJES_IMAGENES,
  TIPO_MIME_IMAGEN,
  type FormatoImagen,
} from "../tipos/contrato.ts";

// Lo que el servidor sabe de una imagen sin decodificarla (brote_specs, research de F13,
// punto 3): su formato real, su tamaño y si todavía trae datos ocultos o una animación.
// Se lee de las cabeceras y los bloques de cada formato, sin paquetes.

export type DatosImagen = {
  formato: FormatoImagen;
  ancho: number;
  alto: number;
  // trae EXIF, XMP, IPTC, texto o una animación que no es GIF: la web nunca la manda así
  sinPreparar: boolean;
};

function empiezaCon(bytes: Buffer, firma: number[], desde = 0): boolean {
  return firma.every((byte, i) => bytes[desde + i] === byte);
}

function ascii(bytes: Buffer, desde: number, largo: number): string {
  return bytes.toString("latin1", desde, desde + largo);
}

// https://www.w3.org/TR/png-3/#5Chunk-layout
// IHDR va primero, con el ancho y el alto. Los bloques de texto (tEXt, zTXt, iTXt, donde
// también va XMP), eXIf y acTL (un PNG animado) son lo que la web no deja pasar.
const BLOQUES_PNG_SIN_PREPARAR = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "acTL"]);

function leerPng(bytes: Buffer): DatosImagen | null {
  if (bytes.length < 33 || ascii(bytes, 12, 4) !== "IHDR") return null;
  const ancho = bytes.readUInt32BE(16);
  const alto = bytes.readUInt32BE(20);
  let sinPreparar = false;
  let posicion = 8;
  while (posicion + 8 <= bytes.length) {
    const largo = bytes.readUInt32BE(posicion);
    const tipo = ascii(bytes, posicion + 4, 4);
    if (BLOQUES_PNG_SIN_PREPARAR.has(tipo)) sinPreparar = true;
    if (tipo === "IEND") break;
    posicion += 12 + largo;
  }
  return { formato: "png", ancho, alto, sinPreparar };
}

// https://www.w3.org/Graphics/JPEG/itu-t81.pdf, anexo B
// El tamaño está en el primer SOFn (C0 a CF, menos C4, C8 y CC, que no son marcos). APP1
// lleva EXIF (la ubicación, la cámara y la orientación) o XMP, y APP13, IPTC.
function esMarcadorSof(marcador: number): boolean {
  return marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);
}

function esMarcadorSinLargo(marcador: number): boolean {
  return (marcador >= 0xd0 && marcador <= 0xd8) || marcador === 0x01;
}

function leerJpeg(bytes: Buffer): DatosImagen | null {
  let ancho = 0;
  let alto = 0;
  let sinPreparar = false;
  let posicion = 2;
  while (posicion + 4 <= bytes.length) {
    if (bytes[posicion] !== 0xff) return null;
    const marcador = bytes[posicion + 1]!;
    if (marcador === 0xff) {
      posicion += 1; // relleno entre marcadores
      continue;
    }
    if (esMarcadorSinLargo(marcador)) {
      posicion += 2;
      continue;
    }
    if (marcador === 0xda || marcador === 0xd9) break; // SOS: empiezan los datos
    const largo = bytes.readUInt16BE(posicion + 2);
    if (marcador === 0xe1 || marcador === 0xed) sinPreparar = true;
    if (esMarcadorSof(marcador) && ancho === 0 && posicion + 9 <= bytes.length) {
      alto = bytes.readUInt16BE(posicion + 5);
      ancho = bytes.readUInt16BE(posicion + 7);
    }
    posicion += 2 + largo;
  }
  if (ancho === 0 || alto === 0) return null;
  return { formato: "jpeg", ancho, alto, sinPreparar };
}

// https://developers.google.com/speed/webp/docs/riff_container
// El primer bloque es VP8 (con pérdida), VP8L (sin pérdida) o VP8X (extendido). EXIF, "XMP "
// y ANIM son lo que la web no deja pasar.
const BLOQUES_WEBP_SIN_PREPARAR = new Set(["EXIF", "XMP ", "ANIM"]);

function tamanoWebp(bytes: Buffer, bloque: string): { ancho: number; alto: number } | null {
  if (bloque === "VP8 " && bytes.length >= 30 && empiezaCon(bytes, [0x9d, 0x01, 0x2a], 23)) {
    return { ancho: bytes.readUInt16LE(26) & 0x3fff, alto: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (bloque === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = bytes.readUInt32LE(21);
    return { ancho: (bits & 0x3fff) + 1, alto: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (bloque === "VP8X" && bytes.length >= 30) {
    return { ancho: bytes.readUIntLE(24, 3) + 1, alto: bytes.readUIntLE(27, 3) + 1 };
  }
  return null;
}

function leerWebp(bytes: Buffer): DatosImagen | null {
  const tamano = tamanoWebp(bytes, ascii(bytes, 12, 4));
  if (!tamano) return null;
  let sinPreparar = false;
  let posicion = 12;
  while (posicion + 8 <= bytes.length) {
    const tipo = ascii(bytes, posicion, 4);
    const largo = bytes.readUInt32LE(posicion + 4);
    if (BLOQUES_WEBP_SIN_PREPARAR.has(tipo)) sinPreparar = true;
    posicion += 8 + largo + (largo % 2); // los bloques se rellenan a un número par
  }
  return { formato: "webp", ...tamano, sinPreparar };
}

// https://www.w3.org/Graphics/GIF/spec-gif89a.txt
// Un GIF se sube tal cual para que se mueva y no es una foto: no se revisan sus bloques.
function leerGif(bytes: Buffer): DatosImagen | null {
  if (bytes.length < 10) return null;
  return {
    formato: "gif",
    ancho: bytes.readUInt16LE(6),
    alto: bytes.readUInt16LE(8),
    sinPreparar: false,
  };
}

function leerSegunFirma(bytes: Buffer): DatosImagen | null {
  if (empiezaCon(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return leerPng(bytes);
  if (empiezaCon(bytes, [0xff, 0xd8, 0xff])) return leerJpeg(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return leerWebp(bytes);
  if (["GIF87a", "GIF89a"].includes(ascii(bytes, 0, 6))) return leerGif(bytes);
  return null;
}

// null si no es una imagen de los cuatro formatos o su cabecera está cortada.
export function leerImagen(bytes: Buffer): DatosImagen | null {
  try {
    const datos = leerSegunFirma(bytes);
    return datos && datos.ancho > 0 && datos.alto > 0 ? datos : null;
  } catch {
    // un largo de bloque que apunta fuera del archivo
    return null;
  }
}

const TIPOS_ACEPTADOS: string[] = Object.values(TIPO_MIME_IMAGEN);

export type ImagenSubida = { bytes: Buffer; formato: FormatoImagen; ancho: number; alto: number };

// El cuerpo de POST /editor/cursos/:idCurso/imagenes, en el orden de contracts/api.md de
// F13. El formato que cuenta es el de los bytes, no el Content-Type.
export function comprobarImagenSubida(cuerpo: unknown, tipo: string | undefined): ImagenSubida {
  const tipoBase = tipo?.split(";")[0]?.trim().toLowerCase();
  if (
    !Buffer.isBuffer(cuerpo) ||
    cuerpo.length === 0 ||
    !TIPOS_ACEPTADOS.includes(tipoBase ?? "")
  ) {
    throw new ErrorApi(400, MENSAJES_IMAGENES.formatoInvalido);
  }
  const datos = leerImagen(cuerpo);
  if (!datos) throw new ErrorApi(400, MENSAJES_IMAGENES.imagenIlegible);
  const { formato, ancho, alto, sinPreparar } = datos;
  if (formato === "gif") {
    if (cuerpo.length > LIMITES_IMAGENES.pesoGifMax) {
      throw new ErrorApi(400, MENSAJES_IMAGENES.gifPesado);
    }
  } else {
    if (ancho > LIMITES_IMAGENES.ladoMax || alto > LIMITES_IMAGENES.ladoMax) {
      throw new ErrorApi(400, MENSAJES_IMAGENES.imagenGrande);
    }
    if (sinPreparar) throw new ErrorApi(400, MENSAJES_IMAGENES.imagenSinPreparar);
  }
  return { bytes: cuerpo, formato, ancho, alto };
}
