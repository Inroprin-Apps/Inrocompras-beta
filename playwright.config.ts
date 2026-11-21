import { defineConfig, devices } from '@playwright/test';

// Pruebas en navegador contra el Supabase LOCAL (scripts/local/levantar.sh) y la app compilada.
//   bash scripts/local/levantar.sh && pnpm build && pnpm test:e2e
// Si ya hay una app corriendo, E2E_BASE=http://localhost:3001 pnpm test:e2e la usa en vez de arrancar otra.
const base = process.env.E2E_BASE ?? 'http://localhost:3000';

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60_000,
    expect: { timeout: 15_000 },
    fullyParallel: true,
    workers: process.env.CI ? 2 : 4,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: { baseURL: base, locale: 'es-PE', timezoneId: 'America/Lima', trace: 'off' },
    projects: [
        { name: 'escritorio', use: { viewport: { width: 1366, height: 860 } } },
        { name: 'celular', use: { ...devices['Pixel 7'] }, grep: /@celular/ },
    ],
    webServer: process.env.E2E_BASE ? undefined : { command: 'pnpm start', url: base, reuseExistingServer: true, timeout: 120_000 },
});
