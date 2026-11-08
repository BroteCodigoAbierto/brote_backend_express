// Imágenes de prueba de F13, dibujadas en código para no versionar archivos binarios
// (brote_specs, research de F13, punto 15). Son figuras simples: no hace falta una foto
// para probar mosaicos, recortes, transparencia ni GIF. Los codificadores PNG y GIF son
// los mínimos que necesita Brote y no llevan bloques de texto ni metadatos, así que el
// servidor los acepta como si los hubiera preparado el editor.

import { crc32, deflateSync } from "node:zlib";

type Rgba = [number, number, number, number];

export type Lienzo = { ancho: number; alto: number; pixeles: Uint8Array };

const COLORES = {
  rojo: [220, 38, 38, 255],
  azul: [37, 99, 235, 255],
  verde: [22, 163, 74, 255],
  amarilla: [234, 179, 8, 255],
  amarillo: [234, 179, 8, 255],
  morado: [147, 51, 234, 255],
  naranja: [234, 88, 12, 255],
  turquesa: [13, 148, 136, 255],
  tinta: [30, 27, 58, 255],
  fondo: [246, 245, 253, 255],
  indigo: [79, 70, 229, 255],
} satisfies Record<string, Rgba>;

type Color = keyof typeof COLORES;

export function crearLienzo(ancho: number, alto: number, fondo?: Color): Lienzo {
  const pixeles = new Uint8Array(ancho * alto * 4);
  if (fondo) {
    const [r, g, b, a] = COLORES[fondo];
    for (let i = 0; i < pixeles.length; i += 4) pixeles.set([r, g, b, a], i);
  }
  return { ancho, alto, pixeles };
}

type Punto = [number, number];

function dentroDePoligono([x, y]: Punto, vertices: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, yi] = vertices[i]!;
    const [xj, yj] = vertices[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function distanciaASegmento([x, y]: Punto, [ax, ay]: Punto, [bx, by]: Punto): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}

// Pinta con 4 muestras por pixel, para que los bordes no salgan en escalera.
function pintar(lienzo: Lienzo, color: Color, cubre: (punto: Punto) => boolean) {
  const [r, g, b] = COLORES[color];
  const muestras: Punto[] = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];
  for (let y = 0; y < lienzo.alto; y++) {
    for (let x = 0; x < lienzo.ancho; x++) {
      const dentro = muestras.filter(([mx, my]) => cubre([x + mx, y + my])).length;
      if (dentro === 0) continue;
      const i = (y * lienzo.ancho + x) * 4;
      const alfa = dentro / 4;
      const antes = lienzo.pixeles[i + 3]! / 255;
      const total = alfa + antes * (1 - alfa);
      for (const [canal, valor] of [r, g, b].entries()) {
        const viejo = lienzo.pixeles[i + canal]!;
        lienzo.pixeles[i + canal] = Math.round((valor * alfa + viejo * antes * (1 - alfa)) / total);
      }
      lienzo.pixeles[i + 3] = Math.round(total * 255);
    }
  }
}

export type Forma = "circulo" | "ovalo" | "estrella" | "poligono";

export type Figura = {
  forma: Forma;
  lados?: number; // solo en "poligono"
  color: Color;
  relleno: boolean; // sin relleno, solo el contorno, de GROSOR px
  centro: Punto;
  radio: number;
};

const GROSOR = 24;

function verticesDe({ forma, lados = 3, centro: [cx, cy], radio }: Figura): Punto[] {
  if (forma === "estrella") {
    return Array.from({ length: 10 }, (_, i) => {
      const angulo = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? radio : radio * 0.45;
      return [cx + r * Math.cos(angulo), cy + r * Math.sin(angulo)];
    });
  }
  // con un número par de lados, un lado abajo (el cuadrado, derecho); si no, un vértice arriba
  const giro = -Math.PI / 2 + (lados % 2 === 0 ? Math.PI / lados : 0);
  return Array.from({ length: lados }, (_, i) => {
    const angulo = giro + (i * 2 * Math.PI) / lados;
    return [cx + radio * Math.cos(angulo), cy + radio * Math.sin(angulo)];
  });
}

export function dibujarFigura(lienzo: Lienzo, figura: Figura) {
  const { forma, color, relleno, centro, radio } = figura;
  const [cx, cy] = centro;
  if (forma === "circulo" || forma === "ovalo") {
    const rx = radio;
    const ry = forma === "ovalo" ? radio * 0.62 : radio;
    const nivel = ([x, y]: Punto) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    const interior = ([x, y]: Punto) =>
      ((x - cx) / (rx - GROSOR)) ** 2 + ((y - cy) / (ry - GROSOR)) ** 2 < 1;
    pintar(lienzo, color, (p) => nivel(p) < 1 && (relleno || !interior(p)));
    return;
  }
  const vertices = verticesDe(figura);
  const cercaDelBorde = (p: Punto) =>
    vertices.some(
      (v, i) => distanciaASegmento(p, v, vertices[(i + 1) % vertices.length]!) < GROSOR,
    );
  pintar(lienzo, color, (p) => dentroDePoligono(p, vertices) && (relleno || cercaDelBorde(p)));
}

function rectangulo(
  lienzo: Lienzo,
  color: Color,
  x: number,
  y: number,
  ancho: number,
  alto: number,
) {
  pintar(lienzo, color, ([px, py]) => px >= x && px < x + ancho && py >= y && py < y + alto);
}

// ---------------------------------------------------------------------------
// PNG: https://www.w3.org/TR/png-3/ (RGBA de 8 bits, sin entrelazado, filtro 0)
// ---------------------------------------------------------------------------

function bloquePng(tipo: string, datos: Buffer): Buffer {
  const cabecera = Buffer.alloc(8);
  cabecera.writeUInt32BE(datos.length, 0);
  cabecera.write(tipo, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([cabecera.subarray(4), datos])), 0);
  return Buffer.concat([cabecera, datos, crc]);
}

export function codificarPng({ ancho, alto, pixeles }: Lienzo, extra: Buffer[] = []): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA, deflate, filtro 0, sin entrelazado
  const filas = Buffer.alloc((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; y++) {
    filas[y * (ancho * 4 + 1)] = 0;
    filas.set(pixeles.subarray(y * ancho * 4, (y + 1) * ancho * 4), y * (ancho * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloquePng("IHDR", ihdr),
    ...extra, // para validar: un bloque acTL hace un "PNG animado"
    bloquePng("IDAT", deflateSync(filas)),
    bloquePng("IEND", Buffer.alloc(0)),
  ]);
}

// Un bloque acTL vacío de cuadros: basta para que el servidor lo vea como APNG.
export function bloqueAnimacionPng(): Buffer {
  const datos = Buffer.alloc(8);
  datos.writeUInt32BE(1, 0);
  return bloquePng("acTL", datos);
}

// ---------------------------------------------------------------------------
// GIF: https://www.w3.org/Graphics/GIF/spec-gif89a.txt (LZW como lo hace omggif)
// ---------------------------------------------------------------------------

function lzw(indices: Uint8Array, minimo: number): Buffer {
  const salida: number[] = [];
  let acumulado = 0;
  let bits = 0;
  const limpiar = 1 << minimo;
  const fin = limpiar + 1;
  let tamano = minimo + 1;
  let siguiente = fin + 1;
  let tabla = new Map<number, number>();
  function escribir(codigo: number) {
    acumulado |= codigo << bits;
    bits += tamano;
    while (bits >= 8) {
      salida.push(acumulado & 0xff);
      acumulado >>>= 8;
      bits -= 8;
    }
  }
  escribir(limpiar);
  let actual = indices[0]!;
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i]!;
    const clave = (actual << 8) | k;
    const encontrado = tabla.get(clave);
    if (encontrado !== undefined) {
      actual = encontrado;
      continue;
    }
    escribir(actual);
    if (siguiente === 4096) {
      escribir(limpiar);
      siguiente = fin + 1;
      tamano = minimo + 1;
      tabla = new Map();
    } else {
      if (siguiente >= 1 << tamano) tamano++;
      tabla.set(clave, siguiente++);
    }
    actual = k;
  }
  escribir(actual);
  escribir(fin);
  if (bits > 0) salida.push(acumulado & 0xff);
  return Buffer.from(salida);
}

function enSubbloques(datos: Buffer): Buffer {
  const partes: Buffer[] = [];
  for (let i = 0; i < datos.length; i += 255) {
    const parte = datos.subarray(i, i + 255);
    partes.push(Buffer.from([parte.length]), parte);
  }
  partes.push(Buffer.from([0]));
  return Buffer.concat(partes);
}

export type CuadrosGif = {
  ancho: number;
  alto: number;
  paleta: [number, number, number][]; // hasta 256
  cuadros: Uint8Array[]; // índices en la paleta, uno por pixel
  retraso: number; // centésimas de segundo
};

export function codificarGif({ ancho, alto, paleta, cuadros, retraso }: CuadrosGif): Buffer {
  const bitsPaleta = Math.max(1, Math.ceil(Math.log2(paleta.length)));
  const tabla = Buffer.alloc(3 * (1 << bitsPaleta));
  paleta.forEach((color, i) => tabla.set(color, i * 3));
  const pantalla = Buffer.alloc(7);
  pantalla.writeUInt16LE(ancho, 0);
  pantalla.writeUInt16LE(alto, 2);
  pantalla[4] = 0x80 | 0x70 | (bitsPaleta - 1); // tabla global, 8 bits por canal
  const partes: Buffer[] = [
    Buffer.from("GIF89a", "latin1"),
    pantalla,
    tabla,
    // NETSCAPE2.0: repetir siempre
    Buffer.from([0x21, 0xff, 0x0b, ...Buffer.from("NETSCAPE2.0", "latin1"), 3, 1, 0, 0, 0]),
  ];
  const minimo = Math.max(2, bitsPaleta);
  for (const cuadro of cuadros) {
    const control = Buffer.from([0x21, 0xf9, 4, 0x04, retraso & 0xff, retraso >> 8, 0, 0]);
    const descriptor = Buffer.alloc(10);
    descriptor[0] = 0x2c;
    descriptor.writeUInt16LE(ancho, 5);
    descriptor.writeUInt16LE(alto, 7);
    partes.push(control, descriptor, Buffer.from([minimo]), enSubbloques(lzw(cuadro, minimo)));
  }
  partes.push(Buffer.from([0x3b]));
  return Buffer.concat(partes);
}

// Un generador de números con semilla, para que cada GIF de ruido sea siempre el mismo.
export function aleatorio(semilla: number): () => number {
  let estado = semilla >>> 0 || 1;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 2 ** 32;
  };
}

// Un GIF de ruido, que casi no se comprime: llega al peso que se le pida, sin pasarse.
export function gifDeRuido(pesoObjetivo: number, semilla: number): Buffer {
  const azar = aleatorio(semilla);
  const paleta = Array.from(
    { length: 256 },
    () => [0, 0, 0].map(() => Math.floor(azar() * 256)) as [number, number, number],
  );
  const lado = 400;
  const cuadros: Uint8Array[] = [];
  let gif = codificarGif({ ancho: lado, alto: lado, paleta, cuadros: [], retraso: 10 });
  for (;;) {
    const cuadro = Uint8Array.from({ length: lado * lado }, () => Math.floor(azar() * 256));
    const conOtro = codificarGif({
      ancho: lado,
      alto: lado,
      paleta,
      cuadros: [...cuadros, cuadro],
      retraso: 10,
    });
    if (conOtro.length > pesoObjetivo) return gif;
    cuadros.push(cuadro);
    gif = conOtro;
  }
}

// ---------------------------------------------------------------------------
// Las imágenes de "Actividades de prueba" (brote_specs, quickstart de F13, sección 1.1)
// ---------------------------------------------------------------------------

const LADO_FIGURA = 400;

function figura(forma: Forma, color: Color, relleno = true, lados?: number): Buffer {
  const lienzo = crearLienzo(LADO_FIGURA, LADO_FIGURA);
  dibujarFigura(lienzo, {
    forma,
    lados,
    color,
    relleno,
    centro: [LADO_FIGURA / 2, LADO_FIGURA / 2],
    radio: LADO_FIGURA * 0.4,
  });
  return codificarPng(lienzo);
}

// Panorama de 1600 × 400: un círculo a la izquierda, un cuadrado a la derecha y una barra en
// cada extremo, para ver que llega completo.
function panorama(): Buffer {
  const lienzo = crearLienzo(1600, 400, "fondo");
  rectangulo(lienzo, "tinta", 0, 0, 40, 400);
  rectangulo(lienzo, "tinta", 1560, 0, 40, 400);
  dibujarFigura(lienzo, {
    forma: "circulo",
    color: "rojo",
    relleno: true,
    centro: [300, 200],
    radio: 140,
  });
  dibujarFigura(lienzo, {
    forma: "poligono",
    lados: 4,
    color: "azul",
    relleno: true,
    centro: [1300, 200],
    radio: 180,
  });
  return codificarPng(lienzo);
}

function chica(): Buffer {
  const lienzo = crearLienzo(120, 80, "fondo");
  dibujarFigura(lienzo, {
    forma: "circulo",
    color: "verde",
    relleno: true,
    centro: [60, 40],
    radio: 28,
  });
  return codificarPng(lienzo);
}

// 400 × 1600: cuatro figuras en columna.
function alta(): Buffer {
  const lienzo = crearLienzo(400, 1600, "fondo");
  const figuras: [Forma, Color, number?][] = [
    ["circulo", "rojo"],
    ["poligono", "azul", 4],
    ["poligono", "verde", 3],
    ["estrella", "amarilla"],
  ];
  figuras.forEach(([forma, color, lados], i) =>
    dibujarFigura(lienzo, {
      forma,
      color,
      lados,
      relleno: true,
      centro: [200, 200 + i * 400],
      radio: 150,
    }),
  );
  return codificarPng(lienzo);
}

// 1600 × 900: una figura al centro y franjas a la izquierda (roja), a la derecha (azul) y
// abajo (verde). Recortada al centro en cuadrado, se pierden las de los lados.
function portada(): Buffer {
  const lienzo = crearLienzo(1600, 900, "fondo");
  rectangulo(lienzo, "rojo", 0, 0, 160, 900);
  rectangulo(lienzo, "azul", 1440, 0, 160, 900);
  rectangulo(lienzo, "verde", 0, 780, 1600, 120);
  dibujarFigura(lienzo, {
    forma: "estrella",
    color: "indigo",
    relleno: true,
    centro: [800, 390],
    radio: 260,
  });
  return codificarPng(lienzo);
}

// 200 × 200, 12 cuadros de 100 ms: un círculo que va y viene.
function gifCirculo(): Buffer {
  const paleta: [number, number, number][] = [
    [246, 245, 253],
    [220, 38, 38],
  ];
  const cuadros = Array.from({ length: 12 }, (_, n) => {
    const paso = n < 6 ? n : 12 - n;
    const cx = 50 + paso * 20;
    return Uint8Array.from({ length: 200 * 200 }, (_, i) => {
      const x = i % 200;
      const y = Math.floor(i / 200);
      return (x - cx) ** 2 + (y - 100) ** 2 < 40 ** 2 ? 1 : 0;
    });
  });
  return codificarGif({ ancho: 200, alto: 200, paleta, cuadros, retraso: 10 });
}

const FORMAS_CON_COLOR: Record<string, [Forma, number?]> = {
  circulo: ["circulo"],
  ovalo: ["ovalo"],
  estrella: ["estrella"],
  triangulo: ["poligono", 3],
  cuadrado: ["poligono", 4],
  pentagono: ["poligono", 5],
  hexagono: ["poligono", 6],
};

const COLORES_POLIGONO: Color[] = [
  "rojo",
  "azul",
  "verde",
  "amarilla",
  "morado",
  "naranja",
  "turquesa",
];

function figurasPorNombre(): Record<string, () => Buffer> {
  const imagenes: Record<string, () => Buffer> = {
    panorama,
    chica,
    alta,
    portada,
    "gif-circulo": gifCirculo,
  };
  for (const [nombre, [forma, lados]] of Object.entries(FORMAS_CON_COLOR)) {
    for (const color of Object.keys(COLORES) as Color[]) {
      imagenes[`${nombre}-${color}`] = () => figura(forma, color, true, lados);
    }
    imagenes[`${nombre}-contorno`] = () => figura(forma, "tinta", false, lados);
  }
  for (let lados = 3; lados <= 12; lados++) {
    const color = COLORES_POLIGONO[lados % COLORES_POLIGONO.length]!;
    imagenes[`poligono-${lados}`] = () => figura("poligono", color, true, lados);
    imagenes[`poligono-${lados}-contorno`] = () => figura("poligono", "tinta", false, lados);
  }
  return imagenes;
}

// Nombre → los bytes de la imagen. Se dibujan solo las que se piden.
export const IMAGENES_PRUEBA: Record<string, () => Buffer> = figurasPorNombre();
