/**
 * Fronteras de la arquitectura hexagonal + DDD (las mismas de INROCONTA/GRAMA): toda dependencia apunta
 * hacia adentro y un contexto solo muestra su interfaz publicada. `pnpm depcruise` (dentro de `pnpm check`).
 *
 *   src/modules/<contexto>/domain          PURO: entidades y políticas; sin framework ni I/O
 *   src/modules/<contexto>/application     puertos y casos de uso (+ views.ts: lo que el navegador puede usar)
 *   src/modules/<contexto>/infrastructure  adaptadores de los puertos (Supabase, Drive, correo, Gemini)
 *   src/modules/<contexto>/composition.ts  conecta adaptadores con casos de uso: lo único que llama src/app
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-outward',
      comment: 'El dominio es PURO: no importa infraestructura, aplicación, Next, Supabase, Google ni React.',
      severity: 'error',
      from: { path: 'src/modules/[^/]+/domain' },
      to: {
        path: [
          'node_modules/(next|@supabase|googleapis|react|react-dom|neverthrow)',
          'src/modules/[^/]+/(infrastructure|application|composition)',
          'src/app',
          'src/shared/(auth|supabase|ui)',
        ],
      },
    },
    {
      name: 'application-no-infra',
      comment: 'La aplicación orquesta el dominio por PUERTOS; no importa adaptadores.',
      severity: 'error',
      from: { path: 'src/modules/[^/]+/application' },
      to: { path: ['src/modules/[^/]+/(infrastructure|composition)', 'src/shared/(auth|supabase)', 'node_modules/(next|@supabase|googleapis)'] },
    },
    {
      name: 'app-only-application',
      comment: 'src/app habla con un contexto por composition.ts o application/, nunca por domain/ o infrastructure/.',
      severity: 'error',
      from: { path: '^src/app' },
      to: { path: 'src/modules/[^/]+/(domain|infrastructure)' },
    },
    {
      name: 'contexts-isolated',
      comment: 'Un contexto no importa las entrañas de otro, solo su application/ o composition.',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/' },
      to: { path: 'src/modules/(?!\\1)[^/]+/(domain|infrastructure)' },
    },
    {
      name: 'shared-no-app',
      comment: 'src/shared no sabe nada de las pantallas ni de los contextos.',
      severity: 'error',
      from: { path: '^src/shared' },
      to: { path: ['^src/app', '^src/modules'] },
    },
    { name: 'no-circular', comment: 'Sin dependencias circulares.', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.mjs'] },
  },
};
