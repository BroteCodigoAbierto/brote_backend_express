// Cuentas y cursos de prueba de F02 y F03 (brote_specs, quickstart de F02,
// sección 1.1, y de F03, sección 1.1). Los cuatro cursos publicados copian tal
// cual el título, la descripción y los títulos de las lecciones de
// brote_specs/referencia/cursos-prototipo/, y sus actividades salen de
// actividades-prototipo.ts. Los demás solo se publican mientras se valida el
// criterio que los pide, para no cambiar los resultados de los otros.
//
// Ningún curso extra usa en su texto las palabras de los criterios de búsqueda
// (git, japones, programacion, flex, sencill, cocina, equipo, brote).

import type { Actividad } from "../src/tipos/contrato.ts";
import { ACTIVIDADES_PROTOTIPO } from "./actividades-prototipo.ts";

export type CuentaPrueba = { correo: string; nombre: string; contrasena: string };

export type CursoPrueba = {
  correoAutor: string;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  lecciones: LeccionPrueba[]; // en orden
};

export type LeccionPrueba = { titulo: string; actividades: Actividad[] };

// Lo que sale de un manifest.json del prototipo: las lecciones solo con su título.
type CursoManifiesto = Omit<CursoPrueba, "lecciones"> & { lecciones: string[] };

const AUTOR = "autor@brote.test";
// se llama igual que AUTOR: el criterio de buscar por autor lo necesita
const AUTOR_2 = "autor2@brote.test";

export const CUENTAS_PRUEBA: CuentaPrueba[] = [
  { correo: AUTOR, nombre: "Equipo Brote", contrasena: "brote12345" },
  { correo: AUTOR_2, nombre: "Equipo Brote", contrasena: "brote12345" },
];

function sinActividades(titulos: string[]): LeccionPrueba[] {
  return titulos.map((titulo) => ({ titulo, actividades: [] }));
}

function leccionesNumeradas(cantidad: number): LeccionPrueba[] {
  return sinActividades(Array.from({ length: cantidad }, (_, i) => `Lección ${i + 1}`));
}

// Cada lección del prototipo con sus actividades, en el mismo orden.
function conActividades({ titulo, lecciones, ...curso }: CursoManifiesto): CursoPrueba {
  const actividades = ACTIVIDADES_PROTOTIPO[titulo];
  if (actividades?.length !== lecciones.length) {
    throw new Error(
      `actividades-prototipo.ts no tiene las ${lecciones.length} lecciones de "${titulo}"`,
    );
  }
  return {
    ...curso,
    titulo,
    lecciones: lecciones.map((tituloLeccion, i) => ({
      titulo: tituloLeccion,
      actividades: actividades[i],
    })),
  };
}

const manifiestos: CursoManifiesto[] = [
  {
    correoAutor: AUTOR,
    titulo: "Git esencial",
    descripcion:
      "Aprende Git desde cero: commits, ramas y remotos, con una terminal simulada y grafos de commits interactivos.",
    publicado: true,
    lecciones: [
      "¿Qué es el control de versiones?",
      "Tu primer commit",
      "Viajar en el tiempo: historial y diffs",
      "Ramas: trabajar en paralelo",
      "Remotos: compartir tu trabajo",
      "Resolviendo conflictos",
    ],
  },
  {
    correoAutor: AUTOR,
    titulo: "Japonés sencillo",
    descripcion:
      "Tus primeros pasos en japonés: hiragana, saludos, números y cómo presentarte. Sin conocimientos previos.",
    publicado: true,
    lecciones: ["Hiragana: las vocales", "Saludos", "Números del 1 al 5", "Preséntate"],
  },
  {
    correoAutor: AUTOR,
    titulo: "Programación en C sencilla",
    descripcion:
      "Los fundamentos de C: variables, condicionales, funciones, arrays y punteros, con retos de código en cada lección.",
    publicado: true,
    lecciones: ["Primeros pasos", "Condicionales y operadores", "Funciones", "Arrays y punteros"],
  },
  {
    correoAutor: AUTOR,
    titulo: "Examen unidad 1",
    descripcion:
      "Repaso de HTML semántico y formularios (label, input, alt, head, article/section) más el modelo de caja flexible de CSS: display: flex, justify-content, align-items, flex: 1, flex-wrap, order, gap y los patrones de layout más usados en la web moderna.",
    publicado: true,
    lecciones: [
      "Formularios: label e input",
      "Box model: padding, gap y margin",
      "Enlaces, imágenes y accesibilidad",
      "Estructura semántica de HTML",
      "¿Qué es Flexbox?",
      "justify-content: el eje principal",
      "align-items: el eje cruzado",
      "flex: 1 y el tamaño de los elementos",
      "flex-wrap y layouts multilínea",
      "order y gap",
      "Patrones comunes con Flexbox",
    ],
  },
];

const prototipo = manifiestos.map(conActividades);

// Textos con etiquetas en todos los campos (spec F03, criterio de "Contenido y acceso")
const HTML = "<b>hola</b> <script>alert(1)</script>";

// F03: un curso para los criterios que el prototipo no cubre. No se llama
// "Curso de prueba ..." porque la consulta C2 de F02 publica esos.
const actividadesDePrueba: CursoPrueba = {
  correoAutor: AUTOR,
  titulo: "Actividades de prueba",
  descripcion: "Curso para comprobar a mano los cinco tipos de actividad.",
  publicado: false,
  lecciones: [
    {
      titulo: "Respuestas con acentos",
      actividades: [
        {
          tipo: "completarEspacios",
          texto: "Sinónimo de pieza musical: ___",
          espacios: [{ aceptadas: ["canción", "tema"] }],
        },
      ],
    },
    {
      titulo: "Textos con etiquetas",
      actividades: [
        {
          tipo: "teoria",
          titulo: `Teoría ${HTML}`,
          texto: `Párrafo con ${HTML}.\n\nOtro párrafo con ${HTML}.`,
          codigo: `const texto = "${HTML}";`,
          puntosClave: [`Punto con ${HTML}`],
        },
        { tipo: "tarjeta", frente: `Frente ${HTML}`, reverso: `Reverso ${HTML}` },
        {
          tipo: "opcionMultiple",
          pregunta: `Pregunta ${HTML}`,
          codigo: `<p>${HTML}</p>`,
          opciones: [{ texto: `Opción ${HTML}` }, { texto: "Otra opción <i>sin cursiva</i>" }],
          correcta: 0,
        },
        {
          tipo: "completarEspacios",
          texto: `Texto ${HTML} con un espacio: ___`,
          espacios: [{ aceptadas: ["<b>hola</b>"] }],
        },
        { tipo: "preguntaAbierta", pregunta: `Pregunta ${HTML}`, solucion: `Solución ${HTML}` },
      ],
    },
    { titulo: "Lección sin actividades", actividades: [] },
  ],
};

const extras: CursoPrueba[] = [
  {
    correoAutor: AUTOR,
    titulo: "Curso en borrador",
    descripcion: "Todavía lo están escribiendo.",
    publicado: false,
    lecciones: leccionesNumeradas(1),
  },
  {
    // en F02 es lo mismo que un borrador: el dato de la revisión llega con F06
    correoAutor: AUTOR,
    titulo: "Curso en revisión",
    descripcion: "Esperando a que lo aprueben.",
    publicado: false,
    lecciones: leccionesNumeradas(1),
  },
  {
    correoAutor: AUTOR,
    titulo: "Sin lecciones todavía",
    descripcion: "Un curso publicado que aún no tiene lecciones.",
    publicado: false,
    lecciones: [],
  },
  {
    correoAutor: AUTOR,
    titulo: "Una sola lección",
    descripcion: "Un curso corto, de una sola lección.",
    publicado: false,
    lecciones: sinActividades(["Única lección"]),
  },
  {
    correoAutor: AUTOR,
    titulo: "¿Cómo se dice hola?",
    descripcion: "Saludos básicos en varios idiomas.",
    publicado: false,
    lecciones: leccionesNumeradas(2),
  },
  {
    correoAutor: AUTOR,
    titulo: "Texto <b>hola</b> <script>",
    descripcion:
      "Si ves <b>hola</b> sin negritas y <script>alert(1)</script> como texto, se muestra bien.",
    publicado: false,
    lecciones: leccionesNumeradas(1),
  },
  {
    correoAutor: AUTOR_2,
    titulo: "Huerto en casa",
    descripcion: "Siembra tus primeras hortalizas en macetas.",
    publicado: false,
    lecciones: sinActividades(["Elegir las macetas", "Sembrar"]),
  },
];

// "Curso de prueba 01" a "21": con los cuatro del prototipo suman 25 publicados
const genericos: CursoPrueba[] = Array.from({ length: 21 }, (_, i) => ({
  correoAutor: AUTOR,
  titulo: `Curso de prueba ${String(i + 1).padStart(2, "0")}`,
  descripcion: "Curso genérico para probar la carga de 10 en 10.",
  publicado: false,
  lecciones: leccionesNumeradas((i % 3) + 1),
}));

export const CURSOS_PRUEBA: CursoPrueba[] = [
  ...prototipo,
  ...extras,
  actividadesDePrueba,
  ...genericos,
];
