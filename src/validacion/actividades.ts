import {
  LIMITES_ACTIVIDADES,
  MARCA_ESPACIO,
  type Actividad,
  type TipoActividad,
} from "../tipos/contrato.ts";

// Forma de las actividades de una lección (brote_specs, data-model de F03 y
// F05). La columna leccion.actividades no la comprueba la base: solo se escribe
// después de pasar por aquí. La usan el script de datos de prueba y el editor
// (validacion/editor.ts); la importación (F07) la envolverá igual.

type Objeto = Record<string, unknown>;

// Lo que falló dentro de una actividad; validarActividades le agrega cuál fue.
class ErrorActividad extends Error {}

// El mensaje dice la posición (desde 1), el tipo y el campo que falló; `indice`
// (desde 0) es para señalar la actividad sin tener que leerlo de ese texto.
export class ErrorActividades extends Error {
  indice: number;

  constructor(indice: number, mensaje: string, opciones?: ErrorOptions) {
    super(mensaje, opciones);
    this.indice = indice;
  }
}

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

function comprobarLargo(texto: string, campo: string, maximo: number) {
  if (largo(texto) > maximo) throw new ErrorActividad(`${campo}: hasta ${maximo} caracteres`);
}

function textoObligatorio(objeto: Objeto, campo: string, maximo: number) {
  const texto = objeto[campo];
  if (!esTextoNoVacio(texto)) throw new ErrorActividad(`falta ${campo} o está vacío`);
  comprobarLargo(texto, campo, maximo);
}

function textoOpcional(objeto: Objeto, campo: string, maximo: number) {
  if (!(campo in objeto)) return;
  const texto = objeto[campo];
  if (!esTextoNoVacio(texto)) throw new ErrorActividad(`${campo} está vacío`);
  comprobarLargo(texto, campo, maximo);
}

// Un campo de más es casi siempre un error de dedo ("puntoClave"): mejor
// rechazarlo que perderlo en silencio.
function soloCampos(objeto: Objeto, permitidos: string[]) {
  const sobrante = Object.keys(objeto).find((campo) => !permitidos.includes(campo));
  if (sobrante) throw new ErrorActividad(`campo desconocido: ${sobrante}`);
}

// Devuelve la lista para no tener que volver a comprobar que lo es.
function listaEntre(valor: unknown, campo: string, minimo: number, maximo: number): unknown[] {
  if (!Array.isArray(valor) || valor.length < minimo || valor.length > maximo) {
    throw new ErrorActividad(`${campo}: entre ${minimo} y ${maximo}`);
  }
  return valor;
}

function textoDeLista(valor: unknown, campo: string, maximo: number): string {
  if (!esTextoNoVacio(valor)) throw new ErrorActividad(`${campo}: textos no vacíos`);
  comprobarLargo(valor, campo, maximo);
  return valor;
}

// Se comparan recortados, respetando las mayúsculas, como las opciones de F05.
function textosSinRepetir(textos: string[], campo: string) {
  const recortados = textos.map((texto) => texto.trim());
  if (new Set(recortados).size !== recortados.length) {
    throw new ErrorActividad(`${campo}: textos repetidos`);
  }
}

function contarMarcas(texto: string): number {
  return texto.split(MARCA_ESPACIO).length - 1;
}

function validarTeoria(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "titulo", "texto", "codigo", "puntosClave"]);
  textoOpcional(actividad, "titulo", LIMITES_ACTIVIDADES.tituloMax);
  textoObligatorio(actividad, "texto", LIMITES_ACTIVIDADES.textoMax);
  textoOpcional(actividad, "codigo", LIMITES_ACTIVIDADES.codigoMax);
  if ("puntosClave" in actividad) {
    const puntos = actividad.puntosClave;
    if (!Array.isArray(puntos) || puntos.length === 0 || !puntos.every(esTextoNoVacio)) {
      throw new ErrorActividad("puntosClave, si está, debe tener al menos un texto no vacío");
    }
    if (puntos.length > LIMITES_ACTIVIDADES.puntosClaveMax) {
      throw new ErrorActividad(`puntosClave: hasta ${LIMITES_ACTIVIDADES.puntosClaveMax}`);
    }
    puntos.forEach((punto) =>
      comprobarLargo(punto, "puntosClave", LIMITES_ACTIVIDADES.puntoClaveMax),
    );
  }
}

function validarTarjeta(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "frente", "reverso"]);
  textoObligatorio(actividad, "frente", LIMITES_ACTIVIDADES.frenteMax);
  textoObligatorio(actividad, "reverso", LIMITES_ACTIVIDADES.reversoMax);
}

function validarOpcion(opcion: unknown, indice: number) {
  const valida =
    esObjeto(opcion) &&
    Object.keys(opcion).length === 1 &&
    (esTextoNoVacio(opcion.texto) || esTextoNoVacio(opcion.simbolo));
  if (!valida) throw new ErrorActividad(`opción ${indice + 1}: debe ser { texto } o { simbolo }`);
  if ("simbolo" in opcion) {
    comprobarLargo(opcion.simbolo as string, "simbolo", LIMITES_ACTIVIDADES.opcionSimboloMax);
  } else {
    comprobarLargo(opcion.texto as string, "texto", LIMITES_ACTIVIDADES.opcionTextoMax);
  }
}

// Todas de texto o todas de símbolo, y sin repetirse: se comparan recortadas,
// respetando las mayúsculas (spec F05, "Opción múltiple"). Ya pasaron por
// validarOpcion.
function compararOpciones(opciones: Objeto[]) {
  const conSimbolo = opciones.filter((opcion) => "simbolo" in opcion).length;
  if (conSimbolo !== 0 && conSimbolo !== opciones.length) {
    throw new ErrorActividad("opciones: todas de texto o todas de símbolo");
  }
  const textos = opciones.map((opcion) => ((opcion.texto ?? opcion.simbolo) as string).trim());
  if (new Set(textos).size !== textos.length) throw new ErrorActividad("opciones repetidas");
}

function validarOpcionMultiple(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "pregunta", "codigo", "opciones", "correcta"]);
  textoObligatorio(actividad, "pregunta", LIMITES_ACTIVIDADES.preguntaMax);
  textoOpcional(actividad, "codigo", LIMITES_ACTIVIDADES.codigoMax);
  const { opciones, correcta } = actividad;
  const { opcionesMin, opcionesMax } = LIMITES_ACTIVIDADES;
  if (!Array.isArray(opciones) || opciones.length < opcionesMin || opciones.length > opcionesMax) {
    throw new ErrorActividad(`opciones: entre ${opcionesMin} y ${opcionesMax}`);
  }
  opciones.forEach(validarOpcion);
  compararOpciones(opciones as Objeto[]);
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
    aceptadas.length <= LIMITES_ACTIVIDADES.aceptadasMax &&
    aceptadas.every(
      (aceptada) =>
        esTextoNoVacio(aceptada) && largo(aceptada) <= LIMITES_ACTIVIDADES.respuestaEspacioMax,
    );
  if (!valido) {
    throw new ErrorActividad(
      `espacio ${indice + 1}: { aceptadas } con 1 a ${LIMITES_ACTIVIDADES.aceptadasMax} respuestas no vacías de hasta ${LIMITES_ACTIVIDADES.respuestaEspacioMax} caracteres`,
    );
  }
}

function validarCompletarEspacios(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "texto", "espacios"]);
  textoObligatorio(actividad, "texto", LIMITES_ACTIVIDADES.textoEspaciosMax);
  const marcas = contarMarcas(actividad.texto as string);
  if (marcas === 0) throw new ErrorActividad(`texto sin ningún ${MARCA_ESPACIO}`);
  if (marcas > LIMITES_ACTIVIDADES.espaciosMax) {
    throw new ErrorActividad(`texto: hasta ${LIMITES_ACTIVIDADES.espaciosMax} espacios`);
  }
  const { espacios } = actividad;
  if (!Array.isArray(espacios) || espacios.length !== marcas) {
    throw new ErrorActividad(`espacios: debe haber ${marcas}, uno por cada ${MARCA_ESPACIO}`);
  }
  espacios.forEach(validarEspacio);
}

function validarPreguntaAbierta(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "pregunta", "solucion"]);
  textoObligatorio(actividad, "pregunta", LIMITES_ACTIVIDADES.preguntaMax);
  textoObligatorio(actividad, "solucion", LIMITES_ACTIVIDADES.solucionMax);
}

function validarPareja(pareja: unknown, indice: number) {
  if (!esObjeto(pareja)) throw new ErrorActividad(`pareja ${indice + 1}: { izquierda, derecha }`);
  soloCampos(pareja, ["izquierda", "derecha"]);
  textoObligatorio(pareja, "izquierda", LIMITES_ACTIVIDADES.parejaTextoMax);
  textoObligatorio(pareja, "derecha", LIMITES_ACTIVIDADES.parejaTextoMax);
}

function validarEmparejar(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "consigna", "parejas"]);
  textoOpcional(actividad, "consigna", LIMITES_ACTIVIDADES.consignaMax);
  const { parejasMin, parejasMax } = LIMITES_ACTIVIDADES;
  const parejas = listaEntre(actividad.parejas, "parejas", parejasMin, parejasMax);
  parejas.forEach(validarPareja);
  const validas = parejas as Objeto[];
  textosSinRepetir(
    validas.map(({ izquierda }) => izquierda as string),
    "izquierda",
  );
  textosSinRepetir(
    validas.map(({ derecha }) => derecha as string),
    "derecha",
  );
}

function validarElementoClasificar(elemento: unknown, indice: number, categorias: number) {
  if (!esObjeto(elemento)) throw new ErrorActividad(`elemento ${indice + 1}: { texto, categoria }`);
  soloCampos(elemento, ["texto", "categoria"]);
  textoObligatorio(elemento, "texto", LIMITES_ACTIVIDADES.elementoClasificarMax);
  const { categoria } = elemento;
  if (
    !Number.isInteger(categoria) ||
    (categoria as number) < 0 ||
    (categoria as number) >= categorias
  ) {
    throw new ErrorActividad(`elemento ${indice + 1}: categoria fuera de rango`);
  }
}

function validarClasificar(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "consigna", "categorias", "elementos"]);
  textoOpcional(actividad, "consigna", LIMITES_ACTIVIDADES.consignaMax);
  const { categoriasMin, categoriasMax, elementosClasificarMin, elementosClasificarMax } =
    LIMITES_ACTIVIDADES;
  const categorias = listaEntre(actividad.categorias, "categorias", categoriasMin, categoriasMax);
  const nombres = categorias.map((categoria) =>
    textoDeLista(categoria, "categorias", LIMITES_ACTIVIDADES.categoriaMax),
  );
  textosSinRepetir(nombres, "categorias");
  const elementos = listaEntre(
    actividad.elementos,
    "elementos",
    elementosClasificarMin,
    elementosClasificarMax,
  );
  elementos.forEach((elemento, indice) =>
    validarElementoClasificar(elemento, indice, nombres.length),
  );
  const validos = elementos as Objeto[];
  textosSinRepetir(
    validos.map(({ texto }) => texto as string),
    "elementos",
  );
  const usadas = new Set(validos.map(({ categoria }) => categoria));
  if (usadas.size !== nombres.length) {
    throw new ErrorActividad("categorias: cada una necesita al menos un elemento");
  }
}

// Una entrada por cada tipo del contrato: si el contrato agrega uno, no compila.
const validadores: Record<TipoActividad, (actividad: Objeto) => void> = {
  teoria: validarTeoria,
  tarjeta: validarTarjeta,
  opcionMultiple: validarOpcionMultiple,
  completarEspacios: validarCompletarEspacios,
  preguntaAbierta: validarPreguntaAbierta,
  emparejar: validarEmparejar,
  clasificar: validarClasificar,
};

function esTipoConocido(tipo: unknown): tipo is TipoActividad {
  return typeof tipo === "string" && Object.hasOwn(validadores, tipo);
}

// Lanza ErrorActividades("actividad N (tipo): ...") en el primer problema.
export function validarActividades(valor: unknown): Actividad[] {
  if (!Array.isArray(valor)) throw new Error("las actividades deben ser una lista");
  valor.forEach((actividad: unknown, indice) => {
    const posicion = `actividad ${indice + 1}`;
    if (!esObjeto(actividad) || !esTipoConocido(actividad.tipo)) {
      const tipo = esObjeto(actividad) ? String(actividad.tipo) : "sin tipo";
      throw new ErrorActividades(indice, `${posicion} (${tipo}): tipo desconocido`);
    }
    try {
      validadores[actividad.tipo](actividad);
    } catch (error) {
      if (!(error instanceof ErrorActividad)) throw error;
      throw new ErrorActividades(indice, `${posicion} (${actividad.tipo}): ${error.message}`, {
        cause: error,
      });
    }
  });
  return valor as Actividad[];
}
