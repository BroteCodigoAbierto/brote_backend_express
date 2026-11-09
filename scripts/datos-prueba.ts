// Cuentas y cursos de prueba de F02, F03, F11 y F12 (brote_specs, quickstart de cada
// una, sección 1.1). Los cuatro cursos publicados copian tal
// cual el título, la descripción y los títulos de las lecciones de
// brote_specs/referencia/cursos-prototipo/, y sus actividades salen de
// actividades-prototipo.ts. Los demás solo se publican mientras se valida el
// criterio que los pide, para no cambiar los resultados de los otros.
//
// Ningún curso extra usa en su texto las palabras de los criterios de búsqueda
// (git, japones, programacion, flex, sencill, cocina, equipo, brote).

import { LIMITES_ACTIVIDADES, type Actividad } from "../src/tipos/contrato.ts";
import { ACTIVIDADES_PROTOTIPO } from "./actividades-prototipo.ts";

export type CuentaPrueba = { correo: string; nombre: string; contrasena: string };

export type CursoPrueba = {
  correoAutor: string;
  titulo: string;
  descripcion: string;
  publicado: boolean;
  revision?: "pendiente"; // F06: enviado a revisión
  lecciones: LeccionPrueba[]; // en orden
};

export type LeccionPrueba = { titulo: string; actividades: Actividad[] };

// Lo que sale de un manifest.json del prototipo: las lecciones solo con su título.
type CursoManifiesto = Omit<CursoPrueba, "lecciones"> & { lecciones: string[] };

const AUTOR = "autor@brote.test";
// se llama igual que AUTOR: el criterio de buscar por autor lo necesita
const AUTOR_2 = "autor2@brote.test";
// F05: las dos cuentas sin cursos de la spec. autor2 no sirve: tiene "Huerto en casa"
const CREADOR = "creador@brote.test";
const CREADOR_2 = "creador2@brote.test";

export const CUENTAS_PRUEBA: CuentaPrueba[] = [
  { correo: AUTOR, nombre: "Equipo Brote", contrasena: "brote12345" },
  { correo: AUTOR_2, nombre: "Equipo Brote", contrasena: "brote12345" },
  { correo: CREADOR, nombre: "Cuenta A", contrasena: "brote12345" },
  { correo: CREADOR_2, nombre: "Cuenta B", contrasena: "brote12345" },
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
const actividadesConEtiquetas: Actividad[] = [
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
];

// F11: los cuatro tipos de relacionar, con etiquetas en todos sus textos.
const relacionarConEtiquetas: Actividad[] = [
  {
    tipo: "emparejar",
    consigna: `Consigna ${HTML}`,
    parejas: [
      { izquierda: `Uno ${HTML}`, derecha: `Primero ${HTML}` },
      { izquierda: `Dos ${HTML}`, derecha: `Segundo ${HTML}` },
      { izquierda: `Tres ${HTML}`, derecha: `Tercero ${HTML}` },
    ],
  },
  {
    tipo: "clasificar",
    consigna: `Consigna ${HTML}`,
    categorias: [`Par ${HTML}`, `Impar ${HTML}`],
    elementos: [
      { texto: `Dos ${HTML}`, categoria: 0 },
      { texto: `Tres ${HTML}`, categoria: 1 },
    ],
  },
  {
    tipo: "ordenar",
    consigna: `Consigna ${HTML}`,
    elementos: [`Primero ${HTML}`, `Segundo ${HTML}`, `Tercero ${HTML}`],
  },
  {
    tipo: "bancoPalabras",
    consigna: `Consigna ${HTML}`,
    texto: `Texto ${HTML} con un espacio: ___`,
    fichas: ["<b>hola</b>", "<script>alert(1)</script>"],
    espacios: [{ aceptadas: ["<b>hola</b>"] }],
  },
];

// F11: una palabra que vale en dos espacios, y espacios que se pueden intercambiar.
const fichasQueSeRepiten: Actividad[] = [
  {
    tipo: "bancoPalabras",
    texto: "Mis colores favoritos son ___ y ___.",
    fichas: ["rojo", "azul", "verde"],
    espacios: [{ aceptadas: ["rojo", "azul"] }, { aceptadas: ["rojo", "azul"] }],
  },
  {
    tipo: "bancoPalabras",
    texto: "___ doble(___ x)",
    fichas: ["int", "int", "char"],
    espacios: [{ aceptadas: ["int"] }, { aceptadas: ["int"] }],
  },
];

// F11: los máximos de cada tipo, para ver cómo se acomodan los textos largos.
function textoLargo(inicio: string, largo: number): string {
  return `${inicio} `.padEnd(largo, "texto largo ").slice(0, largo).trimEnd();
}

function listaDe<T>(total: number, crear: (numero: number) => T): T[] {
  return Array.from({ length: total }, (_, i) => crear(i + 1));
}

const relacionarAlLimite: Actividad[] = [
  {
    tipo: "emparejar",
    parejas: listaDe(8, (n) => ({
      izquierda: textoLargo(`Izquierda ${n}`, 200),
      derecha: textoLargo(`Derecha ${n}`, 200),
    })),
  },
  {
    tipo: "clasificar",
    categorias: listaDe(4, (n) => textoLargo(`Categoría ${n}`, 100)),
    elementos: listaDe(12, (n) => ({
      texto: textoLargo(`Elemento ${n}`, 100),
      categoria: n % 4,
    })),
  },
  {
    tipo: "ordenar",
    consigna: "Ordena los elementos del 1 al 10.",
    elementos: listaDe(10, (n) => textoLargo(`Elemento ${n}`, 200)),
  },
  {
    tipo: "bancoPalabras",
    texto: listaDe(10, (n) => `Espacio ${n}: ___`).join("\n"),
    fichas: listaDe(20, (n) => textoLargo(`Ficha ${n}`, 100)),
    espacios: listaDe(10, (n) => ({ aceptadas: [textoLargo(`Ficha ${n}`, 100)] })),
  },
];

// F12: los tres tipos de código y terminal, con etiquetas en todos sus textos, también en
// el nombre de un commit y de una rama.
const codigoConEtiquetas: Actividad[] = [
  {
    tipo: "retoCodigo",
    consigna: `Consigna ${HTML}`,
    lenguaje: "html",
    codigoInicial: `<p>${HTML}</p>`,
    solucion: `<p>Solución ${HTML}</p>`,
  },
  {
    tipo: "terminalSimulada",
    consigna: `Consigna ${HTML}`,
    carpeta: `~/${HTML}`,
    salidaPrevia: `Salida previa ${HTML}`,
    comandos: [`echo "${HTML}"`],
    salidaAcierto: `Salida ${HTML}`,
    pista: `Pista ${HTML}`,
  },
  {
    tipo: "grafoCommits",
    consigna: `Consigna ${HTML}`,
    commits: [
      { nombre: "<b>", padres: [] },
      { nombre: "c2", padres: [0] },
    ],
    ramas: [{ nombre: "<script>", commit: 1 }],
    head: { rama: 0 },
    respuesta: 0,
    explicacion: `Explicación ${HTML}`,
  },
];

// F12: un reto sin código inicial, con una línea de SQL que parece de diff, y uno sin
// etiqueta de lenguaje.
const retosDeCodigo: Actividad[] = [
  {
    tipo: "retoCodigo",
    consigna: "Escribe la consulta que trae todos los alumnos.",
    lenguaje: "sql",
    solucion: "-- Todos los alumnos\nSELECT * FROM alumnos;",
  },
  {
    tipo: "retoCodigo",
    consigna: "Completa la línea con tu nombre.",
    lenguaje: "otro",
    codigoInicial: "Nombre: ",
    solucion: "Nombre: Ana",
  },
];

// F12: los tres grafos de quickstart.md, sección 1.1. Los padres, las ramas y HEAD son
// índices en `commits`.
const grafos: Actividad[] = [
  {
    tipo: "grafoCommits",
    consigna: "¿Qué commit une el trabajo de las dos ramas?",
    commits: [
      { nombre: "c1", padres: [] },
      { nombre: "c2", padres: [0] },
      { nombre: "c3", padres: [1] },
      { nombre: "c4", padres: [1] },
      { nombre: "c5", padres: [2, 3] },
    ],
    ramas: [
      { nombre: "main", commit: 4 },
      { nombre: "feature", commit: 3 },
    ],
    head: { rama: 0 },
    respuesta: 4,
    explicacion: "c5 es un merge: tiene dos padres, c3 y c4.",
  },
  {
    tipo: "grafoCommits",
    consigna: "La rama que trajo c3 ya se borró. ¿Qué commit venía de ella?",
    commits: [
      { nombre: "c1", padres: [] },
      { nombre: "c2", padres: [0] },
      { nombre: "c3", padres: [0] },
      { nombre: "c4", padres: [1, 2] },
    ],
    ramas: [{ nombre: "main", commit: 3 }],
    respuesta: 2,
    explicacion: "c3 entró a main con el merge c4.",
  },
  {
    tipo: "grafoCommits",
    consigna: "HEAD está suelto. ¿En qué commit estás?",
    commits: [
      { nombre: "c1", padres: [] },
      { nombre: "c2", padres: [0] },
      { nombre: "c3", padres: [1] },
      { nombre: "c4", padres: [2] },
    ],
    ramas: [{ nombre: "main", commit: 3 }],
    head: { commit: 1 },
    respuesta: 1,
  },
];

// F12: un texto de varias líneas de `largo` caracteres, con una línea de 150, más ancha
// que el panel.
function lineasAlLimite(inicio: string, largo: number): string {
  const lineas = [textoLargo(inicio, 150), ...listaDe(200, (n) => `  linea(${n});`)];
  return lineas.join("\n").slice(0, largo);
}

// F12: los máximos de cada tipo. El grafo es el de quickstart.md: 10 commits en 6 columnas
// y 3 filas, y 4 ramas de 20 caracteres.
const codigoAlLimite: Actividad[] = [
  {
    tipo: "retoCodigo",
    consigna: "Cambia lo que quieras del código y comprueba.",
    lenguaje: "javascript",
    codigoInicial: lineasAlLimite("// Código inicial:", LIMITES_ACTIVIDADES.codigoMax),
    solucion: lineasAlLimite("// Solución:", LIMITES_ACTIVIDADES.solucionMax),
  },
  {
    tipo: "terminalSimulada",
    consigna: "Escribe ls carpeta-2: es uno de los diez comandos aceptados.",
    // una ruta sin espacios, como las de verdad
    carpeta: `~/${listaDe(20, (n) => `carpeta-${n}`).join("/")}`.slice(
      0,
      LIMITES_ACTIVIDADES.carpetaMax,
    ),
    salidaPrevia: lineasAlLimite("Salida previa:", LIMITES_ACTIVIDADES.salidaMax),
    comandos: [
      textoLargo("echo", LIMITES_ACTIVIDADES.comandoMax),
      ...listaDe(9, (n) => `ls carpeta-${n + 1}`),
    ],
    salidaAcierto: lineasAlLimite("Salida al acertar:", LIMITES_ACTIVIDADES.salidaMax),
    pista: textoLargo("Pista:", LIMITES_ACTIVIDADES.pistaMax),
  },
  {
    tipo: "grafoCommits",
    consigna: "¿Qué commit es un merge?",
    commits: [
      { nombre: "m1a1", padres: [] },
      { nombre: "m2b2", padres: [0] },
      { nombre: "m3c3", padres: [1] },
      { nombre: "m4d4", padres: [2] },
      { nombre: "m5e5", padres: [3] },
      { nombre: "m6f6", padres: [4] },
      { nombre: "f1g1", padres: [1] },
      { nombre: "f2h2", padres: [6] },
      { nombre: "x1i1", padres: [2] },
      { nombre: "x2j2", padres: [7, 8] },
    ],
    ramas: [
      { nombre: "principal-del-equipo", commit: 5 },
      { nombre: "funcion-del-registro", commit: 9 },
      { nombre: "arreglo-del-portal-1", commit: 8 },
      { nombre: "etiqueta-del-inicio1", commit: 4 },
    ],
    head: { rama: 1 },
    respuesta: 9,
    explicacion: textoLargo(
      "x2j2 tiene dos padres, f2h2 y x1i1:",
      LIMITES_ACTIVIDADES.explicacionMax,
    ),
  },
];

const actividadesDePrueba: CursoPrueba = {
  correoAutor: AUTOR,
  titulo: "Actividades de prueba",
  descripcion: "Curso para comprobar a mano los tipos de actividad.",
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
      actividades: actividadesConEtiquetas,
    },
    { titulo: "Lección sin actividades", actividades: [] },
    { titulo: "Relacionar con etiquetas", actividades: relacionarConEtiquetas },
    { titulo: "Fichas que se repiten", actividades: fichasQueSeRepiten },
    { titulo: "Relacionar al límite", actividades: relacionarAlLimite },
    // F12, al final para no mover las posiciones que citan F03, F05 y F11
    { titulo: "Código con etiquetas", actividades: codigoConEtiquetas },
    { titulo: "Retos de código", actividades: retosDeCodigo },
    {
      titulo: "Terminal mínima",
      actividades: [
        {
          tipo: "terminalSimulada",
          consigna: "Muestra los archivos de la carpeta.",
          comandos: ["ls"],
        },
      ],
    },
    { titulo: "Grafos", actividades: grafos },
    { titulo: "Código al límite", actividades: codigoAlLimite },
    {
      // ya ninguna lección del prototipo queda sin preguntas (spec F12, "Supuestos")
      titulo: "Solo teoría",
      actividades: [
        {
          tipo: "teoria",
          titulo: "Una lección sin preguntas",
          texto: "Esta lección solo tiene teoría y una tarjeta, así que no tiene preguntas.",
        },
        {
          tipo: "tarjeta",
          frente: "¿Cuenta como pregunta?",
          reverso: "No: las tarjetas no se califican.",
        },
      ],
    },
  ],
};

// F06: una lección que se puede cursar, para enviar y aprobar un curso de verdad.
const leccionCompleta: LeccionPrueba = {
  titulo: "Lección 1",
  actividades: [
    { tipo: "tarjeta", frente: "Germinar", reverso: "Empezar a crecer" },
    {
      tipo: "opcionMultiple",
      pregunta: "¿Qué necesita una semilla?",
      opciones: [{ texto: "Agua" }, { texto: "Sal" }],
      correcta: 0,
    },
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
    correoAutor: AUTOR,
    titulo: "Curso en revisión",
    descripcion: "Esperando a que lo aprueben.",
    publicado: false,
    revision: "pendiente",
    lecciones: [leccionCompleta],
  },
  {
    // F06: "Curso en borrador" tiene una lección vacía y no se puede enviar
    correoAutor: AUTOR,
    titulo: "Curso listo para enviar",
    descripcion: "Tiene lo que hace falta para pasar a revisión.",
    publicado: false,
    lecciones: [leccionCompleta],
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
    // F05: el único curso con etiquetas en todo, también en las lecciones
    lecciones: [{ titulo: `Lección ${HTML}`, actividades: actividadesConEtiquetas }],
  },
  {
    correoAutor: AUTOR_2,
    titulo: "Huerto en casa",
    descripcion: "Siembra tus primeras hortalizas en macetas.",
    publicado: false,
    lecciones: sinActividades(["Elegir las macetas", "Sembrar"]),
  },
  {
    // F05: el máximo de lecciones de un curso
    correoAutor: AUTOR,
    titulo: "Curso con cien lecciones",
    descripcion: "Tiene todas las lecciones que permite un curso.",
    publicado: false,
    lecciones: leccionesNumeradas(100),
  },
  {
    // F05: el máximo de actividades de una lección
    correoAutor: AUTOR,
    titulo: "Lección con el máximo",
    descripcion: "Su lección tiene todas las actividades que permite.",
    publicado: false,
    lecciones: [
      {
        titulo: "Lección llena",
        actividades: Array.from({ length: 50 }, (_, i) => ({
          tipo: "tarjeta" as const,
          frente: `Frente ${i + 1}`,
          reverso: `Reverso ${i + 1}`,
        })),
      },
    ],
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
