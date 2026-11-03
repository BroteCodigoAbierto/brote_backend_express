// Cuentas y cursos de prueba de F02 (brote_specs, quickstart de F02, sección
// 1.1). Los cuatro cursos publicados copian tal cual el título, la descripción
// y los títulos de las lecciones de brote_specs/referencia/cursos-prototipo/;
// sus actividades llegan con F03. Los demás solo se publican mientras se valida
// el criterio que los pide, para no cambiar los resultados de los otros.
//
// Ningún curso extra usa en su texto las palabras de los criterios de búsqueda
// (git, japones, programacion, flex, sencill, cocina, equipo, brote).

export type CuentaPrueba = { correo: string; nombre: string; contrasena: string };

export type CursoPrueba = {
  correoAutor: string;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  lecciones: string[]; // títulos, en orden
};

const AUTOR = "autor@brote.test";
// se llama igual que AUTOR: el criterio de buscar por autor lo necesita
const AUTOR_2 = "autor2@brote.test";

export const CUENTAS_PRUEBA: CuentaPrueba[] = [
  { correo: AUTOR, nombre: "Equipo Brote", contrasena: "brote12345" },
  { correo: AUTOR_2, nombre: "Equipo Brote", contrasena: "brote12345" },
];

function leccionesNumeradas(cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => `Lección ${i + 1}`);
}

const prototipo: CursoPrueba[] = [
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
    lecciones: ["Única lección"],
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
    lecciones: ["Elegir las macetas", "Sembrar"],
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

export const CURSOS_PRUEBA: CursoPrueba[] = [...prototipo, ...extras, ...genericos];
