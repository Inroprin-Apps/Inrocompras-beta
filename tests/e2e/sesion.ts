// Entra como una persona de prueba (scripts/local/demo.sql): pone la cookie de sesión de @supabase/ssr firmada con la
// clave local pública, y junta los errores de la página para que cada prueba los revise.
import { test as base, type Page } from '@playwright/test';
import { cookieSesion } from '../../scripts/local/sesion.mjs';
import { PERSONAS } from '../../scripts/local/personas.mjs';

export type Persona = keyof typeof PERSONAS;

export async function entrarComo(page: Page, quien: Persona) {
    const [id, email, nombre] = PERSONAS[quien];
    const dominio = new URL(process.env.E2E_BASE ?? 'http://localhost:3000').hostname;
    await page.context().addCookies([{ ...cookieSesion(id, email, nombre), domain: dominio, path: '/' }]);
}

/** Errores de la página y de la consola, sin los 4xx esperados (p. ej. un permiso que RLS niega a propósito). */
export const test = base.extend<{ errores: string[] }>({
    errores: async ({ page }, usar) => {
        const errores: string[] = [];
        page.on('pageerror', (e) => errores.push(String(e)));
        page.on('console', (m) => {
            if (m.type() === 'error' && !/status of 4\d\d/.test(m.text())) errores.push(m.text());
        });
        await usar(errores);
    },
});
export { expect } from '@playwright/test';
