// GENERADO desde brote_specs/contrato/contrato.ts (versión 0.4.0).
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
export type DetalleCurso = ResumenCurso & {
  lecciones: ResumenLeccion[];
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
  aceptadas: string[]; // la primera es la que se muestra como respuesta esperada
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

export type Actividad =
  | ActividadTeoria
  | ActividadTarjeta
  | ActividadOpcionMultiple
  | ActividadCompletarEspacios
  | ActividadPreguntaAbierta;

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

// Longitudes en caracteres Unicode: Array.from(texto).length
export const LIMITES_ACTIVIDADES = {
  opcionesMin: 2,
  opcionesMax: 9, // en la web se eligen con las teclas 1 a 9
  respuestaEspacioMax: 100,
  respuestaAbiertaMax: 2000,
} as const;

export const MENSAJES_LECCION = {
  // mismo mensaje si la lección no existe, es de otro curso o su curso no está publicado
  leccionNoDisponible: "Esta lección no existe o ya no está disponible.",
} as const;
