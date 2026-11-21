// Ayuda para pruebas en navegador contra el Supabase local: abre una página con la sesión de una persona.
import { chromium } from 'playwright';
import { cookieSesion } from './sesion.mjs';
import { PERSONAS } from './personas.mjs';

export { PERSONAS };

export const BASE = process.env.BASE ?? 'http://localhost:3000';

/** Un navegador con una página por persona: `const { pagina, cerrar } = await como('compras')`. */
export async function como(quien, opciones = {}) {
    const navegador = await chromium.launch();
    const contexto = await navegador.newContext({ viewport: { width: 1366, height: 860 }, locale: 'es-PE', ...opciones });
    const [id, email, nombre] = PERSONAS[quien];
    const c = cookieSesion(id, email, nombre);
    await contexto.addCookies([{ ...c, domain: 'localhost', path: '/' }]);
    const pagina = await contexto.newPage();
    const errores = [];
    pagina.on('pageerror', (e) => errores.push(String(e)));
    pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    return { pagina, errores, cerrar: () => navegador.close() };
}
