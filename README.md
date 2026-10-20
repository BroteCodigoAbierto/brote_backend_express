# brote_backend_express

API REST de **Brote**, la plataforma open source de cursos interactivos
creados por la comunidad. Atiende a la web
([brote_web_react](https://github.com/BroteCodigoAbierto/brote_web_react)) y a
la app móvil ([brote_mobile_expo](https://github.com/BroteCodigoAbierto/brote_mobile_expo)).

Qué hace la API y por qué está en
[brote_specs](https://github.com/BroteCodigoAbierto/brote_specs): specs,
modelo de datos, contrato y decisiones.

## Stack

Node 24 (ejecuta TypeScript directo) · Express 5 · Prisma 7 · PostgreSQL 18 ·
Better Auth

## Arrancar en local

```bash
npm install
cp .env.example .env        # llena SECRETO_AUTH: openssl rand -base64 32
podman compose up -d        # o: docker compose up -d   → PostgreSQL en :5432
npm run bd:migrar           # aplica las migraciones y genera el cliente de Prisma
npm run dev                 # http://localhost:3000/ping
```

`npm run bd:migrar` (`prisma migrate dev`) necesita que el usuario de la base
pueda crear bases de datos (Prisma usa una base temporal, la *shadow
database*). El contenedor de `compose.yaml` ya lo permite; con un PostgreSQL
propio, dale `CREATEDB` al usuario o aplica las migraciones existentes con
`npx prisma migrate deploy` y luego `npm run bd:generar`.

## Scripts

| Script               | Qué hace                            |
| -------------------- | ----------------------------------- |
| `npm run dev`        | API con recarga al guardar          |
| `npm start`          | API sin recarga                     |
| `npm run tipos`      | Revisa los tipos con TypeScript     |
| `npm run lint`       | ESLint                              |
| `npm run formato`    | Formatea con Prettier               |
| `npm run bd:migrar`  | Crea y aplica migraciones de Prisma |
| `npm run bd:generar` | Regenera el cliente de Prisma       |
| `npm run bd:estudio` | Abre Prisma Studio para ver la base |

## Contribuir

Ninguna feature se programa sin spec. El flujo está en
[brote_specs/docs/flujo-trabajo.md](https://github.com/BroteCodigoAbierto/brote_specs/blob/dev/docs/flujo-trabajo.md).
