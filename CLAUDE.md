# brote_backend_express: instrucciones para el agente

API REST de Brote. **Las specs, la constitución y las decisiones viven en
`../brote_specs`**; este repo solo implementa lo que ahí está especificado.

Antes de cambiar algo, lee:

1. `../brote_specs/.specify/memory/constitution.md`
2. `../brote_specs/docs/estilo-codigo.md`
3. La spec y el plan de la feature: `../brote_specs/specs/features/F0X-.../`

## Stack

Node 24 ejecutando TypeScript directo (sin compilar), Express 5, Prisma 7 con
PostgreSQL, Better Auth (llega con F01).

- Los imports relativos llevan extensión `.ts` (`./app.ts`).
- `erasableSyntaxOnly`: nada de `enum`, `namespace` ni propiedades en el
  constructor (`constructor(public x)`); usa uniones de texto y campos normales.

## Estructura

```text
src/
  servidor.ts        arranca la app (listen)
  app.ts             arma Express: middlewares, rutas, errores
  config/entorno.ts  variables de entorno, validadas al arrancar
  rutas/             HTTP: leer y validar la petición, responder. Un archivo por recurso
  servicios/         reglas de negocio; aquí se usa Prisma
  middleware/        ErrorApi, manejador central de errores, autenticación
  tipos/contrato.ts  GENERADO desde brote_specs; no se edita a mano
  generado/prisma/   cliente de Prisma generado (ignorado por git)
prisma/
  schema.prisma      modelos (se agregan con cada feature)
  migrations/        migraciones (se versionan)
```

## Reglas

- Las rutas no usan Prisma: llaman a servicios.
- Toda entrada se valida en la ruta; los errores esperados se lanzan como
  `new ErrorApi(estado, "mensaje en español")`.
- Modelos y campos de Prisma en español; tablas y columnas en `snake_case`
  con `@@map` / `@map`.
- Ramas `feature/F0X-...` desde `dev`; commits `F0X: ...`. Sin push sin
  permiso.
- Antes de terminar: `npm run tipos` y `npm run lint`.
