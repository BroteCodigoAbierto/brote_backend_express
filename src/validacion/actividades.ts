import {
  LENGUAJES_CODIGO,
  LIMITES_ACTIVIDADES,
  MARCA_ESPACIO,
  type Actividad,
  type CommitGrafo,
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

// La carpeta, los comandos y los nombres del grafo van en una sola línea: la terminal y el
// círculo de un commit no tienen dónde poner un salto (F12).
function deUnaLinea(texto: string, campo: string) {
  if (/[\n\r]/.test(texto)) throw new ErrorActividad(`${campo}: de una línea`);
}

// Como compara la terminal (brote_specs, research de F12, punto 6): lo que escribe el alumno
// nunca trae comillas tipográficas, raya ni puntos suspensivos, así que en un comando del autor
// cuentan como sus versiones rectas; y una racha de espacios cuenta como uno. Es una copia de
// la de los clientes.
function normalizarComando(texto: string): string {
  return texto
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/—/g, "--")
    .replace(/…/g, "...")
    .trim()
    .replace(/\s+/g, " ");
}

// Un índice de una lista de `total` elementos. Con `total` igual al índice de un commit,
// también comprueba que el padre vaya antes que él.
function indiceEn(valor: unknown, total: number, campo: string): number {
  if (!Number.isInteger(valor) || (valor as number) < 0 || (valor as number) >= total) {
    throw new ErrorActividad(`${campo} fuera de rango`);
  }
  return valor as number;
}

// Columnas por generaciones (research de F12, punto 2): el primer commit en la 0 y cada uno de
// los demás en 1 más la mayor de sus padres. Como los padres van antes en la lista, basta una
// pasada. Los clientes acomodan el grafo con la misma regla; aquí solo hace falta el total,
// para el límite de columnas.
function contarColumnas(commits: CommitGrafo[]): number {
  const columnas: number[] = [];
  commits.forEach(({ padres }, indice) => {
    columnas[indice] =
      padres.length === 0 ? 0 : 1 + Math.max(...padres.map((padre) => columnas[padre]));
  });
  return Math.max(...columnas) + 1;
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

function validarOrdenar(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "consigna", "elementos"]);
  textoObligatorio(actividad, "consigna", LIMITES_ACTIVIDADES.consignaMax);
  const { elementosOrdenarMin, elementosOrdenarMax, elementoOrdenarMax } = LIMITES_ACTIVIDADES;
  const elementos = listaEntre(
    actividad.elementos,
    "elementos",
    elementosOrdenarMin,
    elementosOrdenarMax,
  );
  textosSinRepetir(
    elementos.map((elemento) => textoDeLista(elemento, "elementos", elementoOrdenarMax)),
    "elementos",
  );
}

// ¿Se puede dar a cada espacio una ficha que valga en él, sin usar una ficha dos veces?
// No basta con mirar espacio por espacio: con {a, b} y {a} y las fichas a y b hay solución,
// pero no si el primero toma a. Emparejamiento por caminos de aumento (brote_specs, research
// de F11, punto 5). Recibe los textos ya recortados.
function hayFormaDeLlenar(aceptadas: string[][], fichas: string[]): boolean {
  const duenoDe = new Map<number, number>();

  function asignar(espacio: number, vistas: Set<number>): boolean {
    for (const [ficha, texto] of fichas.entries()) {
      if (!aceptadas[espacio]?.includes(texto) || vistas.has(ficha)) continue;
      vistas.add(ficha);
      const dueno = duenoDe.get(ficha);
      if (dueno === undefined || asignar(dueno, vistas)) {
        duenoDe.set(ficha, espacio);
        return true;
      }
    }
    return false;
  }

  return aceptadas.every((_, espacio) => asignar(espacio, new Set()));
}

function validarEspacioBanco(espacio: unknown, indice: number, fichas: string[]): string[] {
  if (!esObjeto(espacio)) throw new ErrorActividad(`espacio ${indice + 1}: { aceptadas }`);
  soloCampos(espacio, ["aceptadas"]);
  const campo = `espacio ${indice + 1}`;
  const aceptadas = listaEntre(espacio.aceptadas, campo, 1, LIMITES_ACTIVIDADES.fichasMax);
  const recortadas = aceptadas.map((aceptada) =>
    textoDeLista(aceptada, campo, LIMITES_ACTIVIDADES.fichaMax).trim(),
  );
  if (!recortadas.every((aceptada) => fichas.includes(aceptada))) {
    throw new ErrorActividad(`${campo}: cada aceptada tiene que ser una ficha`);
  }
  return recortadas;
}

// Las fichas sí se pueden repetir: es la forma de usar una palabra en dos espacios. Se compara
// recortado, porque el recorte se hace después (validacion/editor.ts).
function validarBancoPalabras(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "consigna", "texto", "fichas", "espacios"]);
  textoOpcional(actividad, "consigna", LIMITES_ACTIVIDADES.consignaMax);
  textoObligatorio(actividad, "texto", LIMITES_ACTIVIDADES.textoEspaciosMax);
  const marcas = contarMarcas(actividad.texto as string);
  if (marcas === 0) throw new ErrorActividad(`texto sin ningún ${MARCA_ESPACIO}`);
  if (marcas > LIMITES_ACTIVIDADES.espaciosBancoMax) {
    throw new ErrorActividad(`texto: hasta ${LIMITES_ACTIVIDADES.espaciosBancoMax} espacios`);
  }
  const { fichasMin, fichasMax, fichaMax } = LIMITES_ACTIVIDADES;
  const fichas = listaEntre(actividad.fichas, "fichas", fichasMin, fichasMax).map((ficha) =>
    textoDeLista(ficha, "fichas", fichaMax).trim(),
  );
  const { espacios } = actividad;
  if (!Array.isArray(espacios) || espacios.length !== marcas) {
    throw new ErrorActividad(`espacios: debe haber ${marcas}, uno por cada ${MARCA_ESPACIO}`);
  }
  const aceptadas = espacios.map((espacio, indice) => validarEspacioBanco(espacio, indice, fichas));
  if (!hayFormaDeLlenar(aceptadas, fichas)) {
    throw new ErrorActividad("fichas: no alcanzan para llenar todos los espacios");
  }
}

function esLenguajeCodigo(valor: unknown): boolean {
  return (LENGUAJES_CODIGO as readonly unknown[]).includes(valor);
}

// El código inicial y la solución se guardan tal como llegan: son código, con su sangría.
function validarRetoCodigo(actividad: Objeto) {
  soloCampos(actividad, ["tipo", "consigna", "lenguaje", "codigoInicial", "solucion"]);
  textoObligatorio(actividad, "consigna", LIMITES_ACTIVIDADES.consignaMax);
  // Se guarda el id ("css"), no el nombre que se muestra ("CSS").
  if (!esLenguajeCodigo(actividad.lenguaje)) {
    throw new ErrorActividad(`lenguaje: uno de ${LENGUAJES_CODIGO.join(", ")}`);
  }
  textoOpcional(actividad, "codigoInicial", LIMITES_ACTIVIDADES.codigoMax);
  textoObligatorio(actividad, "solucion", LIMITES_ACTIVIDADES.solucionMax);
}

// Los comandos repetidos se comparan como los compara la terminal, y recortados, porque el
// recorte se hace después (validacion/editor.ts).
function validarTerminalSimulada(actividad: Objeto) {
  soloCampos(actividad, [
    "tipo",
    "consigna",
    "carpeta",
    "salidaPrevia",
    "comandos",
    "salidaAcierto",
    "pista",
  ]);
  const { consignaMax, carpetaMax, salidaMax, comandosMax, comandoMax, pistaMax } =
    LIMITES_ACTIVIDADES;
  textoObligatorio(actividad, "consigna", consignaMax);
  textoOpcional(actividad, "carpeta", carpetaMax);
  if ("carpeta" in actividad) deUnaLinea(actividad.carpeta as string, "carpeta");
  textoOpcional(actividad, "salidaPrevia", salidaMax);
  const comandos = listaEntre(actividad.comandos, "comandos", 1, comandosMax).map((valor) => {
    const comando = textoDeLista(valor, "comandos", comandoMax);
    deUnaLinea(comando, "comandos");
    return normalizarComando(comando);
  });
  if (new Set(comandos).size !== comandos.length) {
    throw new ErrorActividad("comandos repetidos");
  }
  textoOpcional(actividad, "salidaAcierto", salidaMax);
  textoOpcional(actividad, "pista", pistaMax);
}

// Los commits van del más antiguo al más nuevo: el primero no tiene padres y cada uno de los
// demás tiene uno o dos de más arriba. Así no puede haber ciclos (research de F12, punto 1).
function validarCommit(commit: unknown, indice: number): CommitGrafo {
  const campo = `commit ${indice + 1}`;
  if (!esObjeto(commit)) throw new ErrorActividad(`${campo}: { nombre, padres }`);
  soloCampos(commit, ["nombre", "padres"]);
  const nombre = textoDeLista(
    commit.nombre,
    `${campo}: nombre`,
    LIMITES_ACTIVIDADES.nombreCommitMax,
  );
  deUnaLinea(nombre, `${campo}: nombre`);
  const { padres } = commit;
  if (!Array.isArray(padres)) throw new ErrorActividad(`${campo}: padres debe ser una lista`);
  if (indice === 0 && padres.length !== 0) {
    throw new ErrorActividad(`${campo}: el primero no tiene padres`);
  }
  if (indice > 0 && (padres.length < 1 || padres.length > 2)) {
    throw new ErrorActividad(`${campo}: uno o dos padres`);
  }
  padres.forEach((padre) => indiceEn(padre, indice, `${campo}: padre`));
  if (padres.length === 2 && padres[0] === padres[1]) {
    throw new ErrorActividad(`${campo}: padres repetidos`);
  }
  return { nombre, padres: padres as number[] };
}

function validarCommitsGrafo(valor: unknown): CommitGrafo[] {
  const { commitsMin, commitsMax, columnasGrafoMax } = LIMITES_ACTIVIDADES;
  const commits = listaEntre(valor, "commits", commitsMin, commitsMax).map(validarCommit);
  textosSinRepetir(
    commits.map(({ nombre }) => nombre),
    "commits",
  );
  if (contarColumnas(commits) > columnasGrafoMax) {
    throw new ErrorActividad(`commits: hasta ${columnasGrafoMax} columnas`);
  }
  return commits;
}

function validarRama(rama: unknown, indice: number, commits: number): string {
  const campo = `rama ${indice + 1}`;
  if (!esObjeto(rama)) throw new ErrorActividad(`${campo}: { nombre, commit }`);
  soloCampos(rama, ["nombre", "commit"]);
  const nombre = textoDeLista(rama.nombre, `${campo}: nombre`, LIMITES_ACTIVIDADES.nombreRamaMax);
  deUnaLinea(nombre, `${campo}: nombre`);
  // Respetando las mayúsculas, como Git: "head" sí vale.
  if (nombre.trim() === "HEAD") throw new ErrorActividad(`${campo}: no se puede llamar HEAD`);
  indiceEn(rama.commit, commits, `${campo}: commit`);
  return nombre;
}

// HEAD apunta a una rama o, suelto, a un commit: un objeto con uno solo de los dos campos.
function validarHead(head: unknown, ramas: number, commits: number) {
  if (!esObjeto(head) || Object.keys(head).length !== 1) {
    throw new ErrorActividad("head: { rama } o { commit }");
  }
  soloCampos(head, ["rama", "commit"]);
  if ("rama" in head) indiceEn(head.rama, ramas, "head: rama");
  else indiceEn(head.commit, commits, "head: commit");
}

// `ramas` siempre está, aunque vacía. Los nombres repetidos se comparan recortados, porque el
// recorte se hace después (validacion/editor.ts).
function validarGrafoCommits(actividad: Objeto) {
  soloCampos(actividad, [
    "tipo",
    "consigna",
    "commits",
    "ramas",
    "head",
    "respuesta",
    "explicacion",
  ]);
  textoObligatorio(actividad, "consigna", LIMITES_ACTIVIDADES.consignaMax);
  const commits = validarCommitsGrafo(actividad.commits);
  const ramas = listaEntre(actividad.ramas, "ramas", 0, LIMITES_ACTIVIDADES.ramasMax).map(
    (rama, indice) => validarRama(rama, indice, commits.length),
  );
  textosSinRepetir(ramas, "ramas");
  if ("head" in actividad) validarHead(actividad.head, ramas.length, commits.length);
  indiceEn(actividad.respuesta, commits.length, "respuesta");
  textoOpcional(actividad, "explicacion", LIMITES_ACTIVIDADES.explicacionMax);
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
  ordenar: validarOrdenar,
  bancoPalabras: validarBancoPalabras,
  retoCodigo: validarRetoCodigo,
  terminalSimulada: validarTerminalSimulada,
  grafoCommits: validarGrafoCommits,
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
