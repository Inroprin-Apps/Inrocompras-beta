# INROCOMPRAS

App de Compras e Importaciones de INROPRIN. Reemplaza el AppSheet de Compras y los Sheets del plan de compras y de las órdenes. Go-live: **01/01/2027**.

Stack: Next.js 16 (App Router) · Supabase (Postgres, Auth con Google, RLS) · Tailwind v4 con la guía UI de INROPRIN · Vercel.

Lee primero `CLAUDE.md` (reglas del repo) y `docs/` (alcance, roles, estados, plan de trabajo y criterios). El paquete de arranque original está en `docs/00_PAQUETE_DE_ARRANQUE.md`.

## Estado

| Hito | Estado |
|---|---|
| 0. Base: login con Google, menú por perfil, «Te toca», Equipo | Código listo y probado en local. Falta conectarlo a Supabase y Vercel (pasos abajo) |
| 1–8 | Pendientes (`docs/08_PLAN_DE_TRABAJO.md`) |

## Desarrollo

```bash
pnpm install
pnpm test:db      # reglas de la base en PGlite (sin Docker)
pnpm typecheck
pnpm dev          # necesita .env.local (copia .env.example)
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

## Verificado

- `pnpm test:db`: el flujo completo del AppSheet (57 verificaciones) y el acceso y Equipo del Hito 0 (25) y los cierres de huecos por NULL (26).
- Build de producción y la pantalla de login en escritorio y celular.
- Correcciones de seguridad sobre el paquete original en `supabase/migrations/0005_equipo.sql` y `0006_correcciones_null.sql` (ver los comentarios de cada archivo).
