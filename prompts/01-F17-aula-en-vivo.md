# Prompt #1: F17 «Aula en vivo»

Se ejecuta **primero**. Pégalo tal cual a un agente con acceso a los 4 repos de Brote.
Trabaja con puntos de control: el agente se detiene y espera tu OK al terminar la
planificación y después de cada etapa de implementación.

```
Eres el agente de implementación de Brote. Trabajas en los 4 repos hermanos de /home/pedrob/github/organizations/brote (brote_specs, brote_backend_express, brote_web_react, brote_mobile_expo). Lee primero brote_specs/CLAUDE.md, docs/flujo-trabajo.md, docs/arquitectura.md, docs/estilo-codigo.md, docs/diseno.md, docs/decisiones/ (en especial 0014, 0015, 0016, 0017 y 0020) y las specs F04, F11, F12, F14 y F16. Respeta TODAS sus reglas: SDD con Spec Kit, contrato por copia, TypeScript estricto, identificadores en español sin acentos/ñ, textos de UI en español, CSS Modules en web, StyleSheet + useColores en móvil, y Liquid Glass ("vidrio") como diseño por defecto con "editorial" como variante opcional. NO hagas push ni abras PRs. La rama sale de `dev` (feature/F17-aula-en-vivo) en cada repo.

OBJETIVO — F17 "Aula en vivo": que Brote sirva también para clase en vivo, juego en línea y examen en vivo, no solo para estudio asíncrono. Debe ser OPCIONAL (un curso sigue funcionando igual sin sesión en vivo) y reutilizar los cursos, las actividades, las aulas/grupos y las organizaciones de F16.

MODO DE TRABAJO (OBLIGATORIO — puntos de control):
- PUNTO DE CONTROL 1: al terminar la Fase 0 y la Fase 1 DETENTE. Entrégame research.md, la spec, el plan y las tasks de F17 (más la decisión 0021 y el borrador del contrato) y ESPERA mi aprobación explícita. No escribas código de aplicación antes de eso.
- Después de mi aprobación, implementa por etapas, en este orden: (A) brote_specs + contrato, (B) brote_backend_express, (C) brote_web_react, (D) brote_mobile_expo. Al terminar CADA etapa: ejecuta su verificación, commitea, entrégame un resumen corto (qué hiciste, qué probaste, qué no pudiste probar, riesgos) y ESPERA mi OK antes de pasar a la siguiente.
- Si descubres que algo del plan aprobado no es viable, detente y consúltame; no cambies el alcance por tu cuenta.

FASE 0 — INVESTIGAR ANTES DE DISEÑAR (entrega un research.md):
1. Transporte en tiempo real compatible con Express 5, con web y con React Native/Expo, y apto para self-hosting simple (una sola instancia, sin Redis obligatorio). Compara SSE + POST, WebSocket (`ws`) y polling adaptativo: costo, reconexión, soporte en Expo, proxies, escalado. Recomienda uno.
2. Estado de la sala: en memoria con copia persistente en PostgreSQL para sobrevivir a reinicios y reconexiones. Define la fuente de verdad y cómo se recupera un cliente que se desconectó.
3. Presentación de diapositivas. Evalúa: (a) PDF renderizado en el navegador con pdf.js, (b) PPTX convertido a PDF/imágenes en el servidor (LibreOffice headless: peso, seguridad, self-hosting), (c) solo PDF + instrucciones para exportar desde PowerPoint/Keynote/Slides, (d) imágenes por diapositiva guardadas en PostgreSQL como ya hacen las decisiones 0016/0017 (con límites de tamaño). Recomienda un camino realista y seguro (validar archivo, límites, sin ejecutar macros).
4. Qué actividades existentes sirven en vivo (autocorregibles y cortas: opcionMultiple, completarEspacios, emparejar, clasificar, ordenar, bancoPalabras…) y cuáles no (retoCodigo, terminalSimulada, escucharRepetir, grafoCommits, preguntaAbierta) o necesitan una versión en vivo.

FASE 1 — DECISIONES: según CLAUDE.md, hazme las decisiones de producto UNA POR UNA con la opción recomendada primero (herramienta de preguntas). Como mínimo: transporte; si se puede entrar sin cuenta con solo código/PIN + apodo (invitados) o solo con cuenta; formato de presentación aceptado; sistema de puntos. Luego redacta spec, plan y tasks y ve al PUNTO DE CONTROL 1.

FUNCIONALIDAD A CUBRIR (recorta lo que la investigación desaconseje y explícalo):
- Sala: el docente crea una sesión a partir de un curso o lecciones (o de un aula/grupo de F16), obtiene código corto + QR + enlace; sala de espera con lista de participantes en vivo; puede bloquear la entrada, expulsar y silenciar apodos inapropiados.
- Modos: (1) Clase guiada: el docente controla el ritmo y todos ven lo mismo. (2) Juego/Quiz: puntos por acierto y rapidez, racha, tabla de posiciones y podio. (3) Examen en vivo: tiempo total y/o por pregunta, orden de preguntas y opciones aleatorio por alumno, sin mostrar aciertos hasta el cierre, un solo intento, tolerancia a desconexión, tiempo extra por alumno (accesibilidad). (4) Ritmo propio con sala: cada quien avanza solo y el docente ve el avance.
- Control del docente: iniciar, pausar, reanudar, siguiente, saltar, revelar respuesta, mostrar distribución de respuestas, repetir pregunta, cerrar sesión; "esperar a que todos respondan" con límite de tiempo y opción de avanzar igual.
- Pregunta cronometrada: temporizador sincronizado con el reloj del SERVIDOR (no confiar en el del cliente), cierre automático, respuestas tardías rechazadas.
- Interacción extra solo en vivo: encuesta, nube de palabras, pregunta abierta con votación, preguntas de la audiencia (Q&A) moderadas por el docente.
- Presentador: el docente sube un PDF (y PPTX si la investigación lo permite) y lo proyecta en vivo; los alumnos ven la diapositiva sincronizada, con opción de navegar por su cuenta y volver a "seguir al presentador". Las diapositivas se intercalan con actividades en una línea de tiempo de la sesión (diapositiva → pregunta → resultados → diapositiva).
- Vista de proyector (web, pantalla completa, letra grande, alto contraste) y vista del alumno (móvil primero, también web).
- Resultados: al cerrar, guardar la sesión; resumen para el docente por alumno y por pregunta (qué preguntas fallaron más), exportar CSV (reutiliza lo de F16), y opcionalmente registrar el avance/insignia en F04/F08 si el docente lo elige.
- Integración con silos: una sesión puede pertenecer a una organización o aula (F16) o ser independiente. Sin organización todo funciona igual.

REQUISITOS NO FUNCIONALES (inclúyelos como criterios de aceptación en la spec):
- Accesibilidad: el tiempo nunca se comunica solo por color; anuncios para lector de pantalla (cambio de pregunta, tiempo restante cada cierto intervalo); respeta "reducir movimiento"; objetivos táctiles ≥ 44 pt; tiempo extra configurable.
- Resiliencia: reconexión automática sin perder respuesta ni posición; mensajes idempotentes; el servidor es la autoridad (puntaje, tiempo y estado se calculan en el servidor).
- Seguridad y abuso: rate limit por conexión, validación de cada mensaje, apodos filtrados/limitados, tamaño y tipo de archivo validados, autorización (solo el docente anfitrión controla; el alumno solo envía su respuesta).
- Carga: define y prueba un objetivo (p. ej. 100 participantes en una sala en una sola instancia).
- Diseño: respeta el sistema de diseño en ambas variantes (vidrio por defecto, editorial opcional) y los patrones existentes (Context + providers, servicios con fetch propio, validación manual).

ENTREGABLES, siguiendo el flujo del proyecto:
1. brote_specs: decisión 0021 (tiempo real y presentador), specs/features/F17-aula-en-vivo/ (spec, plan, research, tasks, checklist), actualización de docs/diseno.md (pantallas del anfitrión, proyector y alumno), docs/arquitectura.md, modelo de datos y contrato (nueva versión con npm run contrato:copiar y contrato:revisar).
2. brote_backend_express: migración Prisma, motor de sesiones en vivo, endpoints/canal en tiempo real, subida y conversión de presentaciones, resultados y CSV.
3. brote_web_react: panel del anfitrión, vista de proyector, vista del alumno, visor de diapositivas.
4. brote_mobile_expo: unirse con código/QR, jugar y responder, ver diapositivas, resultados.
5. Un script de prueba de carga/humo que simule N clientes (el proyecto no tiene tests automáticos; propón y agrega la mínima infraestructura de pruebas necesaria para el motor en vivo).

VERIFICACIÓN (en cada etapa, según el repo): `npx tsc --noEmit && npm run lint` (backend y móvil), `npm run build && npm run lint` (web), `npm run contrato:revisar` (specs), prettier --check en lo que cambies, más tu prueba de carga y una prueba manual multi-cliente (docente + varios alumnos). Reporta lo que NO pudiste probar (p. ej. dispositivos reales). Commits en español con prefijo "F17:". Entrega al final un resumen con riesgos y decisiones pendientes.
```
