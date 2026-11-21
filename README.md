# INROCOMPRAS

App de Compras e Importaciones de INROPRIN. Reemplaza el AppSheet de Compras y los Sheets del plan de compras y de las órdenes. Go-live: **01/01/2027**.

Stack: Next.js 16 (App Router) · Supabase (Postgres, Auth con Google, RLS) · Tailwind v4 con la guía UI de INROPRIN · Vercel.

Lee primero `CLAUDE.md` (reglas del repo) y `docs/` (alcance, roles, estados, plan de trabajo y criterios). El paquete de arranque original está en `docs/00_PAQUETE_DE_ARRANQUE.md`.

## Estado

Hitos 1–6 construidos y publicados (ver `docs/ESTADO.md`): solicitudes, requerimientos y validaciones, plan de compras, órdenes y cuadro comparativo, pagos, desaduanaje, legajo en Drive, correo, lector de PDF e InroPay. Lo pendiente de configurar está en `docs/ESTADO.md`.

## Desarrollo

```bash
pnpm install
pnpm dev          # necesita .env.local (copia .env.example)
pnpm check        # tipos, lint, fronteras (depcruise), formato, dominio (vitest) y reglas de la base (PGlite)
```

Pruebas en navegador (Playwright) contra un Supabase local con 14 personas inventadas (`scripts/local/README.md`):

```bash
bash scripts/local/levantar.sh   # Postgres, PostgREST y Storage en Docker + datos de prueba
pnpm build
pnpm test:e2e                     # cada pantalla por perfil, en escritorio y celular, y el alta de una solicitud
```

## Puesta en marcha (una vez por ambiente: dev y prod)

1. **Supabase**: crea el proyecto (región São Paulo, la más cercana a Lima). Aplica `supabase/migrations/0001…` en orden y `supabase/seed.sql` (con la CLI: `supabase link` y `supabase db push`, o pegándolos en el SQL Editor).
2. **Primer administrador**: en el SQL Editor, antes de que esa persona entre por primera vez:
   ```sql
   insert into public.config (clave, valor, nota)
   values ('admins_iniciales', '["tu.correo@inroprin.com"]', 'Reciben ADMIN al primer ingreso')
   on conflict (clave) do update set valor = excluded.valor;
   ```
   Al entrar recibe el rol ADMIN y desde **Equipo** asigna área y roles a los demás.
3. **Google OAuth** (Google Cloud de la empresa): pantalla de consentimiento **Interna**; cliente OAuth «Aplicación web» con la URL de callback que muestra Supabase (`https://<proyecto>.supabase.co/auth/v1/callback`). Copia el ID y el secreto en Supabase → Authentication → Providers → Google. Apaga el login por correo.
4. **Supabase → Authentication → URL Configuration**: Site URL = la URL de Vercel; Redirect URLs = `https://<app>.vercel.app/auth/callback` y `http://localhost:3000/auth/callback`.
5. **Vercel**: importa este repo; variables de `.env.example` (al menos `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
