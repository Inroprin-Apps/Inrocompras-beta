import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Pruebas del dominio puro de cada contexto (tests/unit/modules/*.test.mts). Las reglas de negocio se
// prueban en la base (supabase/tests, PGlite).
export default defineConfig({
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: { include: ['tests/unit/**/*.test.mts'], environment: 'node' },
});
