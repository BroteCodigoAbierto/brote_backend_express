# brote_backend_express: instrucciones para el agente

API REST de Brote. **Las specs, la constitución y las decisiones viven en
`../brote_specs`**; este repo solo implementa lo que ahí está especificado.

Antes de cambiar algo, lee:

1. `../brote_specs/.specify/memory/constitution.md`
2. `../brote_specs/docs/estilo-codigo.md`
3. La spec y el plan de la feature: `../brote_specs/specs/features/F0X-.../`

## Stack

Node 24 ejecutando TypeScript directo (sin compilar), Express 5, Prisma 7 con
PostgreSQL (driver adapter `@prisma/adapter-pg`), Better Auth.

- Los imports relativos llevan extensión `.ts` (`./app.ts`).
- `erasableSyntaxOnly`: nada de `enum`, `namespace` ni propiedades en el
  constructor (`constructor(public x)`); usa uniones de texto y campos normales.

## Estructura

```text
src/
  servidor.ts        arranca la app (listen)
  app.ts             arma Express: middlewares, rutas, errores
  config/entorno.ts  variables de entorno, validadas al arrancar
  config/bd.ts       cliente de Prisma (solo lo importan servicios y config/auth.ts)
  config/auth.ts     Better Auth; NO se monta como handler, se usa con auth.api.*
  rutas/             HTTP: leer y validar la petición, responder. Un archivo por recurso
  validacion/        funciones que validan cuerpos (y actividades) con las constantes del contrato
  servicios/         reglas de negocio; aquí se usa Prisma
  middleware/        ErrorApi, manejador central de errores, sesión (requerirSesion)
  tipos/contrato.ts  GENERADO desde brote_specs; no se edita a mano
  generado/prisma/   cliente de Prisma generado (ignorado por git)
prisma/
  schema.prisma      modelos (se agregan con cada feature)
  migrations/        migraciones (se versionan)
scripts/             herramientas de desarrollo para la validación manual
  expirar-sesiones.ts  npm run sesiones:expirar (F01)
  sembrar-cursos.ts    npm run bd:sembrar: cuentas, cursos y actividades de prueba
                       (F02, F03); valida las actividades antes de guardarlas
  datos-prueba.ts      los datos que usa sembrar-cursos.ts
  actividades-prototipo.ts  actividades del prototipo ya convertidas al contrato (F03)
```

Después de `npm run bd:migrar`, corre `npm run bd:generar`: en Prisma 7,
`migrate dev` ya no regenera el cliente.

## Reglas

- Las rutas no usan Prisma: llaman a servicios.
- Toda entrada se valida en la ruta; los errores esperados se lanzan como
  `new ErrorApi(estado, "mensaje en español")`.
- Modelos y campos de Prisma en español; tablas y columnas en `snake_case`
  con `@@map` / `@map`. **Única excepción**: los modelos de Better Auth
  (`User`, `Session`, `Account`, `Verification`) quedan en inglés; el
  contrato los expone en español (`Usuario`).
- Rutas que exigen sesión: `requerirSesion` y luego `usuarioDe(res)`. La web
  manda cookie; el móvil, `X-Cliente: movil` + `Authorization: Bearer`.
- Ramas `feature/F0X-...` desde `dev`; commits `F0X: ...`. Sin push sin
  permiso.
- Antes de terminar: `npm run tipos` y `npm run lint`.
