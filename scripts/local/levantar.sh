#!/usr/bin/env bash
# Supabase LOCAL para probar la app con personas de prueba, sin Google ni Docker Hub para auth:
#   Postgres de Supabase + PostgREST + Storage en Docker, y scripts/local/proxy.mjs que imita las rutas
#   /rest/v1, /storage/v1 y /auth/v1/user (sesiones firmadas con una clave local pública).
#   bash scripts/local/levantar.sh            # crea todo desde cero (borra la base local)
# Después: pnpm build && pnpm start, y en las pruebas: scripts/local/e2e-helper.mjs → como('compras').
set -euo pipefail
cd "$(dirname "$0")/../.."
SECRETO=local-jwt-secret-inrocompras-solo-para-pruebas-32
docker info >/dev/null 2>&1 || (dockerd >/tmp/dockerd.log 2>&1 &) ; for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
docker network create inrocompras-local >/dev/null 2>&1 || true
docker rm -f ic-db ic-rest ic-storage >/dev/null 2>&1 || true
docker run -d --name ic-db --network inrocompras-local -p 54322:5432 -e POSTGRES_PASSWORD=postgres supabase/postgres:17.11.0.006 >/dev/null
for i in $(seq 1 60); do docker exec ic-db pg_isready -U postgres -h localhost >/dev/null 2>&1 && break; sleep 2; done; sleep 4
psql_() { docker exec -i ic-db psql -U "${2:-postgres}" -d postgres -v ON_ERROR_STOP=1 -q < "$1"; }
docker exec ic-db psql -U supabase_admin -d postgres -qc "alter role authenticator with password 'postgres'; alter role supabase_storage_admin with password 'postgres';"
psql_ scripts/local/auth.sql supabase_admin
docker run -d --name ic-storage --network inrocompras-local -p 54324:5000 -e ANON_KEY=x -e SERVICE_KEY=x -e AUTH_JWT_SECRET=$SECRETO -e PGRST_JWT_SECRET=$SECRETO \
  -e DATABASE_URL=postgres://supabase_storage_admin:postgres@ic-db:5432/postgres -e FILE_SIZE_LIMIT=52428800 -e STORAGE_BACKEND=file -e FILE_STORAGE_BACKEND_PATH=/var/lib/storage \
  -e TENANT_ID=stub -e REGION=stub -e GLOBAL_S3_BUCKET=stub -e DB_INSTALL_ROLES=false supabase/storage-api:v1.84.19 >/dev/null
for i in $(seq 1 30); do docker exec ic-db psql -U postgres -tAc "select to_regclass('storage.buckets')" | grep -q buckets && break; sleep 2; done
# Migraciones en orden (seed después de 0003, como en las pruebas), y los datos de prueba.
for f in supabase/migrations/000{1,2,3}_*.sql; do psql_ "$f"; done
psql_ supabase/seed.sql
for f in $(ls supabase/migrations/*.sql | sort | tail -n +4); do psql_ "$f"; done
psql_ scripts/local/demo.sql
docker run -d --name ic-rest --network inrocompras-local -p 54323:3000 -e PGRST_DB_URI=postgres://authenticator:postgres@ic-db:5432/postgres \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=$SECRETO postgrest/postgrest:v16.5 >/dev/null
pkill -f scripts/local/proxy.mjs || true
(node scripts/local/proxy.mjs >/tmp/proxy-inrocompras.log 2>&1 &)
printf "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$(node scripts/local/sesion.mjs)" > .env.local
sleep 2; echo "Supabase local listo en http://127.0.0.1:54321 (.env.local escrito). Personas: scripts/local/e2e-helper.mjs"
