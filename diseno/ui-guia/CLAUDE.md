# Guía UI/UX de las apps de INROPRIN

Sitio Next.js que documenta cómo se ven y se comportan las apps internas de INROPRIN (marca Roland Print): tokens, componentes, patrones de pantalla y reglas de UX, cada uno con un ejemplo vivo y su código para copiar.

## Origen

Sale de `D:\inroprin-apps\Inroconta` → `src/app/dev/colores` (la hoja de colores) y `src/shared/ui/` (los componentes). Los componentes se copiaron a `src/ui/` y se pasaron a la escala con nombre (abajo). Cuando algo cambie en INROCONTA, se trae aquí; y lo nuevo se decide aquí y luego se lleva a las apps.

## Estructura

- `src/app/globals.css`: **los tokens** (color por rol, escala tipográfica, radios, sombras). Es lo que se copia a cada app. Es `@theme static` (emite todas las variables aunque ninguna clase las use). Los colores van anotados y **son la única lista**: `/* @grupo <id> | <Título> | <pendiente|aprobado> | <nota> */` abre un grupo y cada `--color-x: valor; /* uso | sobre <token> */` es un token (el `sobre` hace que se mida su contraste).
- `src/app/dev/colores/`: la hoja para revisar y aprobar la paleta (solo `pnpm dev`). `tokens.ts` lee las anotaciones de globals.css, `review.tsx` pinta y se actualiza sola cada 1.5 s al guardar el CSS, `usage.tsx` tiene los ejemplos de uso por id de grupo. Para cambiar un color, su uso o aprobar un grupo, solo se toca globals.css.
- `src/ui/`: **los componentes** que se copian a las apps (`button`, `card`, `bits`, `field`, `hueco`, `pager`, `period-picker`, `period`, `toaster`, `format`).
- `docs/`: el manual de marca de Roland Print (PDF). De ahí salen los rombos y el cubo (`src/ui/marca.tsx`) y la papelería (`src/guia/papeleria.ts` + `marca-html.ts`, que usan las descargas y `/dev/prueba`).
- `public/descargas/<pieza>/`: por cada pieza de papelería (hoja membretada, sobre, tarjeta, firma, fotocheck) su `.pdf` (tamaño real, para imprimir), su `.docx` (para editar) y `vista-previa.png`; más `papeleria-roland-print.zip` con todo. Salen de `scripts/generar-descargas.mjs`; no se editan a mano.
- `src/guia/`: piezas solo de la guía (`nav.ts` = índice del menú, `doc.tsx` = Page/PageHeader/Section/Rules/DoDont/DocTable/Code, `example.tsx` = preview + código, `swatch.tsx`, `data.ts` = datos inventados, `sidebar.tsx`).
- `src/app/<grupo>/<página>/page.tsx`: una página por tema. Al agregar una, se añade también en `src/guia/nav.ts`.

## Reglas al escribir aquí

- Pintar con roles (`bg-primary`, `text-ink-2`, `border-line`), nunca hex, `brand-*` ni la paleta de Tailwind. Solo los ejemplos «No» de `DoDont` rompen esto a propósito.
- Tipografía solo con la escala: `text-display` 24 · `text-title` 21 · `text-subtitle` 17 · `text-heading` 15 · `text-body` 14 · `text-ui` 13 · `text-small` 12 · `text-caption` 11. Nada de `text-[13px]`.
- Radios con nombre: `rounded-inner` 7 · `rounded-control` 9 · `rounded-card` 12 (más los de Tailwind).
- Una página que tiene estado u `onClick` lleva `'use client'` (y entonces no exporta `metadata`); las demás son de servidor y exportan `metadata = { title }`.
- `Example` recibe `code` como string escrito a mano: es lo que una app debe pegar, no un volcado del JSX de la guía.
- Los imports llevan extensión (`./bits.tsx`), como en INROCONTA (`allowImportingTsExtensions`).
- Textos en español de Perú, de tú, sin exclamaciones. Datos de ejemplo inventados; nunca datos reales ni correos de personas.

## Reglas de color (las de D:\Grama\src\app\globals.css)

- Un color por rol, el resto **derivado** con `color-mix(in oklab, …)` (nunca `srgb`): hover 92 % y pulsado 84 % con negro, `-soft` 12 % con blanco (opaco, sin alfa), `-strong` = base con negro hasta pasar AA, grises = `texto` con blanco. No se escribe un hex para un hover.
- Contraste: texto AA (4.5:1) sobre el fondo donde se usa; un color claro de marca no sirve de texto (usa su `-strong`); el amarillo sólido nunca lleva texto; el borde de un control da ≥3:1 (`control`) y el de una tarjeta o divisor es `line`. Deshabilitado es bajo a propósito.
- Para cambiar un porcentaje, recalcular el contraste: `/dev/colores` lo mide en vivo y marca en rojo o «solo grande» lo que no pasa.

## Comandos

pnpm (no npm). `pnpm dev` (puerto 3100), `pnpm build`, `pnpm typecheck`, `pnpm descargas` (regenera `public/descargas/`: PDF, Word y vista previa de cada pieza de papelería, y el .zip; usa Edge o Chrome).

## Pendiente

- Modo oscuro (tokens redefinidos bajo `prefers-color-scheme`).
- Llevar la escala tipográfica y los radios con nombre a INROCONTA.
- Convertir `globals.css` + `src/ui/` en un paquete compartido cuando haya 2–3 apps usándolo.
- Componentes que faltan: diálogo/modal, menú desplegable, pestañas, gráfico de series (ECharts con tokens).
