#!/bin/sh
# Build de la API en Vercel (ver vercel.json). Neon da DATABASE_URL con pooler y
# DATABASE_URL_UNPOOLED directa: las migraciones y la siembra van por la directa.
set -e

npm run bd:generar
DATABASE_URL="$DATABASE_URL_UNPOOLED" npx prisma migrate deploy

# Con SEMBRAR=1 en el proyecto de Vercel, se siembran las cuentas y los cursos de
# prueba (borra y recrea los cursos de las cuentas @brote.test). Quítala después.
if [ "$SEMBRAR" = "1" ]; then
  DATABASE_URL="$DATABASE_URL_UNPOOLED" node scripts/sembrar-cursos.ts
fi

# Vercel exige una salida estática no vacía, aunque la API solo tenga funciones.
mkdir -p public
printf 'User-agent: *\nDisallow: /\n' > public/robots.txt
