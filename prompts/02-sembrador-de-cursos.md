# Prompt #2: Agente «Sembrador de cursos»

Se ejecuta **después** de terminar y fusionar el Prompt #1 (F17). Pégalo tal cual a un
agente con acceso a los 4 repos de Brote. Empieza con un piloto de 3 cursos y espera
tu aprobación antes de producir el resto.

```
Eres un agente de creación de contenido y de auditoría de producto para Brote (repos hermanos en /home/pedrob/github/organizations/brote). F16 (silos, exploración, importar/exportar JSON) y F17 (aula en vivo) YA están implementadas. Lee brote_specs/CLAUDE.md, docs/diseno.md, contrato/contrato.ts (tipos Actividad, CursoExportado "brote-curso-v1", LIMITES_*, categorías, niveles, idiomas) y las specs F05, F07, F11, F12, F13, F14, F16 y F17.

TU MISIÓN tiene dos partes:
A) Crear una biblioteca grande, variada y de ALTA CALIDAD de cursos para Brote, usando la importación JSON o la API.
B) Descubrir dónde el formato actual de actividades se queda corto y PROPONER (no implementar) cómo ampliarlo.

MODO DE TRABAJO (OBLIGATORIO — piloto y aprobación):
- ETAPA PILOTO: ejecuta la Fase 0 completa y produce SOLO 3 cursos (de categorías distintas, uno de ellos pensado para clase en vivo). Haz la Fase 2 sobre esos 3 cursos y escribe un INFORME PARCIAL (cifras, matriz curso × actividad, primeras propuestas y bugs).
- PUNTO DE CONTROL: DETENTE y ESPERA mi aprobación explícita antes de producir el resto. Aplica los ajustes de calidad, formato o enfoque que te pida y solo entonces escala.
- ETAPA DE ESCALA (tras mi OK): continúa con las Fases 1, 2 y 3 hasta completar la biblioteca y entrega el INFORME final.

REGLAS DURAS
- NO modifiques el código de la aplicación ni el contrato. Solo creas contenido, scripts de siembra y documentos de propuesta. Si encuentras un bug, repórtalo aparte, no lo arregles.
- Trabaja solo contra el entorno local de desarrollo (base de datos local). Jamás contra producción. NO hagas push ni abras PRs; crea la rama feature/semillas-cursos en brote_specs y commitea en español.
- Contenido original o de dominio público/licencia abierta. Nada de copiar textos protegidos; si te basas en una fuente, cítala. Imágenes y audios solo propios, generados o con licencia que lo permita (indica cuál). Cero datos personales.
- Exactitud primero: no inventes hechos, fechas, fórmulas ni código que no hayas verificado. Si algo es opinable o cambia con el tiempo, dilo o evítalo. Ejecuta y prueba el código de los retos de programación antes de incluirlo.
- Pedagogía real, no relleno: objetivos claros por curso, progresión de lo simple a lo complejo, módulos con sentido, retroalimentación útil en cada respuesta incorrecta (explica el porqué), variedad de actividades dentro de cada lección, lecciones cortas, distractores plausibles (no absurdos), español neutro claro (y el idioma correcto en cursos de idiomas).

FASE 0 — INVENTARIO
1. Lista todos los tipos de actividad actuales, sus campos, límites y validaciones, y qué renderiza cada cliente (web y móvil). Genera una matriz tipo-de-actividad × propiedades.
2. Crea un script (scripts/sembrar.mjs en brote_specs o similar) que: inicie sesión con un usuario de desarrollo, importe cada JSON de brote_specs/semillas/<categoria>/<slug>.json, valide ANTES con las reglas del contrato, informe errores por curso y sea idempotente (no duplica).
3. Prueba primero con 1 curso piloto, ábrelo en la web y revisa que se vea y funcione bien.

FASE 1 — PRODUCCIÓN DE CURSOS (objetivo mínimo tras el piloto: 40 cursos en total; ajusta si la calidad lo exige y justifica)
Cubre TODAS las categorías (programación, idiomas, matemáticas, ciencias, herramientas, arte y música, otros) y los 3 niveles, con cursos de 3 a 8 lecciones, 5 a 12 actividades por lección, módulos cuando aporten, insignia en los cursos que lo merezcan y permiteFork activado salvo razón contraria. Incluye:
- Programación (varios lenguajes y conceptos), herramientas (git, terminal, SQL, Linux), matemáticas (aritmética a álgebra y estadística), ciencias (física, química, biología, astronomía), idiomas (al menos 4 idiomas, con escucharRepetir), arte y música, historia, geografía, finanzas personales, salud y primeros auxilios básicos (con avisos responsables), pensamiento crítico, productividad, oficios y habilidades prácticas, y cursos para niños y para adultos mayores (tono y ritmo distintos).
- Cursos pensados para clase en vivo/juego (F17): lecciones cortas, actividades autocorregibles, preguntas con tiempo razonable; y al menos un curso con diapositivas de apoyo.
- Cursos para organizaciones (escuela, universidad, empresa) con visibilidad adecuada, para validar los silos de F16.
- Usa TODOS los tipos de actividad al menos varias veces y combínalos con criterio.

FASE 2 — CAZA DE LIMITACIONES (esto es lo más valioso; hazlo mientras escribes cursos, no al final)
Cada vez que quieras una actividad que el formato no permite o que se resuelve de forma torpe, NO la fuerces: registra un hallazgo en brote_specs/semillas/PROPUESTAS/NNN-nombre.md con esta plantilla:
- Necesidad pedagógica (con un ejemplo concreto de curso y de pregunta real que no pudiste escribir).
- Cómo lo resolviste hoy (workaround) y por qué es insuficiente.
- Tipo de actividad propuesto: nombre en español sin acentos, forma exacta del tipo TypeScript para el contrato (campos, límites, validaciones), cómo se corrige automáticamente, ejemplo JSON completo.
- Cómo se vería y se usaría en web y en móvil (esbozo de interacción, estados, accesibilidad: teclado, lector de pantalla, sin depender del color).
- Impacto en el editor (cómo lo crearía un autor), en importar/exportar JSON y en el modo en vivo F17 (¿sirve en vivo?).
- Complejidad estimada (baja/media/alta), riesgos y prioridad (P0/P1/P2) con justificación.
Hipótesis que debes VALIDAR con evidencia, no dar por ciertas: fórmulas matemáticas (LaTeX/KaTeX), respuesta numérica con tolerancia y unidades, zonas sensibles sobre una imagen (anatomía, mapas, diagramas), ordenar/etiquetar sobre diagramas, gráficas e interacción con funciones, partituras o ritmo, tablas de datos, código ejecutable en el navegador con pruebas, pregunta abierta con rúbrica, selección múltiple con varias correctas y puntaje parcial, respuesta por audio, línea de tiempo, secuencias con ramificación, y simulaciones. Agrega las que descubras tú. Si algo SÍ se puede con lo actual, indica cómo (eso también es hallazgo).
También reporta aparte, en brote_specs/semillas/BUGS.md, cualquier error, inconsistencia de validación, límite poco claro, problema de accesibilidad o de rendimiento que encuentres, con pasos para reproducir.

FASE 3 — VERIFICACIÓN DE CALIDAD
- Todos los cursos importan sin errores; ejecuta una revisión automática (campos obligatorios, límites, enlaces, respuestas correctas definidas, sin duplicados, ortografía básica).
- Revisión manual de una muestra por categoría abriéndola en la web y, si puedes, en el móvil: ¿se entiende?, ¿hay respuestas ambiguas?, ¿hay más de una correcta sin avisarlo?, ¿el nivel declarado coincide con la dificultad?
- Prueba de estrés del formato: textos en el límite, caracteres especiales y emoji, código largo, muchas opciones, otros alfabetos (ja, zh, ko).

ENTREGABLES
1. brote_specs/semillas/ con los JSON por categoría y el script de siembra.
2. brote_specs/semillas/INFORME.md con: resumen y cifras, matriz curso × tipo de actividad, cobertura por categoría y nivel, lista priorizada de propuestas (P0/P1/P2) enlazando cada archivo de PROPUESTAS/, lista de bugs, y una recomendación de qué tipos de actividad implementar primero y por qué. (En el piloto, entrega una versión parcial.)
3. Commits en español (prefijo "Semillas:"). Sin push.

Antes de empezar, pregúntame (herramienta de preguntas, una por una, con la opción recomendada primero) solo lo imprescindible: cantidad final de cursos, idiomas de los cursos de idiomas y si los cursos de salud/finanzas deben llevar avisos legales. Después trabaja en autonomía hasta el punto de control del piloto.
```
