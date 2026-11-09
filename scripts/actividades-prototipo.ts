// Actividades de los cuatro cursos del prototipo, ya convertidas al contrato
// (brote_specs, research de F03, punto 6, y de F11, punto 11). Salen de
// brote_specs/referencia/cursos-prototipo/ con los nueve tipos de F03 y F11, en su
// orden, sin glosario y con los textos sin cambios. Si cambia referencia/, se
// regeneran como dice la tarea T014 de F11. Las usa datos-prueba.ts.

import type { Actividad } from "../src/tipos/contrato.ts";

// Por título del curso, una lista por lección en el orden del curso.
export const ACTIVIDADES_PROTOTIPO: Record<string, Actividad[][]> = {
  "Git esencial": [
    [
      {
        tipo: "teoria",
        titulo: "El problema que resuelve Git",
        texto:
          'Imagina que editas un archivo importante y, a mitad de camino, te das cuenta de que la versión de hace dos días era mejor. Sin un sistema de control de versiones, tu única opción es intentar recordar qué cambiaste... o tener carpetas como "proyecto_final", "proyecto_final_v2", "proyecto_final_v2_de_verdad".\n\nGit resuelve esto guardando "fotografías" (snapshots) completas de tu proyecto cada vez que tú decides, para que puedas volver a cualquiera de ellas cuando quieras.',
        puntosClave: [
          "Sabes exactamente qué cambió y cuándo.",
          "Puedes volver a cualquier punto anterior sin perder el trabajo actual.",
          "Varias personas pueden trabajar sobre el mismo proyecto sin pisarse.",
        ],
      },
      {
        tipo: "tarjeta",
        frente: "¿Qué es un repositorio (repo)?",
        reverso:
          "La carpeta de tu proyecto una vez que Git empieza a llevar su historial. Vive junto a una carpeta oculta llamada .git.",
      },
      {
        tipo: "tarjeta",
        frente: "¿Qué es un commit?",
        reverso:
          "Una fotografía guardada del proyecto en un momento dado, con un mensaje que describe qué cambió.",
      },
      {
        tipo: "teoria",
        titulo: "Las tres áreas de Git",
        texto:
          "Git organiza tu trabajo en tres zonas:\n\n1. Working directory (directorio de trabajo): los archivos tal como los ves y editas.\n2. Staging area (zona de preparación): una lista de cambios que preparaste para el próximo commit.\n3. Repository (repositorio): el historial de commits ya guardados.\n\nUn archivo pasa de una zona a otra con comandos: primero lo preparas (staging), luego lo confirmas (commit).",
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál de estas afirmaciones es correcta?",
        opciones: [
          {
            texto: "Un commit es una fotografía del proyecto en un momento dado",
          },
          {
            texto: "Un commit borra el historial anterior",
          },
          {
            texto: "Solo puede existir un commit por proyecto",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "opcionMultiple",
        pregunta:
          "¿Qué zona de Git contiene los cambios que ya preparaste pero aún no confirmaste?",
        opciones: [
          {
            texto: "Staging area",
          },
          {
            texto: "Working directory",
          },
          {
            texto: "Repository",
          },
        ],
        correcta: 0,
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "De carpeta normal a repositorio",
        texto:
          "Todo empieza con un comando: git init. Convierte la carpeta actual en un repositorio Git, creando una carpeta oculta .git donde vivirá todo el historial.\n\nDesde ahí, el flujo típico es: editas archivos, los agregas al staging area con git add, y los confirmas con git commit.",
      },
      {
        tipo: "clasificar",
        consigna: "Clasifica cada comando según lo que afecta.",
        categorias: ["Solo prepara (staging)", "Guarda en el historial"],
        elementos: [
          {
            texto: "git add archivo.txt",
            categoria: 0,
          },
          {
            texto: 'git commit -m "mensaje"',
            categoria: 1,
          },
          {
            texto: "git add .",
            categoria: 0,
          },
          {
            texto: 'git commit -m "otro"',
            categoria: 1,
          },
        ],
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "Ver qué pasó",
        texto:
          "Con el tiempo, un repositorio acumula muchos commits. git log te muestra el historial completo: quién hizo cada commit, cuándo y con qué mensaje.\n\nSi quieres saber exactamente qué líneas cambiaron entre dos versiones de un archivo, usas git diff. La salida se ve así:",
        codigo:
          'diff --git a/index.html b/index.html\n@@ -1,5 +1,6 @@\n <!DOCTYPE html>\n <html>\n-  <title>Mi app</title>\n+  <title>Mi app increíble</title>\n+  <meta charset="utf-8">\n </html>',
      },
      {
        tipo: "opcionMultiple",
        pregunta: "En el diff de arriba, ¿qué línea se eliminó (marcada con -)?",
        codigo:
          'diff --git a/index.html b/index.html\n@@ -1,5 +1,6 @@\n <!DOCTYPE html>\n <html>\n-  <title>Mi app</title>\n+  <title>Mi app increíble</title>\n+  <meta charset="utf-8">\n </html>',
        opciones: [
          {
            texto: "<title>Mi app</title>",
          },
          {
            texto: "<title>Mi app increíble</title>",
          },
          {
            texto: '<meta charset="utf-8">',
          },
        ],
        correcta: 0,
      },
      {
        tipo: "teoria",
        titulo: "revert vs. reset: dos formas de deshacer",
        texto:
          "Si el error ya quedó guardado en un commit, tienes dos caminos:\n\ngit revert crea un commit nuevo que deshace los cambios del commit indicado, sin borrar el historial. Es la opción segura, sobre todo si ya compartiste tu trabajo con otras personas.\n\ngit reset mueve el puntero de la rama a un commit anterior, pudiendo borrar commits del historial. Es potente, pero conviene usarlo solo en trabajo que aún no has compartido.",
        puntosClave: [
          "revert: seguro, deja rastro, ideal para historial compartido.",
          "reset: reescribe el historial, ideal solo para trabajo local.",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta:
          "Ya empujaste (push) un commit con un error a un repositorio compartido con tu equipo. ¿Qué comando es más seguro para deshacerlo?",
        opciones: [
          {
            texto: "git revert",
          },
          {
            texto: "git reset --hard",
          },
          {
            texto: "borrar la carpeta y volver a clonar",
          },
        ],
        correcta: 0,
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "¿Por qué ramas?",
        texto:
          "Una rama (branch) es una línea de desarrollo independiente. La rama principal (main) normalmente contiene el código estable; cuando quieres construir algo nuevo sin arriesgar esa estabilidad, creas una rama aparte.\n\nCuando terminas, integras (merge) esa rama de vuelta a main.",
      },
      {
        tipo: "teoria",
        titulo: "Uniendo el trabajo: merge",
        texto:
          "Cuando tu rama está lista, vuelves a main y ejecutas git merge feature-login. Si main no avanzó mientras tanto, Git hace un fast-forward: simplemente mueve el puntero de main hasta el último commit de la rama.\n\nSi ambas ramas avanzaron por separado, Git crea un commit de merge que une ambas historias.",
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "Tu repo no está solo",
        texto:
          "Hasta ahora todo vivía en tu computadora. Un remoto es una copia del repositorio alojada en otro lugar (como GitHub o GitLab) con la que puedes sincronizarte. Por convención, el remoto principal se llama origin.\n\nLos comandos básicos: clone trae una copia completa de un remoto; push sube tus commits; pull trae y combina los commits nuevos del remoto; fetch solo los descarga sin combinarlos todavía.",
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "git clone <url>",
            derecha: "Descarga una copia completa de un repositorio remoto",
          },
          {
            izquierda: "git push",
            derecha: "Sube tus commits locales al remoto",
          },
          {
            izquierda: "git pull",
            derecha: "Descarga y combina los commits nuevos del remoto",
          },
          {
            izquierda: "git fetch",
            derecha: "Descarga los commits nuevos sin combinarlos todavía",
          },
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál es la diferencia principal entre git fetch y git pull?",
        opciones: [
          {
            texto: "pull descarga y combina automáticamente; fetch solo descarga",
          },
          {
            texto: "fetch sube cambios; pull los descarga",
          },
          {
            texto: "no hay diferencia",
          },
        ],
        correcta: 0,
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "¿Cuándo aparece un conflicto?",
        texto:
          'Un conflicto ocurre cuando Git no puede combinar automáticamente dos cambios, normalmente porque dos personas modificaron las mismas líneas de un archivo de forma distinta. Git no adivina cuál es la versión "correcta": te pide que decidas tú.\n\nCuando pasa, marca el archivo con marcadores especiales:',
        codigo:
          "<<<<<<< HEAD\n<h1>Bienvenido a mi app</h1>\n=======\n<h1>Bienvenido a Mi Súper App</h1>\n>>>>>>> feature-titulo",
      },
      {
        tipo: "teoria",
        titulo: "Cómo se lee un conflicto",
        texto:
          "Todo lo que está entre <<<<<<< HEAD y ======= es tu versión actual. Todo lo que está entre ======= y >>>>>>> nombre-rama es la versión que intentabas combinar.\n\nPara resolverlo, editas el archivo dejando el resultado que quieres, borras los tres marcadores, y confirmas un commit normal.",
      },
      {
        tipo: "completarEspacios",
        texto:
          "<<<<<<< ___\n<h1>Bienvenido a mi app</h1>\n___\n<h1>Bienvenido a Mi Súper App</h1>\n>>>>>>> feature-titulo",
        espacios: [
          {
            aceptadas: ["HEAD"],
          },
          {
            aceptadas: ["======="],
          },
        ],
      },
      {
        tipo: "clasificar",
        consigna: "Clasifica cada paso del proceso de resolver un conflicto.",
        categorias: ["Antes de resolver", "Después de resolver"],
        elementos: [
          {
            texto: "Ver los marcadores <<<<<<< ======= >>>>>>>",
            categoria: 0,
          },
          {
            texto: 'git status muestra el archivo como "both modified"',
            categoria: 0,
          },
          {
            texto: "Borrar los marcadores y dejar el código final",
            categoria: 1,
          },
          {
            texto: "git add del archivo ya resuelto",
            categoria: 1,
          },
          {
            texto: "git commit para cerrar el merge",
            categoria: 1,
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "¿Por qué crees que Git prefiere pedirte que decidas manualmente en vez de elegir una versión automáticamente?",
        solucion:
          "Porque un conflicto normalmente significa que dos personas tuvieron intenciones distintas sobre el mismo código. Git no tiene forma de saber cuál es la decisión correcta a nivel de negocio o diseño — solo una persona puede evaluar eso, así que Git se detiene y te lo entrega a ti en vez de arriesgarse a perder trabajo silenciosamente.",
      },
    ],
  ],
  "Japonés sencillo": [
    [
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál hiragana se lee 'a'?",
        opciones: [
          {
            simbolo: "あ",
          },
          {
            simbolo: "い",
          },
          {
            simbolo: "う",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "あ",
            derecha: "a",
          },
          {
            izquierda: "い",
            derecha: "i",
          },
          {
            izquierda: "う",
            derecha: "u",
          },
          {
            izquierda: "え",
            derecha: "e",
          },
        ],
      },
      {
        tipo: "tarjeta",
        frente: "お",
        reverso: "Se lee 'o', como en 'oso'. Es la última de las cinco vocales del hiragana.",
      },
    ],
    [
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cómo se dice 'gracias' en japonés?",
        opciones: [
          {
            texto: "ありがとう",
          },
          {
            texto: "さようなら",
          },
          {
            texto: "こんにちは",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "bancoPalabras",
        texto: "こんにちは、___ ですか？",
        fichas: ["元気", "忙しい", "学生"],
        espacios: [
          {
            aceptadas: ["元気"],
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "¿Cómo responderías 'estoy bien, gracias' en japonés? No te preocupes por ser 100% exacto.",
        solucion: "元気です、ありがとう。 (Genki desu, arigatou.)",
      },
    ],
    [
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "一",
            derecha: "1",
          },
          {
            izquierda: "二",
            derecha: "2",
          },
          {
            izquierda: "三",
            derecha: "3",
          },
          {
            izquierda: "四",
            derecha: "4",
          },
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál es el kanji para '5'?",
        opciones: [
          {
            simbolo: "五",
          },
          {
            simbolo: "四",
          },
          {
            simbolo: "三",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "tarjeta",
        frente: "三",
        reverso: "Se lee 'san', significa 3.",
      },
      {
        tipo: "ordenar",
        consigna: "Ordena estos números de menor a mayor.",
        elementos: ["一", "二", "三", "四", "五"],
      },
    ],
    [
      {
        tipo: "bancoPalabras",
        texto: "私は ___ です。",
        fichas: ["学生", "先生", "医者"],
        espacios: [
          {
            aceptadas: ["学生"],
          },
        ],
      },
      {
        tipo: "ordenar",
        consigna: "Ordena las palabras para formar 'watashi wa gakusei desu' (soy estudiante).",
        elementos: ["私は", "学生", "です"],
      },
      {
        tipo: "tarjeta",
        frente: "です",
        reverso:
          "Partícula que equivale a 'ser/estar' en forma cortés. Siempre va al final de la oración.",
      },
      {
        tipo: "preguntaAbierta",
        pregunta: "Preséntate en japonés usando la estructura 私は ___ です。",
        solucion: "私は Pedro です。 (Watashi wa Pedro desu. — Soy Pedro.)",
      },
    ],
  ],
  "Programación en C sencilla": [
    [
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál es la forma correcta de declarar un entero en C?",
        opciones: [
          {
            texto: "int x;",
          },
          {
            texto: "integer x;",
          },
          {
            texto: "x: int;",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: "___ main() {\n  return 0;\n}",
        espacios: [
          {
            aceptadas: ["int"],
          },
        ],
      },
      {
        tipo: "clasificar",
        categorias: ["Tipo de dato", "Palabra clave"],
        elementos: [
          {
            texto: "int",
            categoria: 0,
          },
          {
            texto: "if",
            categoria: 1,
          },
          {
            texto: "char",
            categoria: 0,
          },
          {
            texto: "while",
            categoria: 1,
          },
          {
            texto: "float",
            categoria: 0,
          },
          {
            texto: "return",
            categoria: 1,
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta: "¿Por qué en C hay que declarar el tipo de una variable antes de usarla?",
        solucion:
          "Porque C es un lenguaje de tipado estático: el compilador necesita saber el tipo de cada variable para reservar la cantidad correcta de memoria y validar las operaciones antes de ejecutar el programa.",
      },
    ],
    [
      {
        tipo: "opcionMultiple",
        pregunta: "¿Qué operador se usa para comparar igualdad en C?",
        opciones: [
          {
            texto: "==",
          },
          {
            texto: "=",
          },
          {
            texto: "===",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "ordenar",
        consigna:
          "Ordena las líneas para formar un programa que imprima 'Hola' si x es mayor que 5.",
        elementos: ["if (x > 5) {", '    printf("Hola");', "}"],
      },
      {
        tipo: "completarEspacios",
        texto: 'if (x ___ 5) { printf("Mayor"); }',
        espacios: [
          {
            aceptadas: [">"],
          },
        ],
      },
    ],
    [
      {
        tipo: "opcionMultiple",
        pregunta: "¿Qué palabra clave se usa para no devolver ningún valor desde una función?",
        opciones: [
          {
            texto: "void",
          },
          {
            texto: "null",
          },
          {
            texto: "empty",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "bancoPalabras",
        texto: "___ suma(int a, int b) {",
        fichas: ["int", "void", "char"],
        espacios: [
          {
            aceptadas: ["int"],
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "¿Qué diferencia hay entre pasar un argumento por valor y por referencia (puntero) en C?",
        solucion:
          "Por valor, la función recibe una copia del dato y no puede modificar la variable original. Por referencia (pasando un puntero), la función recibe la dirección de memoria y sí puede modificar el valor original a través de ese puntero.",
      },
    ],
    [
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cómo se declara un array de 5 enteros en C?",
        opciones: [
          {
            texto: "int arr[5];",
          },
          {
            texto: "array int(5);",
          },
          {
            texto: "int[5] arr;",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "clasificar",
        categorias: ["Válido", "Inválido"],
        elementos: [
          {
            texto: "int arr[5];",
            categoria: 0,
          },
          {
            texto: "int[5] arr;",
            categoria: 1,
          },
          {
            texto: "int *p;",
            categoria: 0,
          },
          {
            texto: "int p*;",
            categoria: 1,
          },
        ],
      },
      {
        tipo: "completarEspacios",
        texto: "Para obtener la dirección de memoria de una variable 'x' se usa el operador ___.",
        espacios: [
          {
            aceptadas: ["&"],
          },
        ],
      },
    ],
  ],
  "Examen unidad 1": [
    [
      {
        tipo: "teoria",
        titulo: "El atributo for de <label>",
        texto:
          "<label> usa el atributo for para conectarse con un input específico, apuntando al id de ese input (no a su name).\n\nAl hacer clic en el label, el navegador enfoca automáticamente el input asociado — esto mejora la accesibilidad (los lectores de pantalla anuncian la etiqueta al enfocar el campo) y la usabilidad (amplía el área clickeable, muy útil en checkboxes y radios chicos).",
        codigo: '<label for="email">Correo</label>\n<input id="email" type="email" name="email">',
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿A qué atributo del input apunta el for de un label?",
        opciones: [
          {
            texto: "id",
          },
          {
            texto: "name",
          },
          {
            texto: "type",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: '<label ___="email">Correo</label>\n<input id="email" type="email">',
        espacios: [
          {
            aceptadas: ["for"],
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          '¿Por qué conviene usar <label for=".."> en vez de simplemente poner el texto al lado del input, sin etiqueta?',
        solucion:
          "Porque conecta semánticamente el texto con el campo: mejora la accesibilidad (los lectores de pantalla anuncian la etiqueta al enfocar el input) y la usabilidad (al hacer clic en el label, el input se enfoca automáticamente, ampliando el área clickeable — muy útil sobre todo en checkboxes y radios, que son chicos y difíciles de clickear con precisión).",
      },
      {
        tipo: "teoria",
        titulo: "name vs. id en <input>",
        texto:
          "name es el valor que se envía al servidor (o el que se usa para identificar el campo al procesar el formulario). id es para referencias dentro del propio HTML/CSS/JS, como el for de un label.\n\nSon atributos con propósitos distintos, aunque en la práctica muchas veces se les da el mismo valor por comodidad.",
      },
      {
        tipo: "opcionMultiple",
        pregunta:
          "¿Qué atributo de un input es el que se envía al servidor al enviar el formulario?",
        opciones: [
          {
            texto: "name",
          },
          {
            texto: "id",
          },
          {
            texto: "class",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "teoria",
        titulo: "Atributos que se repiten vs. atributos que no",
        texto:
          "type y name pueden repetirse entre varios inputs porque describen la naturaleza o la agrupación del campo: por ejemplo, varios radios comparten el mismo name para agruparse y comportarse como un conjunto de opciones mutuamente excluyentes.\n\nvalue, en cambio, es el dato específico de cada opción — si dos radios del mismo grupo tuvieran el mismo value, no podrías distinguir cuál eligió el usuario.",
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "type",
            derecha:
              "Describe qué clase de campo es (texto, radio, checkbox...); se repite entre inputs del mismo tipo",
          },
          {
            izquierda: "name",
            derecha:
              "Agrupa varios inputs (ej. radios) para que se comporten como un solo conjunto de opciones",
          },
          {
            izquierda: "value",
            derecha:
              "El dato específico de una opción; debe ser distinto en cada radio de un mismo grupo",
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          'Tenés 3 radios con name="plan" y, por error, los tres tienen value="basico". ¿Qué problema concreto vas a tener al leer el formulario enviado?',
        solucion:
          'No vas a poder saber cuál de los tres radios eligió el usuario: como comparten el mismo name (correcto, los agrupa) pero también el mismo value (incorrecto), el valor enviado al servidor va a ser siempre "basico" sin importar cuál haya marcado — se pierde la información de cuál opción fue seleccionada.',
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "padding y el ancho total de una caja",
        texto:
          "padding es el espacio interno entre el contenido de un elemento y su borde.\n\nCon width: 200px; padding: 10px; border: 5px solid; (y box-sizing en su valor por defecto, content-box), el ancho total renderizado crece: 200 (contenido) + 10+10 (padding izquierdo/derecho) + 5+5 (border izquierdo/derecho) = 230px.\n\nSi querés que el width declarado ya incluya el padding y el border, hay que usar box-sizing: border-box.",
        codigo:
          ".caja {\n  width: 200px;\n  padding: 10px;\n  border: 5px solid;\n}\n/* Ancho total renderizado con content-box (por defecto): 230px */",
      },
      {
        tipo: "opcionMultiple",
        pregunta:
          "Una caja tiene width: 200px; padding: 10px; border: 5px solid; con box-sizing en su valor por defecto. ¿Cuál es su ancho total renderizado?",
        opciones: [
          {
            texto: "230px",
          },
          {
            texto: "200px",
          },
          {
            texto: "210px",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: ".caja {\n  ___: 10px;\n}\n/* espacio interno entre el contenido y el borde */",
        espacios: [
          {
            aceptadas: ["padding"],
          },
        ],
      },
      {
        tipo: "teoria",
        titulo: "gap vs. margin",
        texto:
          "gap es el espacio entre elementos hijos de un contenedor flex o grid — no se aplica en los bordes exteriores del contenedor.\n\nmargin es el espacio alrededor de un elemento individual, y sí afecta también el exterior: por ejemplo, empuja el elemento lejos de los bordes del contenedor o de otros elementos, incluso fuera de un contexto flex o grid.",
      },
      {
        tipo: "clasificar",
        categorias: [
          "Espacio exterior de un elemento individual",
          "Espacio entre hijos de un contenedor flex/grid",
        ],
        elementos: [
          {
            texto: "margin",
            categoria: 0,
          },
          {
            texto: "gap",
            categoria: 1,
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "Tenés un contenedor flex con gap: 16px y 3 elementos hijos. ¿Ese gap agrega espacio antes del primer hijo y después del último? ¿Por qué sí o por qué no?",
        solucion:
          "No. gap solo agrega espacio ENTRE los hijos (entre el 1º y el 2º, y entre el 2º y el 3º) — nunca en los bordes exteriores del contenedor. Si además se quiere espacio antes del primero o después del último, hay que agregarlo aparte, con padding en el contenedor o margin en esos hijos específicos.",
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: 'target="_blank" y rel="noopener"',
        texto:
          'target="_blank" hace que un enlace se abra en una pestaña nueva.\n\nCuando se usa target="_blank" conviene agregar rel="noopener": sin él, la página nueva tiene acceso a window.opener (la pestaña que abrió el enlace), lo que en teoría podría aprovecharse para redirigir la pestaña original a un sitio malicioso — un ataque conocido como tabnabbing. rel="noopener" corta ese acceso.',
        codigo: '<a href="https://ejemplo.com" target="_blank" rel="noopener">Ir al sitio</a>',
      },
      {
        tipo: "opcionMultiple",
        pregunta: '¿Por qué conviene agregar rel="noopener" a un enlace con target="_blank"?',
        opciones: [
          {
            texto:
              "Evita que la pestaña nueva pueda acceder a window.opener y manipular la pestaña original (seguridad)",
          },
          {
            texto: "Hace que el enlace cargue más rápido",
          },
          {
            texto: 'Es obligatorio para que target="_blank" funcione',
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: '<a href="https://ejemplo.com" target="_blank" ___="noopener">Ir</a>',
        espacios: [
          {
            aceptadas: ["rel"],
          },
        ],
      },
      {
        tipo: "teoria",
        titulo: "El atributo alt en <img>",
        texto:
          'alt es un texto alternativo: se muestra si la imagen no llega a cargar, y lo usan los lectores de pantalla para describir la imagen a personas con discapacidad visual.\n\nTambién ayuda al SEO, porque los buscadores no pueden "ver" la imagen pero sí leen su alt.',
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál de estas NO es una razón para usar el atributo alt en una imagen?",
        opciones: [
          {
            texto: "Hace que la imagen cargue más rápido",
          },
          {
            texto: "Los lectores de pantalla lo usan para describir la imagen",
          },
          {
            texto: "Se muestra si la imagen no carga",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "tarjeta",
        frente: "alt",
        reverso:
          "Texto alternativo de una imagen: se muestra si la imagen no carga y lo usan los lectores de pantalla (accesibilidad); también ayuda al SEO.",
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "¿Qué le pasa a una persona que usa lector de pantalla si te olvidás el alt en una imagen importante (por ejemplo, el logo que también es un link a la home)?",
        solucion:
          'El lector de pantalla no tiene un texto útil que leer para describir esa imagen (en el mejor de los casos lee el nombre del archivo, algo como "logo guion final punto png", que no aporta información) — la persona pierde el contexto de qué es ese elemento o hacia dónde lleva el enlace. En este ejemplo, no sabría que ese elemento la lleva a la página de inicio.',
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "¿Qué va dentro de <head>?",
        texto:
          'El <head> de un documento HTML contiene metadatos: no se muestra en el contenido visible de la página.\n\nAhí van cosas como <title> (título de la pestaña), <meta charset> (codificación de caracteres), <meta viewport> (comportamiento en dispositivos móviles), enlaces a hojas de estilo (<link rel="stylesheet">) y, opcionalmente, <script>.',
        codigo:
          '<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Mi página</title>\n  <link rel="stylesheet" href="estilos.css">\n</head>',
        puntosClave: [
          "<title>: título de la pestaña/ventana del navegador",
          "<meta charset>: codificación de caracteres",
          "<meta viewport>: comportamiento responsivo en móviles",
          "<link>: hojas de estilo externas",
          "<script> (opcional): también puede ir dentro de head",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál de estos elementos NO va dentro de <head>?",
        opciones: [
          {
            texto: "<footer>",
          },
          {
            texto: "<title>",
          },
          {
            texto: "<meta charset>",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "clasificar",
        categorias: ["Va dentro de <head>", "Va dentro de <body>"],
        elementos: [
          {
            texto: "<title>",
            categoria: 0,
          },
          {
            texto: "<meta charset>",
            categoria: 0,
          },
          {
            texto: "<article>",
            categoria: 1,
          },
          {
            texto: "<section>",
            categoria: 1,
          },
        ],
      },
      {
        tipo: "teoria",
        titulo: "<article> vs. <section>",
        texto:
          "<article> representa contenido independiente y autocontenido, que tendría sentido por sí solo fuera de contexto — por ejemplo, un post de blog o una noticia.\n\n<section> agrupa contenido temáticamente relacionado dentro de una página o dentro de un artículo, pero no necesariamente tiene sentido de forma aislada.",
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "article",
            derecha: "Contenido independiente y autocontenido, como un post de blog o una noticia",
          },
          {
            izquierda: "section",
            derecha: "Agrupa contenido temáticamente relacionado dentro de una página o artículo",
          },
          {
            izquierda: "title",
            derecha: "Va en head; define el título de la pestaña, no es visible en el body",
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          'Una página de blog tiene un artículo completo, y dentro de ese artículo hay dos partes bien diferenciadas: "Introducción" y "Conclusión". ¿Qué etiquetas usarías para cada nivel, y por qué?',
        solucion:
          'El post completo iría en un <article>, porque es contenido independiente y autocontenido (tendría sentido si se compartiera o leyera por separado). Dentro de ese <article>, "Introducción" y "Conclusión" irían cada una en su propio <section>, porque son agrupaciones temáticas relacionadas dentro del mismo artículo, pero no tendrían sentido como piezas de contenido totalmente independientes por sí solas.',
      },
      {
        tipo: "ordenar",
        consigna: "Ordena estas partes de un documento HTML de afuera hacia adentro.",
        elementos: [
          "<html>",
          "<head> y <body> (hermanos, dentro de <html>)",
          "<article> (dentro de <body>)",
          "<section> (dentro del <article>)",
        ],
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "El modelo de caja flexible",
        texto:
          'Flexbox es un modelo de layout de CSS pensado para distribuir espacio entre elementos dentro de un contenedor, incluso cuando su tamaño es desconocido o dinámico.\n\nTodo empieza declarando display: flex en un elemento. Ese elemento se convierte en un "contenedor flex", y todos sus hijos directos pasan a ser "elementos flex", sin importar si antes eran div, li o lo que sea.\n\nFlexbox trabaja sobre dos ejes: el eje principal (main axis) y el eje cruzado (cross axis). Por defecto, con flex-direction: row, el eje principal es horizontal y el cruzado es vertical. Esto es clave porque justify-content siempre actúa sobre el eje principal y align-items sobre el eje cruzado.',
        codigo: ".contenedor {\n  display: flex;\n}",
        puntosClave: [
          "display: flex convierte al elemento en contenedor flex",
          "Los hijos directos se vuelven elementos flex automáticamente",
          "flex-direction decide cuál eje es el principal (row = horizontal, column = vertical)",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Qué propiedad convierte a un elemento en un contenedor flex?",
        opciones: [
          {
            texto: "display: flex;",
          },
          {
            texto: "position: flex;",
          },
          {
            texto: "flex-container: true;",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: ".navbar {\n  ___: flex;\n}",
        espacios: [
          {
            aceptadas: ["display"],
          },
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "Con flex-direction: row (el valor por defecto), ¿cuál es el eje principal?",
        opciones: [
          {
            texto: "Horizontal",
          },
          {
            texto: "Vertical",
          },
          {
            texto: "No existe eje principal en row",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "clasificar",
        categorias: ["Se vuelve contenedor flex", "Se vuelve elemento flex"],
        elementos: [
          {
            texto: "El elemento con display: flex",
            categoria: 0,
          },
          {
            texto: "Cada hijo directo de ese elemento",
            categoria: 1,
          },
          {
            texto: "Un div con display: flex dentro de otro flex item",
            categoria: 0,
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "¿Qué diferencia hay entre el eje principal y el eje cruzado, y por qué importa saber cuál es cuál antes de usar justify-content o align-items?",
        solucion:
          "El eje principal es la dirección en la que flex-direction alinea los elementos (horizontal en row, vertical en column); el eje cruzado es perpendicular a ese. Importa porque justify-content siempre distribuye espacio sobre el eje principal y align-items siempre alinea sobre el eje cruzado — si cambias flex-direction a column, justify-content pasa a controlar la alineación vertical y align-items la horizontal.",
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "Distribuyendo espacio en el eje principal",
        texto:
          "justify-content controla cómo se reparte el espacio sobre el eje principal del contenedor flex (el horizontal, si usas flex-direction: row).\n\nSolo tiene efecto cuando los elementos, sumados, ocupan menos espacio que el contenedor — si lo llenan por completo, no hay espacio libre que repartir.",
        codigo: ".contenedor {\n  display: flex;\n  justify-content: center;\n}",
        puntosClave: [
          "flex-start (por defecto): los elementos se agrupan al inicio",
          "flex-end: los elementos se agrupan al final",
          "center: los elementos se agrupan en el centro",
          "space-between: el espacio libre se reparte entre los elementos, sin margen en los extremos",
          "space-around: cada elemento recibe el mismo espacio a su alrededor (los extremos tienen la mitad de espacio que el hueco entre elementos)",
          "space-evenly: el espacio libre se reparte en partes exactamente iguales, incluyendo los extremos",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta:
          "¿Qué valor de justify-content reparte espacio entre los elementos pero deja los extremos pegados a los bordes del contenedor, sin espacio ahí?",
        opciones: [
          {
            texto: "space-between",
          },
          {
            texto: "space-evenly",
          },
          {
            texto: "center",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: ".contenedor {\n  display: flex;\n  ___: center;\n}",
        espacios: [
          {
            aceptadas: ["justify-content"],
          },
        ],
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "flex-start",
            derecha: "Agrupa los elementos al inicio del eje principal",
          },
          {
            izquierda: "space-between",
            derecha: "Reparte el espacio entre elementos, sin dejar hueco en los extremos",
          },
          {
            izquierda: "space-evenly",
            derecha: "Reparte el espacio en partes exactamente iguales, extremos incluidos",
          },
          {
            izquierda: "center",
            derecha: "Agrupa todos los elementos en el centro del contenedor",
          },
        ],
      },
      {
        tipo: "clasificar",
        categorias: ["Deja espacio en los extremos", "No deja espacio en los extremos"],
        elementos: [
          {
            texto: "flex-start",
            categoria: 1,
          },
          {
            texto: "flex-end",
            categoria: 1,
          },
          {
            texto: "center",
            categoria: 1,
          },
          {
            texto: "space-between",
            categoria: 1,
          },
          {
            texto: "space-around",
            categoria: 0,
          },
          {
            texto: "space-evenly",
            categoria: 0,
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "Tienes un contenedor con 3 elementos y justify-content: space-between. Si le agregas un cuarto elemento hasta llenar todo el ancho del contenedor, ¿qué pasa visualmente con el efecto de justify-content?",
        solucion:
          "Deja de notarse: justify-content solo reparte el espacio libre sobre el eje principal, y si los elementos ocupan todo el ancho disponible no queda espacio libre que repartir, así que los elementos simplemente quedan uno junto al otro sin huecos visibles.",
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "Alineando en perpendicular",
        texto:
          'Mientras justify-content trabaja sobre el eje principal, align-items trabaja sobre el eje cruzado (el vertical, si usas flex-direction: row).\n\nEs la propiedad que responde a la típica pregunta "¿cómo centro esto verticalmente?" que antes de Flexbox era tan incómoda de resolver en CSS.',
        codigo: ".contenedor {\n  display: flex;\n  align-items: center;\n}",
        puntosClave: [
          "stretch (por defecto): los elementos se estiran para llenar la altura del contenedor",
          "flex-start: los elementos se alinean al inicio del eje cruzado",
          "flex-end: los elementos se alinean al final del eje cruzado",
          "center: los elementos se centran en el eje cruzado",
          "baseline: los elementos se alinean por la línea base de su texto",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál es el valor por defecto de align-items si no lo defines?",
        opciones: [
          {
            texto: "stretch",
          },
          {
            texto: "center",
          },
          {
            texto: "flex-start",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: ".tarjeta {\n  display: flex;\n  ___: center;\n}",
        espacios: [
          {
            aceptadas: ["align-items"],
          },
        ],
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "stretch",
            derecha:
              "Estira los elementos para llenar la altura del contenedor (valor por defecto)",
          },
          {
            izquierda: "center",
            derecha: "Centra los elementos en el eje cruzado",
          },
          {
            izquierda: "flex-end",
            derecha: "Alinea los elementos al final del eje cruzado",
          },
          {
            izquierda: "baseline",
            derecha: "Alinea los elementos por la línea base de su texto",
          },
        ],
      },
      {
        tipo: "tarjeta",
        frente: "align-self",
        reverso:
          "Se aplica a un elemento flex individual (no al contenedor) y sobreescribe, solo para ese elemento, el valor de align-items del contenedor padre. Útil cuando un elemento necesita alinearse distinto al resto.",
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "Tienes flex-direction: column en tu contenedor. ¿Qué propiedad usarías ahora para centrar los elementos horizontalmente, y cuál para centrarlos verticalmente? ¿Por qué se invierten respecto a flex-direction: row?",
        solucion:
          "Con flex-direction: column el eje principal pasa a ser el vertical, así que justify-content controla ahora la alineación vertical y align-items la horizontal — exactamente al revés que en row. Se invierten porque justify-content siempre actúa sobre el eje principal y align-items siempre sobre el eje cruzado, y flex-direction es la que decide cuál eje es cuál.",
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "flex-grow, flex-shrink y flex-basis",
        texto:
          "Cada elemento flex tiene tres propiedades que controlan su tamaño dentro del contenedor:\n\nflex-grow define cuánto crece un elemento para ocupar el espacio libre sobrante, en proporción al valor de los demás. flex-shrink define cuánto se encoge un elemento cuando no hay espacio suficiente. flex-basis define el tamaño inicial del elemento antes de repartir espacio libre.\n\nEn la práctica casi nunca se escriben las tres por separado: se usa el atajo flex, que las combina en ese orden.",
        codigo:
          ".item {\n  flex: 1;\n}\n\n/* Equivale exactamente a: */\n.item {\n  flex-grow: 1;\n  flex-shrink: 1;\n  flex-basis: 0%;\n}",
        puntosClave: [
          "flex: 1 hace que el elemento crezca para repartirse el espacio libre en partes iguales con sus hermanos",
          "Si todos los hijos tienen flex: 1, todos terminan con el mismo ancho, sin importar su contenido",
          'flex-basis: 0% le dice al elemento "ignora tu tamaño natural, empieza en cero y crece desde ahí"',
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "flex: 1 es un atajo equivalente a escribir, en ese orden:",
        opciones: [
          {
            texto: "flex-grow: 1; flex-shrink: 1; flex-basis: 0%;",
          },
          {
            texto: "flex-grow: 1; flex-shrink: 0; flex-basis: auto;",
          },
          {
            texto: "flex-basis: 1; flex-grow: 0; flex-shrink: 0;",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: ".col {\n  ___: 1;\n}",
        espacios: [
          {
            aceptadas: ["flex"],
          },
        ],
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "flex-grow",
            derecha: "Cuánto crece el elemento para ocupar espacio libre sobrante",
          },
          {
            izquierda: "flex-shrink",
            derecha: "Cuánto se encoge el elemento cuando falta espacio",
          },
          {
            izquierda: "flex-basis",
            derecha: "El tamaño inicial del elemento antes de repartir espacio libre",
          },
        ],
      },
      {
        tipo: "ordenar",
        consigna:
          "Ordena los pasos para construir un layout de 3 columnas de igual ancho usando Flexbox.",
        elementos: [
          "Envolver las tres columnas en un contenedor .layout",
          "Aplicar display: flex a .layout",
          "Aplicar flex: 1 a cada una de las tres columnas hijas",
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "Si tienes tres columnas con flex: 1; flex: 1; flex: 2; respectivamente dentro del mismo contenedor flex, ¿cómo se reparte el espacio libre entre ellas?",
        solucion:
          "El espacio libre se reparte en proporción a los valores de flex-grow: la tercera columna recibe el doble de espacio libre que cada una de las otras dos, porque su flex-grow (2) es el doble del de las otras (1). En total el espacio libre se divide en 4 partes iguales (1+1+2) y cada columna se lleva la cantidad de partes que le corresponde según su valor.",
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "Cuando una fila no alcanza",
        texto:
          "Por defecto, flex-wrap vale nowrap: todos los elementos se aprietan en una sola línea, aunque tengan que encogerse (flex-shrink) más de lo que te gustaría, o incluso desbordar el contenedor.\n\nCon flex-wrap: wrap, en cambio, los elementos que no caben pasan a una nueva línea, como el texto normal de un párrafo. wrap-reverse hace lo mismo pero apilando las líneas en orden inverso.\n\nCuando hay varias líneas, aparece una pregunta nueva: ¿cómo se distribuye el espacio entre esas líneas en el eje cruzado? Esa es la responsabilidad de align-content, no de align-items — align-items alinea los elementos dentro de su propia línea; align-content distribuye el conjunto de líneas entre sí.",
        codigo:
          ".tarjetas {\n  display: flex;\n  flex-wrap: wrap;\n  align-content: flex-start;\n}",
        puntosClave: [
          "nowrap (por defecto): todo en una sola línea, encogiendo si hace falta",
          "wrap: los elementos que no caben pasan a una nueva línea",
          "flex-flow es el atajo que combina flex-direction y flex-wrap: flex-flow: row wrap;",
          "align-content solo tiene efecto si hay más de una línea (necesita flex-wrap: wrap)",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál es el valor por defecto de flex-wrap?",
        opciones: [
          {
            texto: "nowrap",
          },
          {
            texto: "wrap",
          },
          {
            texto: "wrap-reverse",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: ".contenedor {\n  display: flex;\n  flex-flow: row ___;\n}",
        espacios: [
          {
            aceptadas: ["wrap"],
          },
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta:
          "Tienes un contenedor con flex-wrap: wrap y varias líneas de elementos. ¿Qué propiedad controla cómo se distribuyen esas líneas entre sí en el eje cruzado?",
        opciones: [
          {
            texto: "align-content",
          },
          {
            texto: "align-items",
          },
          {
            texto: "justify-content",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "emparejar",
        parejas: [
          {
            izquierda: "align-items",
            derecha: "Alinea los elementos dentro de su propia línea, en el eje cruzado",
          },
          {
            izquierda: "align-content",
            derecha: "Distribuye el espacio entre varias líneas cuando hay wrap",
          },
          {
            izquierda: "wrap-reverse",
            derecha: "Envuelve a nueva línea, pero apila las líneas en orden inverso",
          },
          {
            izquierda: "nowrap",
            derecha: "Fuerza todo a una sola línea, encogiendo los elementos si es necesario",
          },
        ],
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "Tienes 6 tarjetas de 200px cada una dentro de un contenedor de 500px con flex-wrap: nowrap. ¿Qué pasa visualmente, y cómo lo arreglarías con lo visto en esta lección?",
        solucion:
          "Con nowrap, flex-shrink intenta encoger las 6 tarjetas para que quepan en los 500px, lo que las deja mucho más angostas que sus 200px originales (o directamente puede causar overflow si el contenido no puede encogerse más). La solución es agregar flex-wrap: wrap, para que las tarjetas que no quepan en la primera fila pasen a una segunda línea manteniendo su ancho.",
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "Reordenar sin tocar el HTML, espaciar sin usar márgenes",
        texto:
          'order permite cambiar el orden visual de los elementos flex sin tocar el HTML. Por defecto todos los elementos tienen order: 0, y se muestran en el orden en que aparecen en el DOM. Un valor más chico se muestra antes; un valor más grande, después. Entre elementos con el mismo order, se respeta el orden original del HTML.\n\nEsto es distinto a reordenar el HTML directamente: order es puramente visual, así que herramientas como lectores de pantalla y la navegación por teclado (Tab) siguen el orden del DOM, no el visual — hay que usarlo con cuidado por accesibilidad.\n\ngap (y sus variantes row-gap, column-gap) agregan espacio entre elementos flex directamente, sin necesidad de márgenes manuales ni de lidiar con el margen sobrante en los bordes que hay que "cancelar". A diferencia de justify-content: space-between, gap no agrega espacio en los bordes del contenedor, solo entre los elementos.',
        codigo:
          ".barra {\n  display: flex;\n  gap: 1rem;\n}\n\n.barra .destacado {\n  order: -1;\n}",
        puntosClave: [
          "order: 0 es el valor por defecto de todos los elementos flex",
          "order cambia el orden visual, no el orden real del DOM",
          "gap agrega espacio entre elementos, nunca en los bordes exteriores del contenedor",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Cuál es el valor por defecto de la propiedad order en un elemento flex?",
        opciones: [
          {
            texto: "0",
          },
          {
            texto: "1",
          },
          {
            texto: "auto",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "completarEspacios",
        texto: ".menu-principal {\n  ___: -1;\n}",
        espacios: [
          {
            aceptadas: ["order"],
          },
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta: "¿Qué diferencia clave hay entre gap y justify-content: space-between?",
        opciones: [
          {
            texto:
              "gap nunca agrega espacio en los bordes del contenedor; space-between tampoco, pero space-around y space-evenly sí",
          },
          {
            texto: "gap y justify-content: space-between hacen exactamente lo mismo",
          },
          {
            texto: "gap solo funciona en CSS Grid, no en Flexbox",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "clasificar",
        categorias: [
          "Solo afecta el orden visual (DOM intacto)",
          "Cambia el contenido/orden real del HTML",
        ],
        elementos: [
          {
            texto: "Poner order: 1 en un elemento con CSS",
            categoria: 0,
          },
          {
            texto: "Mover la etiqueta <li> a otra posición en el HTML",
            categoria: 1,
          },
          {
            texto: "Poner order: -1 en un elemento con CSS",
            categoria: 0,
          },
        ],
      },
      {
        tipo: "tarjeta",
        frente: "order",
        reverso:
          "Cambia el orden visual de un elemento flex sin modificar el HTML. Los elementos con el mismo valor de order mantienen entre sí el orden original del DOM. Ojo con la accesibilidad: la navegación por teclado sigue el orden del DOM, no el visual.",
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          'En un diseño responsivo, quieres que un botón "Comprar" aparezca primero visualmente en pantallas chicas, pero en el HTML esté al final por razones de accesibilidad (para que se lea después del contenido). ¿Cómo lo resolverías con lo visto en esta lección, y qué precaución deberías tener?',
        solucion:
          'Se puede usar order (por ejemplo order: -1 en una media query para pantallas chicas) para que el botón aparezca visualmente primero sin mover su posición en el HTML. La precaución es que la navegación por teclado (Tab) y los lectores de pantalla van a seguir el orden del DOM, así que el foco podría "saltar" de forma que no coincide con lo que se ve en pantalla — conviene probarlo con teclado y no abusar de order para reordenamientos grandes.',
      },
    ],
    [
      {
        tipo: "teoria",
        titulo: "Recetas que vas a usar todo el tiempo",
        texto:
          "Con display: flex, justify-content, align-items, flex: 1, flex-wrap, order y gap ya tenés todo lo necesario para resolver los layouts que más se repiten en la web. Esta lección junta esas piezas en patrones concretos, listos para copiar y adaptar.",
        puntosClave: [
          "Centrado perfecto: display: flex; justify-content: center; align-items: center;",
          "Navbar: display: flex; justify-content: space-between; align-items: center;",
          "Sticky footer: flex-direction: column en el body + flex: 1 en el contenido principal",
          "Holy grail: header y footer de ancho completo, y una fila central en flex con sidebar, contenido y aside",
        ],
      },
      {
        tipo: "opcionMultiple",
        pregunta:
          "¿Qué combinación de propiedades centra un elemento tanto horizontal como verticalmente dentro de su contenedor flex?",
        opciones: [
          {
            texto: "justify-content: center; align-items: center;",
          },
          {
            texto: "justify-content: center; align-content: center;",
          },
          {
            texto: "align-items: center; align-self: center;",
          },
        ],
        correcta: 0,
      },
      {
        tipo: "ordenar",
        consigna:
          'Ordena los pasos para construir un "sticky footer" (un footer que queda pegado abajo incluso si el contenido es corto) usando Flexbox.',
        elementos: [
          "Aplicar min-height: 100vh y display: flex; flex-direction: column; al body",
          "Dejar que header y footer mantengan su altura natural",
          "Aplicar flex: 1 al contenedor del contenido principal, para que ocupe todo el espacio sobrante y empuje el footer hacia abajo",
        ],
      },
      {
        tipo: "tarjeta",
        frente: "Holy grail layout",
        reverso:
          "Un layout clásico con header y footer de ancho completo, y una fila central dividida en tres columnas: sidebar, contenido principal y aside. Con Flexbox se resuelve con flex-direction: column en el body (header, fila central, footer) y flex-direction: row dentro de la fila central, usando flex: 1 en el contenido principal para que ocupe el espacio sobrante mientras sidebar y aside mantienen un ancho fijo.",
      },
      {
        tipo: "preguntaAbierta",
        pregunta:
          "En el patrón de sticky footer, ¿por qué es necesario min-height: 100vh en el body además de display: flex; flex-direction: column;? ¿Qué pasaría si lo quitaras con una página de contenido corto?",
        solucion:
          "Sin min-height: 100vh, el body solo mide tanto como su contenido (altura natural), así que flex: 1 en el contenido principal no tendría espacio sobrante que ocupar cuando la página es corta — el footer quedaría justo debajo del contenido, en medio de la pantalla, en vez de pegado al fondo. min-height: 100vh garantiza que el body (y por lo tanto el contenedor flex) mida al menos la altura completa de la ventana, dándole a flex: 1 espacio real para crecer y empujar el footer hasta abajo.",
      },
    ],
  ],
};
