# INROCOMPRAS

App de Compras e Importaciones de INROPRIN. Reemplaza el AppSheet de Compras y los Sheets del plan de compras y de las órdenes. Sale a producción el **01/01/2027** con el tramo de Compras; las pruebas con usuarios empiezan en diciembre.

## Stack
- **Next.js 16** (App Router, React 19, TypeScript estricto) en **Vercel**. pnpm.
- **Supabase**: Postgres, Auth con Google (solo el dominio de la empresa), Storage como staging, RLS y funciones.
- **Tailwind v4** con los tokens de `diseno/ui-guia/src/app/globals.css` y los componentes de `diseno/ui-guia/src/ui/`. Se copian; no se reinventan.
- Integraciones: Google Drive (legajo), Gmail API o relay SMTP de Workspace (correo), Gemini en plan gratuito (lectura de PDF), InroPay (pagos de Finanzas).

## Regla de oro: las reglas viven en la base
- Cada cambio de estado es una función `public.ac_*` (SECURITY DEFINER) que valida la condición, bloquea la fila, cambia, deja historial y encola correos, PDF y Drive.
- `public.acciones_disponibles(tabla, id)` dice qué botones ve el usuario actual. **La UI no repite reglas**: muestra lo que esa función devuelve y llama a la función indicada con los campos de `pide`.
- `app.p_<accion>()` devuelve el motivo en español si no se puede. Ese texto va tal cual en el aviso de error.
- RLS en todas las tablas. Un disparador (`app.proteger`) impide cambiar con UPDATE directo las columnas de estado.
- Para algo nuevo: primero la función y su prueba en `supabase/tests/flujo.test.mjs`; después la pantalla.

## Convenciones
- Todo en español: tablas, columnas, funciones y textos. Las tablas y estados conservan los nombres del AppSheet para que Compras se reconozca.
- Migraciones nuevas: `supabase/migrations/NNNN_descripcion.sql`. Nunca se edita una migración ya aplicada en producción.
- Tipos: `supabase gen types typescript` después de cada migración.
- Dinero: `numeric` en la base y `Intl.NumberFormat('es-PE')` en pantalla. Fechas en `America/Lima`.
- Textos de la UI: de tú, cortos, sin exclamaciones (ver `diseno/ui-guia/src/app/(guia)/ux/redaccion`). Los errores dicen qué hacer.

## Seguridad (no negociable)
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON` e `INROPAY_*` solo existen en el servidor. Nunca en código del cliente ni con prefijo `NEXT_PUBLIC_`.
- No se escribe en el SIDIGE ni en sus servidores. Lo que vaya al SIDIGE se encola como `sidige_escribir` y lo hará la integración oficial.
- No se suben al repo datos reales de proveedores, montos, correos de personas ni archivos de Listas/AppSheet (traen webhooks y tokens).
- Los datos de ejemplo son inventados.

## Comandos
- `pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm lint`
- `supabase start` · `supabase db reset` (aplica migraciones y seed) · `supabase gen types typescript --local > src/lib/db.types.ts`
- `node supabase/tests/flujo.test.mjs` (reglas y flujo en PGlite, sin Docker)

## Dónde está cada cosa
- Alcance: `docs/01_ALCANCE.md`
- Roles y permisos: `docs/02_ROLES_Y_PERMISOS.md`
- Estados: `docs/03_ESTADOS.md`
- Datos: `docs/04_MODELO_DATOS.md`
- Plan de compras: `docs/05_PLAN_DE_COMPRAS.md`
- UI: `docs/06_DISENO_UI.md`
- Integraciones: `docs/07_INTEGRACIONES.md`
- Hitos: `docs/08_PLAN_DE_TRABAJO.md`
- Pruebas de aceptación: `docs/09_CRITERIOS_ACEPTACION.md`
- Pendientes: `docs/10_DECISIONES_ABIERTAS.md`
- Mejoras sobre el AppSheet: `docs/11_MEJORAS_SOBRE_APPSHEET.md`
- Fórmulas originales: `referencia/appsheet/appsheet_v2_referencia.md`

## Arquitectura (como INROCONTA: hexagonal + DDD)
```
src/
  app/                              Next (presentación)
    (app)/                          lo que pide sesión; layout = marco (menú, campana, perfil)
      <pantalla>/                   page.tsx (servidor, solo monta la vista) + <pantalla>-view.tsx ('use client')
                                    + store.ts (almacenes de esa pantalla) + ficha-*.tsx + form-*.tsx
      _acciones/                    PanelAcciones («Lo que te toca»: acciones_disponibles + diálogo de `pide`) e Historial
      _components/                  menú lateral, campana, PerfilProvider/usePerfil
      _lib/                         resource.ts (resource/keyed + refrescar), url-state.ts, stores.ts, borrador.ts, menu.ts
    api/                            rutas del servidor (cola, webhooks, PDF)
  modules/<contexto>/               un bounded context (proyectos, solicitudes, ordenes…)
    domain/                         PURO: tipos, filtros, orden, cálculos de pantalla (semáforo, criticidad, Excel)
    application/ports/              interfaces (XPort) que devuelven Result<T, ErrorFuente> (neverthrow)
    application/views.ts            lo que la presentación puede importar (re-exporta el dominio)
    infrastructure/                 SupabaseXAdapter(db): mapea filas snake_case → entidades camelCase
    composition.ts                  'use client'; crea el adaptador con supabaseNavegador(): lo único que llama src/app
  shared/                           ui/ (componentes de la guía + dialog, ficha, lista-estado), supabase/, auth/, errores.ts, tipos.ts
```
- **Fronteras:** `pnpm depcruise` (`.dependency-cruiser.cjs`). src/app solo importa `composition.ts` o `application/views.ts`.
- **Datos:** el navegador lee Supabase con la sesión de la persona (RLS decide). Cada lista es un `resource()` (una vez por pestaña);
  cada ficha por id, `keyed()`. Tras una acción o un guardado: `refrescar(['tabla', ...])` recarga los almacenes con esas etiquetas.
- **Acciones de estado:** NUNCA un update directo de estado. La ficha pone `<PanelAcciones tabla id tocadas />` y listo: los botones,
  los campos a pedir y el error salen de la base. Edición de datos editables (columnas que permite `app.proteger`): update directo con RLS.
- **Pantallas:** sin `loading.tsx`; la vista se pinta entera y solo los datos son huecos. Filtros, orden, página y la ficha abierta
  van en la URL con `urlState` (`?ver=<id>` abre la ficha: así enlazan la bandeja y las notificaciones). Toda lista usa `<Lista>` (5 estados).
- **Referencia completa:** `src/modules/proyectos` + `src/app/(app)/proyectos` (lista, filtros, ficha, acciones, formulario, borrador).
- **Pruebas:** dominio en `tests/unit/modules/*.test.mts` (vitest); reglas en `supabase/tests` (PGlite). `pnpm check` corre todo.

## Estructura del repo
- `src/app/`: la app (ver Arquitectura). `globals.css` es copia de la guía.
- `src/shared/ui/`: componentes copiados de `diseno/ui-guia/src/ui/` + los que faltaban en la guía (dialog, ficha, lista-estado).
- `src/proxy.ts`: renueva la sesión y manda al login (Next 16 usa `proxy.ts` en vez de `middleware.ts`).
- `supabase/tests/*.test.mjs`: pruebas de reglas en PGlite; `pnpm test:db` las corre todas y el CI las exige.
- `ejemplos/integraciones/`: código base de Drive, correo, lector de PDF, PDF de la OC, cola y rutas; se mueve a `src/lib/` en el hito que lo use.
- `diseno/ui-guia/`: la guía UI completa (referencia; no se compila con la app).
