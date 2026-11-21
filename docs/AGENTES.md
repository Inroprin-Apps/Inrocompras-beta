## Contexto común (léelo entero)

Repo: INROCOMPRAS (Next.js 16 + Supabase), app de Compras e Importaciones de INROPRIN que reemplaza un AppSheet. Todo en español
(código, textos de UI de tú, sin exclamaciones; los errores dicen qué hacer). Producción 01/01/2027.

LEE PRIMERO: `CLAUDE.md` (sobre todo «Arquitectura»), y en `docs/`: 02_ROLES_Y_PERMISOS, 03_ESTADOS, 06_DISENO_UI, 09_CRITERIOS_ACEPTACION
y el doc de tu hito. Las reglas de negocio YA están en la base: `supabase/migrations/0001..0008` (esquema, RLS, y en 0003 una función
`public.ac_*` por acción + `acciones_disponibles(tabla,id)` + `te_toca()` + `seguimiento_items()`). La UI NO repite reglas.

**Patrón obligatorio (cópialo de la referencia):** `src/modules/proyectos/**` + `src/app/(app)/proyectos/**`:

- `src/modules/<ctx>/domain/*.ts` PURO (tipos camelCase, filtros, orden, cálculos de pantalla; sin React/Supabase/neverthrow).
- `application/ports/XPort.ts` (Result<T, ErrorFuente> de neverthrow) y `application/views.ts` (re-exporta el dominio).
- `infrastructure/SupabaseXAdapter.ts` recibe `SupabaseClient`, mapea filas snake_case → entidades; usa `resultado/resultadoUno` de `@/shared/errores.ts`.
- `composition.ts` ('use client') crea el adaptador con `supabaseNavegador()`. src/app solo importa composition.ts o application/views.ts.
- Pantalla: `page.tsx` (servidor, exporta metadata, solo monta la vista) + `<x>-view.tsx` ('use client') + `store.ts` (resource/keyed de
  `../_lib/resource.ts` con etiquetas = tablas que muestra) + `ficha-*.tsx` + `form-*.tsx`. Sin loading.tsx.
- Filtros/orden/página/ficha abierta en la URL con `urlState` (`?ver=<id>` abre la ficha: la bandeja «Te toca» y las notificaciones
  enlazan así — ver `rutaDe` en src/modules/comun/domain/tipos.ts). Listas con `<Lista>` de `@/shared/ui/lista-estado.tsx` (5 estados).
- Ficha: `<Ficha>`, `<Fases>`, `<Datos>`, `<FichaSeccion>` de `@/shared/ui/ficha.tsx`; «Lo que te toca» = `<PanelAcciones tabla id tocadas />`
  de `../_acciones/panel-acciones.tsx` (lee acciones_disponibles, pide campos, muestra el error de la base, refresca). Historial: `<Historial>`.
  Documentos: `<Documentos dueno tipos puedeSubir tocadas moneda />` de `../_documentos/documentos.tsx`.
- Tras guardar/actuar: `refrescar(['tabla', ...])`. Perfil: `usePerfil()` de `../_components/perfil.tsx`. Personas/catálogos: `personasStore`,
  `catalogosStore` de `../_lib/stores.ts`. Diálogos: `@/shared/ui/dialog.tsx`. Borrador local de formularios: `useBorrador` (`../_lib/borrador.ts`).
- Componentes de la guía en `src/shared/ui/` (button, card/Chip/Kpi, field, select-menu, multi-choice, tabs, pager, bits/T/SearchBox, date-field…).
  Pinta con tokens (`bg-primary`, `text-ink-2`, `border-line`), escala tipográfica (`text-ui`, `text-small`…), radios con nombre. Nunca hex.
- Montos: `Intl.NumberFormat('es-PE')`; solo muestra montos/órdenes a quien `ve_precios` (RLS igual lo impide). Celular: todo usable a 390 px.
- Cambios de ESTADO: siempre por la función `ac_*` (vía PanelAcciones o, para acciones en bloque, `ejecutarAccion(funcion, params)` del mismo archivo).
  Datos editables (columnas permitidas por `app.proteger` en 0002): update directo con RLS.

**Reglas de convivencia (trabajas EN LA MISMA COPIA `/home/user/Inrocompras-beta` que otro agente, en paralelo):**

- Solo creas/editas archivos de TU alcance (abajo). NO edites: `src/app/(app)/_lib/*`, `_acciones/*`, `_documentos/*`, `_components/*`,
  archivos existentes de `src/shared/**` (puedes AGREGAR archivos nuevos en `src/shared/ui/` si de verdad hacen falta), `package.json`,
  `pnpm-lock.yaml`, migraciones 0001–0008, `CLAUDE.md`. Si necesitas un cambio ahí o una dependencia nueva, NO lo hagas: dilo en tu informe.
- Migraciones nuevas SOLO en tu rango de números (abajo). Cada regla nueva en SQL lleva su prueba PGlite en `supabase/tests/<tema>.test.mjs`
  (copia el arranque de `supabase/tests/null.test.mjs`: carga 0001,0002,0003, seed, 0005..0008 y luego las tuyas). No la agregues a package.json.
- Pruebas del dominio en `tests/unit/modules/<tema>.test.mts` (vitest, `pnpm test`).

**Entorno local con datos reales (ya está corriendo, compartido):** Docker con Postgres+PostgREST+Storage y el proxy en
`http://127.0.0.1:54321` (ver `scripts/local/README.md`). `.env.local`, node_modules y playwright ya están. Trabaja en `/home/user/Inrocompras-beta`.
Para compilar usa SIEMPRE tu propia carpeta: `NEXT_DIST_DIR=.next-<tu puerto> pnpm build && NEXT_DIST_DIR=.next-<tu puerto> pnpm start -p <tu puerto>`.
`pnpm typecheck` y `pnpm depcruise` ven también los archivos a medio hacer del otro agente: si fallan por archivos FUERA de tu alcance, ignóralos.
Aplica tus migraciones a la base local compartida con `docker exec -i ic-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < archivo.sql`
y luego `docker restart ic-rest` (PostgREST recarga el esquema). NO borres datos de otros ni reinicies ic-db. Crea tus propios datos de prueba
(por SQL como postgres, o mejor por la UI). Personas de prueba: `scripts/local/e2e-helper.mjs` → `como('compras')` etc.
Corre tu app en TU puerto: `pnpm build && pnpm start -p <puerto>` y prueba con Playwright (BASE=http://localhost:<puerto>) los flujos de tu hito
con las personas que corresponden, en escritorio y en celular (390x844). Toma capturas para ti; revisa que no haya errores en consola.

**NO hagas commit ni push** (lo hace el integrador, que guarda tu avance cada cierto tiempo: deja el trabajo en disco y en estado
compilable lo antes posible, primero lo esencial). **Antes de terminar:** typecheck/depcruise/test/build en verde para tus archivos y
`node supabase/tests/<tuyas>.test.mjs` en verde. **Informe final (corto):** archivos creados; pantallas hechas; migraciones (número y qué hacen, ya aplicadas a la
base local o no); qué probaste en el navegador y con quién; cambios que necesitas en archivos ajenos (exactos) o dependencias; huecos o
bugs de reglas que encontraste en la base (no los arregles fuera de tu rango: repórtalos); lo que quedó pendiente.
