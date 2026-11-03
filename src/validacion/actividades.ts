import {
  LIMITES_ACTIVIDADES,
  MARCA_ESPACIO,
  type Actividad,
  type TipoActividad,
} from "../tipos/contrato.ts";

// Forma de las actividades de una lección (brote_specs, data-model de F03).
// La columna leccion.actividades no la comprueba la base: solo se escribe
// después de pasar por aquí. En F03 la usa el script de datos de prueba; el
// editor (F05) y la importación (F07) la envolverán en ErrorApi(400, ...).

type Objeto = Record<string, unknown>;

// Error con la posición (desde 1), el tipo y el campo que falló.
class ErrorActividad extends Error {}

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// En caracteres Unicode, igual que los clientes cuentan con maxLength.
function largo(texto: string): number {
  return Array.from(texto).length;
}

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

function textoObligatorio(objeto: Objeto, campo: string) {
  if (!esTextoNoVacio(objeto[campo])) throw new ErrorActividad(`falta ${campo} o está vacío`);
}

function textoOpcional(objeto: Objeto, campo: string) {
  if (campo in objeto && !esTextoNoVacio(objeto[campo])) {
    throw new ErrorActividad(`${campo} está vacío`);
  }
}

// Un campo de más es casi siempre un error de dedo ("puntoClave"): mejor
// rechazarlo que perderlo en silencio.
function soloCampos(objeto: Objeto, permitidos: string[]) {
  const sobrante = Object.keys(objeto).find((campo) => !permitidos.includes(campo));
  if (sobrante) throw new ErrorActividad(`campo desconocido: ${sobrante}`);
}

function validarTeoria(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "titulo", "texto", "codigo", "puntosClave"]);
  textoOpcional(actividad, "titulo");
  textoObligatorio(actividad, "texto");
  textoOpcional(actividad, "codigo");
  if ("puntosClave" in actividad) {
    const puntos = actividad.puntosClave;
    if (!Array.isArray(puntos) || puntos.length === 0 || !puntos.every(esTextoNoVacio)) {
      throw new ErrorActividad("puntosClave, si está, debe tener al menos un texto no vacío");
    }
  }
}

function validarTarjeta(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "frente", "reverso"]);
  textoObligatorio(actividad, "frente");
  textoObligatorio(actividad, "reverso");
}

function validarOpcion(opcion: unknown, indice: number) {
  const valida =
    esObjeto(opcion) &&
    Object.keys(opcion).length === 1 &&
    (esTextoNoVacio(opcion.texto) || esTextoNoVacio(opcion.simbolo));
  if (!valida) throw new ErrorActividad(`opción ${indice + 1}: debe ser { texto } o { simbolo }`);
}

function validarOpcionMultiple(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "pregunta", "codigo", "opciones", "correcta"]);
  textoObligatorio(actividad, "pregunta");
  textoOpcional(actividad, "codigo");
  const { opciones, correcta } = actividad;
  const { opcionesMin, opcionesMax } = LIMITES_ACTIVIDADES;
  if (!Array.isArray(opciones) || opciones.length < opcionesMin || opciones.length > opcionesMax) {
    throw new ErrorActividad(`opciones: entre ${opcionesMin} y ${opcionesMax}`);
  }
  opciones.forEach(validarOpcion);
  if (
    !Number.isInteger(correcta) ||
    (correcta as number) < 0 ||
    (correcta as number) >= opciones.length
  ) {
    throw new ErrorActividad("correcta fuera de rango");
  }
}

function validarEspacio(espacio: unknown, indice: number) {
  const aceptadas = esObjeto(espacio) ? espacio.aceptadas : undefined;
  const valido =
    esObjeto(espacio) &&
    Object.keys(espacio).length === 1 &&
    Array.isArray(aceptadas) &&
    aceptadas.length > 0 &&
    aceptadas.every(
      (aceptada) =>
        esTextoNoVacio(aceptada) && largo(aceptada) <= LIMITES_ACTIVIDADES.respuestaEspacioMax,
    );
  if (!valido) {
    throw new ErrorActividad(
      `espacio ${indice + 1}: { aceptadas } con al menos una respuesta no vacía de hasta ${LIMITES_ACTIVIDADES.respuestaEspacioMax} caracteres`,
    );
  }
}

function validarCompletarEspacios(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "texto", "espacios"]);
  textoObligatorio(actividad, "texto");
  const marcas = (actividad.texto as string).split(MARCA_ESPACIO).length - 1;
  if (marcas === 0) throw new ErrorActividad(`texto sin ningún ${MARCA_ESPACIO}`);
  const { espacios } = actividad;
  if (!Array.isArray(espacios) || espacios.length !== marcas) {
    throw new ErrorActividad(`espacios: debe haber ${marcas}, uno por cada ${MARCA_ESPACIO}`);
  }
  espacios.forEach(validarEspacio);
}

function validarPreguntaAbierta(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "pregunta", "solucion"]);
  textoObligatorio(actividad, "pregunta");
  textoObligatorio(actividad, "solucion");
}

// Una entrada por cada tipo del contrato: si el contrato agrega uno, no compila.
const validadores: Record<TipoActividad, (actividad: Objeto) => void> = {
  teoria: validarTeoria,
  tarjeta: validarTarjeta,
  opcionMultiple: validarOpcionMultiple,
  completarEspacios: validarCompletarEspacios,
  preguntaAbierta: validarPreguntaAbierta,
};

function esTipoConocido(tipo: unknown): tipo is TipoActividad {
  return typeof tipo === "string" && Object.hasOwn(validadores, tipo);
}

// Lanza Error("actividad N (tipo): ...") en el primer problema.
export function validarActividades(valor: unknown): Actividad[] {
  if (!Array.isArray(valor)) throw new Error("las actividades deben ser una lista");
  valor.forEach((actividad: unknown, indice) => {
    const posicion = `actividad ${indice + 1}`;
    if (!esObjeto(actividad) || !esTipoConocido(actividad.tipo)) {
      const tipo = esObjeto(actividad) ? String(actividad.tipo) : "sin tipo";
      throw new Error(`${posicion} (${tipo}): tipo desconocido`);
    }
    try {
      validadores[actividad.tipo](actividad);
    } catch (error) {
      if (!(error instanceof ErrorActividad)) throw error;
      throw new Error(`${posicion} (${actividad.tipo}): ${error.message}`, { cause: error });
    }
  });
  return valor as Actividad[];
}
