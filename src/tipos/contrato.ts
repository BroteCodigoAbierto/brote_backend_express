// GENERADO desde brote_specs/contrato/contrato.ts (versión 0.11.0).
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

// El idioma de un curso (F14): el de la voz que lee las frases de escuchar y repetir. Las
// etiquetas son de BCP 47, que entienden la voz y los lectores de pantalla.
export const IDIOMAS_CURSO = ["es", "en", "fr", "pt", "de", "it", "ja", "zh", "ko"] as const;

export type IdiomaCurso = (typeof IDIOMAS_CURSO)[number];

// Cómo se escribe en una lista o en "Idioma: {idioma}". Dentro de una frase, en minúsculas.
export const NOMBRE_IDIOMA: Record<IdiomaCurso, string> = {
  es: "Español",
  en: "Inglés",
  fr: "Francés",
  pt: "Portugués",
  de: "Alemán",
  it: "Italiano",
  ja: "Japonés",
  zh: "Chino",
  ko: "Coreano",
};

// La variante que se prefiere para la voz y para marcar la frase (spec F14, "Supuestos").
// Si el dispositivo no la tiene, cualquier voz del idioma.
export const ETIQUETA_VOZ: Record<IdiomaCurso, string> = {
  es: "es-MX",
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-BR",
  de: "de-DE",
  it: "it-IT",
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
};

// Lo que muestra la tarjeta de un curso en el catálogo.
export type ResumenCurso = {
  id: string;
  titulo: string;
  descripcion: string;
  autor: AutorCurso;
  cantidadLecciones: number;
  idPortada: string | null; // F13: sin ella, la portada generada
};

export type ResumenLeccion = {
  id: string;
  titulo: string;
  posicion: number; // 1, 2, 3, ... en el orden del curso
};

// El detalle agrega la lista de lecciones, ordenadas por posición.
// Desde F04, cada lección trae el progreso de quien pregunta.
export type DetalleCurso = ResumenCurso & {
  idioma: IdiomaCurso; // F14
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
// Imágenes (F13)
// ---------------------------------------------------------------------------

export const FORMATOS_IMAGEN = ["jpeg", "png", "webp", "gif"] as const;

export type FormatoImagen = (typeof FORMATOS_IMAGEN)[number];

export const TIPO_MIME_IMAGEN: Record<FormatoImagen, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// Una imagen subida a un curso. Nunca cambia: otro archivo es otra imagen.
export type Imagen = {
  id: string;
  formato: FormatoImagen;
  ancho: number; // px
  alto: number; // px
  peso: number; // bytes
};

// Una imagen dentro de una actividad. Al guardar, el servidor reescribe los datos de
// Imagen con los suyos; el texto alternativo es del autor.
export type ImagenActividad = Imagen & {
  textoAlternativo?: string;
};

// POST /editor/cursos/:idCurso/imagenes
export type RespuestaImagen = {
  imagen: Imagen;
};

// GET RUTA_IMAGENES/:idImagen trae los bytes
export const RUTA_IMAGENES = "/imagenes";

// Lugar de una imagen dentro de ActividadTeoria.texto
export const MARCA_IMAGEN = "[imagen]";

// Pesos en bytes (MB de 1024 × 1024); longitudes en caracteres Unicode
export const LIMITES_IMAGENES = {
  pesoMax: 10 * 1024 * 1024, // JPEG, PNG y WebP, antes y después de reducirlos
  pesoGifMax: 5 * 1024 * 1024,
  ladoMax: 1600, // la web reduce las que no son GIF a esto
  imagenesTeoriaMax: 5,
  textoAlternativoMax: 200,
} as const;

export const MENSAJES_IMAGENES = {
  formatoInvalido: "Elige una imagen JPEG, PNG, WebP o GIF.",
  portadaGif: "La portada puede ser JPEG, PNG o WebP.",
  imagenPesada: "La imagen puede pesar hasta 10 MB.",
  gifPesado: "Un GIF puede pesar hasta 5 MB.",
  imagenIlegible: "No se pudo leer la imagen. Elige otra.",
  imagenGrande: "La imagen puede medir hasta 1600 px por lado.", // solo sin la web
  // solo sin la web: el editor le quita los datos ocultos y deja quieta una animación
  imagenSinPreparar:
    "La imagen trae datos ocultos o una animación. Súbela desde el editor de Brote.",
  subidaFallida: "No se pudo subir la imagen. Inténtalo de nuevo.",
  imagenFalta: "Elige una imagen.",
  imagenRepetida: "Esta imagen está repetida.",
  imagenNoEsta: "Esta imagen ya no está. Elige otra.",
  demasiadasImagenes: "El texto puede tener hasta 5 imágenes.",
  imagenesDeMas: "Hay más imágenes que marcas [imagen] en el texto. Quita las que sobran.",
  sinCargar: "No se pudo cargar la imagen",
  // GET /imagenes/:idImagen: mismo mensaje si no existe o no se puede ver
  imagenNoDisponible: "Esta imagen no existe o ya no está disponible.",
} as const;

// ---------------------------------------------------------------------------
// Archivos y audios (F14)
// ---------------------------------------------------------------------------

// Lo que comparten imágenes y audios (antes en LIMITES_IMAGENES y MENSAJES_IMAGENES).
export const LIMITES_ARCHIVOS = {
  pesoCursoMax: 200 * 1024 * 1024,
  pesoLeccionMax: 25 * 1024 * 1024, // el alumno los trae todos al abrirla
} as const;

export const MENSAJES_ARCHIVOS = {
  cursoLleno: "Este curso ya tiene 200 MB de archivos. Quita alguno y guarda para hacer espacio.",
  leccionPesada: "Los archivos de esta lección pesan más de 25 MB. Quita alguno.",
  esperarSubidas: "Espera a que terminen de subir los archivos.",
} as const;

export const FORMATOS_AUDIO = ["mp3", "m4a", "wav"] as const;

export type FormatoAudio = (typeof FORMATOS_AUDIO)[number];

// El que manda la web y con el que se sirve.
export const TIPO_MIME_AUDIO: Record<FormatoAudio, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
};

// Lo que acepta la subida: los navegadores no se ponen de acuerdo en cómo llamar a un M4A
// o a un WAV. El formato que cuenta es el de los bytes.
export const TIPOS_MIME_AUDIO_SUBIDA = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
] as const;

// Un audio de un curso, sin sus bytes.
export type Audio = {
  id: string;
  formato: FormatoAudio;
  duracion: number; // milisegundos
  peso: number; // bytes, ya sin sus datos ocultos
};

// POST /editor/cursos/:idCurso/audios
export type RespuestaAudio = {
  audio: Audio;
};

// GET RUTA_AUDIOS/:idAudio trae los bytes
export const RUTA_AUDIOS = "/audios";

export const LIMITES_AUDIOS = {
  pesoMax: 5 * 1024 * 1024, // el archivo que elige el autor
  duracionMax: 30_000, // ms; se compara redondeada a décimas
  grabacionMax: 30_000, // ms; lo que se graba el alumno
} as const;

export const MENSAJES_AUDIOS = {
  formatoInvalido: "Elige un audio MP3, M4A o WAV.",
  audioPesado: "El audio puede pesar hasta 5 MB.",
  audioLargo: "El audio puede durar hasta 30 segundos.",
  audioIlegible: "No se pudo leer el audio. Elige otro.",
  subidaFallida: "No se pudo subir el audio. Inténtalo de nuevo.",
  audioNoEsta: "Este audio ya no está. Elige otro.",
  // GET /audios/:idAudio: mismo mensaje si no existe o no se puede oír
  audioNoDisponible: "Este audio no existe o ya no está disponible.",
  // al cursar
  sinCargar: "No se pudo cargar el audio",
  noSono: "No se pudo reproducir la frase. Inténtalo de nuevo.",
  // {idioma} en minúsculas
  sinVoz:
    "Este dispositivo no tiene una voz en {idioma} para leer la frase. Puedes instalar una en sus ajustes.",
  sinPermiso: "Brote no tiene permiso para usar el micrófono. Puedes seguir sin grabarte.",
  permitirWeb: "Para grabarte, permite el micrófono en los ajustes del navegador.",
  permitirMovil: "Para grabarte, permite el micrófono en los ajustes del teléfono.",
  sinMicrofono: "No se encontró un micrófono. Puedes seguir sin grabarte.",
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
  texto: string; // párrafos separados por un renglón en blanco; cada MARCA_IMAGEN, una imagen
  codigo?: string; // bloque de código; las líneas con +, - o @@ se leen como diff
  puntosClave?: string[];
  imagenes?: ImagenActividad[]; // F13: una por cada MARCA_IMAGEN del texto, en orden
};

export type ActividadTarjeta = {
  tipo: "tarjeta";
  frente: string;
  reverso: string;
};

// Una opción es un texto, un símbolo que se muestra en grande (p. ej. "あ") o, desde F13,
// una imagen. Todas las de una pregunta son de la misma forma.
export type OpcionRespuesta = { texto: string } | { simbolo: string } | { imagen: ImagenActividad };

export type ActividadOpcionMultiple = {
  tipo: "opcionMultiple";
  pregunta: string;
  imagen?: ImagenActividad; // F13: la de la pregunta
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

// Un elemento de relacionar: un texto o, desde F13, una imagen. Toda una columna de
// emparejar, y todos los elementos de ordenar, son de la misma forma.
export type ContenidoElemento = string | ImagenActividad;

export type ParejaEmparejar = {
  izquierda: ContenidoElemento;
  derecha: ContenidoElemento;
};

export type ActividadEmparejar = {
  tipo: "emparejar";
  consigna?: string; // sin ella, CONSIGNA_POR_DEFECTO
  parejas: ParejaEmparejar[]; // la izquierda va en este orden; los clientes mezclan la derecha
};

// Todos de texto o, desde F13, todos de imagen.
export type ElementoClasificar =
  | { texto: string; categoria: number } // índice en `categorias`
  | { imagen: ImagenActividad; categoria: number };

export type ActividadClasificar = {
  tipo: "clasificar";
  consigna?: string; // sin ella, CONSIGNA_POR_DEFECTO
  categorias: string[]; // en el orden del autor
  elementos: ElementoClasificar[]; // los clientes los mezclan
};

export type ActividadOrdenar = {
  tipo: "ordenar";
  consigna: string;
  elementos: ContenidoElemento[]; // en el orden correcto; los clientes los mezclan
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

// Escuchar y repetir (F14): oye la frase (su audio o la voz del dispositivo, en el idioma
// del curso), la dice, se graba si quiere y se autoevalúa.
export type ActividadEscucharRepetir = {
  tipo: "escucharRepetir";
  frase: string; // de una línea
  mostrarTexto: boolean; // false: el alumno la ve al comprobar
  audio?: Audio; // sin él, la voz del dispositivo
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
  | ActividadGrafoCommits
  | ActividadEscucharRepetir;

export type TipoActividad = Actividad["tipo"];

// La lección que se cursa: lo del resumen más sus actividades, en orden.
export type DetalleLeccion = ResumenLeccion & {
  idioma: IdiomaCurso; // F14: el de su curso
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

// Escuchar y repetir no lleva consigna del autor (F14).
export const CONSIGNA_ESCUCHAR_REPETIR = "Escucha y repite.";

// "Más lento" (F14), con la voz y con el audio propio.
export const VELOCIDAD_LENTA = 0.6;

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
  // escuchar y repetir (F14)
  fraseMax: 200,
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
  escucharRepetir: true,
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
  idPortada: string | null; // F13
};

export type RespuestaCursosDelAutor = {
  cursos: CursoDelAutor[]; // del que cambió más recientemente al más antiguo
};

// POST /editor/cursos y PUT /editor/cursos/:idCurso
export type CuerpoDatosCurso = {
  titulo: string;
  descripcion: string;
  // F13, solo en el PUT: sin él la portada no cambia; null la quita
  idPortada?: string | null;
  // F14: sin él no cambia; el POST sin él crea el curso en "es"
  idioma?: IdiomaCurso;
};

// Una lección en el mapa del curso.
export type LeccionEnMapa = ResumenLeccion & {
  cantidadActividades: number;
};

export type CursoEnEditor = {
  id: string;
  titulo: string;
  descripcion: string;
  idioma: IdiomaCurso; // F14
  estado: EstadoCurso;
  revisionRechazada: boolean;
  motivoRechazo: string | null; // puede haber rechazo sin motivo
  portada: Imagen | null; // F13
  // F14: bytes de todas sus imágenes y sus audios, hasta LIMITES_ARCHIVOS.pesoCursoMax
  pesoArchivos: number;
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
