// GENERADO desde brote_specs/contrato/contrato.ts (versión 0.9.0).
// No editar a mano: cambia la copia oficial y corre `npm run contrato:copiar` en brote_specs.

// Contrato de Brote: los tipos que viajan entre la API, la web y el móvil.
//
// Esta es la copia oficial. Los repos de código reciben una copia en
// src/tipos/contrato.ts con `npm run contrato:copiar`.
//
// Los tipos se agregan aquí cuando el plan de una feature los define
// (sección "Cambios al contrato"), no antes.

// ---------------------------------------------------------------------------
// Errores (F01): forma de toda respuesta de error de la API.
// ---------------------------------------------------------------------------

export type RespuestaError = {
  error: string;
  // solo en errores de formulario: nombre del campo del cuerpo → mensaje
  campos?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Cuentas y sesión (F01)
// ---------------------------------------------------------------------------

export type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  creadoEn: string; // ISO 8601
};

export type RespuestaUsuario = {
  usuario: Usuario;
};

export type CuerpoCrearCuenta = {
  nombre: string;
  correo: string;
  contrasena: string;
};

export type CuerpoEntrar = {
  correo: string;
  contrasena: string;
};

// El móvil manda esta cabecera para recibir la sesión como token
// (cabecera `set-auth-token`) y no como cookie.
export const CABECERA_CLIENTE = { nombre: "X-Cliente", movil: "movil" } as const;
export const CABECERA_TOKEN = "set-auth-token";

// Longitudes en caracteres Unicode: Array.from(texto).length
export const LIMITES_CUENTA = {
  nombreMax: 50,
  correoMax: 254,
  contrasenaMin: 8,
  contrasenaMax: 128,
} as const;

// Una sola @, algo antes, dominio con al menos un punto que no está al inicio
// ni al final, sin espacios. Se aplica al correo ya recortado.
export const PATRON_CORREO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const MENSAJES_CUENTA = {
  datosInvalidos: "Revisa los datos marcados.",
  nombreVacio: "Escribe tu nombre.",
  nombreLargo: "El nombre puede tener hasta 50 caracteres.",
  correoVacio: "Escribe tu correo.",
  correoInvalido: "Escribe un correo válido.",
  correoRepetido: "Ya existe una cuenta con ese correo.",
  contrasenaVacia: "Escribe una contraseña.",
  contrasenaVaciaEntrar: "Escribe tu contraseña.",
  contrasenaCorta: "La contraseña debe tener al menos 8 caracteres.",
  contrasenaLarga: "La contraseña puede tener hasta 128 caracteres.",
  credencialesIncorrectas: "Correo o contraseña incorrectos.",
  sesionTerminada: "Tu sesión terminó. Vuelve a entrar.",
} as const;

// ---------------------------------------------------------------------------
// Catálogo de cursos (F02)
// ---------------------------------------------------------------------------

export type AutorCurso = {
  id: string;
  nombre: string; // nombre para mostrar actual del usuario
};

// Lo que muestra la tarjeta de un curso en el catálogo.
export type ResumenCurso = {
  id: string;
  titulo: string;
  descripcion: string;
  autor: AutorCurso;
  cantidadLecciones: number;
};

export type ResumenLeccion = {
  id: string;
  titulo: string;
  posicion: number; // 1, 2, 3, ... en el orden del curso
};

// El detalle agrega la lista de lecciones, ordenadas por posición.
// Desde F04, cada lección trae el progreso de quien pregunta.
export type DetalleCurso = ResumenCurso & {
  lecciones: LeccionDelCurso[];
};

export type RespuestaCatalogo = {
  cursos: ResumenCurso[];
  // se manda tal cual en ?despues= para pedir los siguientes; null si ya no hay más
  siguiente: string | null;
};

export type RespuestaCurso = {
  curso: DetalleCurso;
};

// Longitud de la búsqueda en caracteres Unicode: Array.from(texto).length
export const LIMITES_CATALOGO = {
  busquedaMax: 100,
  cursosPorCarga: 10,
} as const;

export const MENSAJES_CATALOGO = {
  busquedaLarga: "La búsqueda puede tener hasta 100 caracteres.",
  cargaInvalida: "No se pudieron cargar más cursos. Vuelve a buscar.",
  // mismo mensaje si el curso no existe o no está publicado
  cursoNoDisponible: "Este curso no existe o ya no está disponible.",
} as const;

// ---------------------------------------------------------------------------
// Lecciones y actividades (F03)
// ---------------------------------------------------------------------------

// Cada tipo de actividad es una variante identificada por `tipo`
// (constitución, principio IV). Agregar un tipo es: su variante aquí, su
// validación en el backend y su componente en la web y en el móvil.

export type ActividadTeoria = {
  tipo: "teoria";
  titulo?: string;
  texto: string; // párrafos separados por un renglón en blanco
  codigo?: string; // bloque de código; las líneas con +, - o @@ se leen como diff
  puntosClave?: string[];
};

export type ActividadTarjeta = {
  tipo: "tarjeta";
  frente: string;
  reverso: string;
};

// Una opción es un texto o un símbolo que se muestra en grande (p. ej. "あ").
export type OpcionRespuesta = { texto: string } | { simbolo: string };

export type ActividadOpcionMultiple = {
  tipo: "opcionMultiple";
  pregunta: string;
  codigo?: string;
  opciones: OpcionRespuesta[]; // en el orden del autor; los clientes las mezclan
  correcta: number; // índice en `opciones`
};

export type EspacioRespuesta = {
  // en completar espacios, la primera es la que se muestra como respuesta esperada;
  // en el banco de palabras, son textos de `fichas`
  aceptadas: string[];
};

export type ActividadCompletarEspacios = {
  tipo: "completarEspacios";
  texto: string; // cada MARCA_ESPACIO es un espacio, en orden
  espacios: EspacioRespuesta[]; // uno por cada MARCA_ESPACIO del texto
};

export type ActividadPreguntaAbierta = {
  tipo: "preguntaAbierta";
  pregunta: string;
  solucion: string;
};

export type ParejaEmparejar = {
  izquierda: string;
  derecha: string;
};

export type ActividadEmparejar = {
  tipo: "emparejar";
  consigna?: string; // sin ella, CONSIGNA_POR_DEFECTO
  parejas: ParejaEmparejar[]; // la izquierda va en este orden; los clientes mezclan la derecha
};

export type ElementoClasificar = {
  texto: string;
  categoria: number; // índice en `categorias`
};

export type ActividadClasificar = {
  tipo: "clasificar";
  consigna?: string; // sin ella, CONSIGNA_POR_DEFECTO
  categorias: string[]; // en el orden del autor
  elementos: ElementoClasificar[]; // los clientes los mezclan
};

export type ActividadOrdenar = {
  tipo: "ordenar";
  consigna: string;
  elementos: string[]; // en el orden correcto; los clientes los mezclan
};

export type ActividadBancoPalabras = {
  tipo: "bancoPalabras";
  consigna?: string; // sin ella, CONSIGNA_POR_DEFECTO
  texto: string; // cada MARCA_ESPACIO es un espacio, en orden
  fichas: string[]; // recortadas; se pueden repetir; los clientes las mezclan
  espacios: EspacioRespuesta[]; // uno por cada MARCA_ESPACIO del texto
};

// Los lenguajes de un reto de código (F12). Solo se muestran como etiqueta: no hay
// coloreado de sintaxis.
export const LENGUAJES_CODIGO = [
  "c",
  "css",
  "html",
  "javascript",
  "python",
  "sql",
  "bash",
  "otro",
] as const;

export type LenguajeCodigo = (typeof LENGUAJES_CODIGO)[number];

// Cómo se escribe cada uno. "otro" no se muestra al alumno.
export const NOMBRE_LENGUAJE: Record<LenguajeCodigo, string> = {
  c: "C",
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  python: "Python",
  sql: "SQL",
  bash: "Bash",
  otro: "Otro",
};

export type ActividadRetoCodigo = {
  tipo: "retoCodigo";
  consigna: string;
  lenguaje: LenguajeCodigo;
  codigoInicial?: string; // con lo que empieza el campo; sin él, vacío
  solucion: string; // se muestra al comprobar; el alumno se autoevalúa
};

export type ActividadTerminalSimulada = {
  tipo: "terminalSimulada";
  consigna: string;
  carpeta?: string; // va antes del $
  salidaPrevia?: string; // lo que la terminal ya muestra
  comandos: string[]; // las formas aceptadas; la primera se muestra como respuesta correcta
  salidaAcierto?: string; // se muestra si acierta
  pista?: string; // se muestra si falla
};

export type CommitGrafo = {
  nombre: string;
  padres: number[]; // índices de commits anteriores: ninguno el primero, dos un merge
};

export type RamaGrafo = {
  nombre: string;
  commit: number; // índice en `commits`
};

// HEAD apunta a una rama o, suelto, a un commit.
export type HeadGrafo = { rama: number } | { commit: number };

export type ActividadGrafoCommits = {
  tipo: "grafoCommits";
  consigna: string;
  commits: CommitGrafo[]; // del más antiguo al más nuevo; los clientes los acomodan
  ramas: RamaGrafo[]; // en el orden del autor: una fila por rama, de arriba abajo
  head?: HeadGrafo;
  respuesta: number; // índice en `commits`
  explicacion?: string; // se muestra al comprobar, acierte o no
};

export type Actividad =
  | ActividadTeoria
  | ActividadTarjeta
  | ActividadOpcionMultiple
  | ActividadCompletarEspacios
  | ActividadPreguntaAbierta
  | ActividadEmparejar
  | ActividadClasificar
  | ActividadOrdenar
  | ActividadBancoPalabras
  | ActividadRetoCodigo
  | ActividadTerminalSimulada
  | ActividadGrafoCommits;

export type TipoActividad = Actividad["tipo"];

// La lección que se cursa: lo del resumen más sus actividades, en orden.
export type DetalleLeccion = ResumenLeccion & {
  actividades: Actividad[];
};

export type RespuestaLeccion = {
  leccion: DetalleLeccion;
};

// Marca de un espacio dentro de ActividadCompletarEspacios.texto
export const MARCA_ESPACIO = "___";

// Lo que ve el alumno en una actividad sin consigna (F11). Ordenar siempre trae la suya.
export const CONSIGNA_POR_DEFECTO = {
  emparejar: "Empareja los conceptos",
  clasificar: "Clasifica cada elemento",
  bancoPalabras: "Completa con las fichas del banco",
} as const;

// Longitudes en caracteres Unicode: Array.from(texto).length
export const LIMITES_ACTIVIDADES = {
  opcionesMin: 2,
  opcionesMax: 9, // en la web se eligen con las teclas 1 a 9
  respuestaEspacioMax: 100,
  respuestaAbiertaMax: 2000,
  // lo que escribe el autor (F05)
  tituloMax: 100,
  textoMax: 5000,
  codigoMax: 2000,
  puntosClaveMax: 10,
  puntoClaveMax: 200,
  frenteMax: 200,
  reversoMax: 1000,
  preguntaMax: 500,
  opcionTextoMax: 200,
  opcionSimboloMax: 4,
  textoEspaciosMax: 2000,
  espaciosMax: 20,
  aceptadasMax: 10,
  solucionMax: 2000,
  // actividades de relacionar (F11)
  consignaMax: 500,
  parejasMin: 3, // con 2, la regla de que nunca salen resueltas delataría la respuesta
  parejasMax: 8,
  parejaTextoMax: 200,
  categoriasMin: 2,
  categoriasMax: 4,
  categoriaMax: 100,
  elementosClasificarMin: 2,
  elementosClasificarMax: 12,
  elementoClasificarMax: 100,
  elementosOrdenarMin: 3, // igual que parejasMin
  elementosOrdenarMax: 10,
  elementoOrdenarMax: 200,
  espaciosBancoMax: 10,
  fichasMin: 2,
  fichasMax: 20,
  fichaMax: 100,
  // actividades de código y terminal (F12); la consigna usa consignaMax, el código
  // inicial codigoMax y la solución solucionMax
  respuestaCodigoMax: 2000, // lo que escribe el alumno
  carpetaMax: 100,
  salidaMax: 2000,
  comandosMax: 10,
  comandoMax: 200, // también lo que escribe el alumno
  pistaMax: 500,
  commitsMin: 2,
  commitsMax: 10,
  nombreCommitMax: 4, // cabe dentro del círculo
  columnasGrafoMax: 6, // con áreas de 44 px, cabe en un teléfono de 360 px
  ramasMax: 4,
  nombreRamaMax: 20,
  explicacionMax: 500,
} as const;

export const MENSAJES_LECCION = {
  // mismo mensaje si la lección no existe, es de otro curso o su curso no está publicado
  leccionNoDisponible: "Esta lección no existe o ya no está disponible.",
} as const;

// ---------------------------------------------------------------------------
// Progreso (F04)
// ---------------------------------------------------------------------------

// Qué tipos de actividad son preguntas: cuentan en "Acertaste {a} de {p}" y
// en el progreso. Al ser un Record, agregar un tipo a `Actividad` obliga a
// decidir aquí si se califica (principio IV).
export const CALIFICA_ACTIVIDAD: Record<TipoActividad, boolean> = {
  teoria: false,
  tarjeta: false,
  opcionMultiple: true,
  completarEspacios: true,
  preguntaAbierta: true,
  emparejar: true,
  clasificar: true,
  ordenar: true,
  bancoPalabras: true,
  retoCodigo: true,
  terminalSimulada: true,
  grafoCommits: true,
};

// La última vez que el alumno completó una lección.
export type ProgresoLeccion = {
  aciertos: number;
  preguntas: number; // 0 si la lección no tiene preguntas
  completadaEn: string; // ISO 8601
};

// Una lección en el detalle del curso, con el progreso de quien pregunta
// (null si no la ha completado).
export type LeccionDelCurso = ResumenLeccion & {
  progreso: ProgresoLeccion | null;
};

// PUT /cursos/:idCurso/lecciones/:idLeccion/progreso
export type CuerpoProgresoLeccion = {
  aciertos: number;
  preguntas: number;
};

export type RespuestaProgresoLeccion = {
  progreso: ProgresoLeccion;
};

// Un curso con al menos una lección completada por quien pregunta.
export type CursoEmpezado = ResumenCurso & {
  leccionesCompletadas: number; // de cantidadLecciones
  ultimoAvanceEn: string; // ISO 8601: la última lección completada, ordena la lista
};

export type RespuestaCursosEmpezados = {
  cursos: CursoEmpezado[]; // del avance más reciente al más antiguo
};

export const MENSAJES_PROGRESO = {
  // el cuerpo no es un resultado válido, o no corresponde a la lección
  resultadoInvalido: "El resultado no corresponde a la lección.",
} as const;

// ---------------------------------------------------------------------------
// Editor de cursos (F05)
// ---------------------------------------------------------------------------

export type EstadoCurso = "borrador" | "enRevision" | "publicado";

// Un curso en "Cursos que creé".
export type CursoDelAutor = {
  id: string;
  titulo: string;
  estado: EstadoCurso;
  revisionRechazada: boolean; // la última revisión se rechazó; se va al enviarlo otra vez
  cantidadLecciones: number;
};

export type RespuestaCursosDelAutor = {
  cursos: CursoDelAutor[]; // del que cambió más recientemente al más antiguo
};

// POST /editor/cursos y PUT /editor/cursos/:idCurso
export type CuerpoDatosCurso = {
  titulo: string;
  descripcion: string;
};

// Una lección en el mapa del curso.
export type LeccionEnMapa = ResumenLeccion & {
  cantidadActividades: number;
};

export type CursoEnEditor = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoCurso;
  revisionRechazada: boolean;
  motivoRechazo: string | null; // puede haber rechazo sin motivo
  lecciones: LeccionEnMapa[]; // por posición
};

export type RespuestaCursoEnEditor = {
  curso: CursoEnEditor;
};

// POST /editor/cursos/:idCurso/lecciones
export type CuerpoNuevaLeccion = {
  titulo: string;
};

export type RespuestaLeccionEnMapa = {
  leccion: LeccionEnMapa;
};

// PUT /editor/cursos/:idCurso/lecciones-orden
export type CuerpoOrdenLecciones = {
  idsLecciones: string[]; // todas las del curso, en el orden nuevo
};

// La lección que se edita. `version` sube cada vez que se guarda.
export type LeccionEnEditor = DetalleLeccion & {
  version: number;
};

export type RespuestaLeccionEnEditor = {
  leccion: LeccionEnEditor;
};

// PUT /editor/cursos/:idCurso/lecciones/:idLeccion
export type CuerpoGuardarLeccion = {
  titulo: string;
  actividades: Actividad[];
  version: number; // la que el autor abrió
  reemplazar?: boolean; // true: guarda aunque haya una versión más nueva
};

// Longitudes en caracteres Unicode: Array.from(texto).length
export const LIMITES_CURSO = {
  tituloMax: 100,
  descripcionMax: 1000,
  leccionesMax: 100,
} as const;

export const LIMITES_LECCION = {
  tituloMax: 100,
  actividadesMax: 50,
} as const;

export const MENSAJES_EDITOR = {
  datosInvalidos: "Revisa los datos marcados.",
  campoObligatorio: "Este campo es obligatorio.",
  // solo lo ve quien salta al cliente: los campos no dejan escribir de más
  textoLargo: "Este texto es más largo de lo permitido.",
  opcionRepetida: "Esta opción está repetida.",
  opcionCorrectaFalta: "Elige la opción correcta.",
  simboloLargo: "Un símbolo puede tener hasta 4 caracteres.",
  sinEspacios: "Agrega al menos un espacio con ___.",
  demasiadosEspacios: "El texto puede tener hasta 20 espacios.",
  gruposDeMas: "Hay más grupos de respuestas que espacios en el texto. Quita los que sobran.",
  // actividades de relacionar (F11)
  textoRepetido: "Este texto está repetido.",
  categoriaRepetida: "Esta categoría está repetida.",
  elementoRepetido: "Este elemento está repetido.",
  categoriaFalta: "Elige una categoría.",
  categoriaSinElementos: "Esta categoría no tiene elementos.",
  fichaFalta: "Marca al menos una ficha.",
  demasiadosEspaciosBanco: "El texto puede tener hasta 10 espacios.",
  fichasInsuficientes:
    "No alcanzan las fichas para llenar todos los espacios. Si una palabra va en dos, agrégala dos veces.",
  // actividades de código y terminal (F12)
  lenguajeFalta: "Elige un lenguaje.",
  comandoRepetido: "Este comando está repetido.",
  nombreCommitRepetido: "Este nombre ya lo tiene otro commit.",
  padreFalta: "Elige un padre.",
  segundoPadreIgual: "El segundo padre tiene que ser otro commit.",
  demasiadasColumnas:
    "El grafo puede tener hasta 6 commits seguidos de izquierda a derecha. Pon alguno en paralelo o quita alguno.",
  ramaRepetida: "Esta rama está repetida.",
  ramaHead: "Una rama no se puede llamar HEAD.",
  commitFalta: "Elige un commit.",
  respuestaFalta: "Elige la respuesta.",
  maxLecciones: "Un curso puede tener hasta 100 lecciones.",
  maxActividades: "Una lección puede tener hasta 50 actividades.",
  // al abrir una lección (403); al abrir, un 404 usa los mensajes de F02 y F03
  cursoPublicado: "Este curso está publicado y no se puede editar.",
  cursoEnRevision: "Este curso está en revisión y no se puede editar.",
  // al escribir (403 y 404)
  cursoPublicadoAlGuardar:
    "Este curso está publicado y no se puede editar. Tus cambios no se guardaron.",
  cursoEnRevisionAlGuardar:
    "Este curso está en revisión y no se puede editar. Tus cambios no se guardaron.",
  cursoEliminado: "Este curso ya no existe. Tus cambios no se guardaron.",
  leccionEliminada: "Esta lección ya no existe. Tus cambios no se guardaron.",
  // 409
  versionMasNueva: "Se guardó una versión más nueva de esta lección.",
  ordenDesactualizado: "El orden no coincide con las lecciones del curso.",
  // enviar y retirar (F06): 404, 409 y 400
  cursoNoExiste: "Este curso ya no existe.",
  estadoCambiado: "El estado de este curso cambió en otro lugar.",
  sinLecciones: "No se envió: el curso no tiene lecciones.",
  unaLeccionVacia: "No se envió: hay 1 lección sin actividades.",
  leccionesVacias: "No se envió: hay {n} lecciones sin actividades.", // {n} es 2 o más
} as const;
