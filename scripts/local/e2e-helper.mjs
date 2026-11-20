// Ayuda para pruebas en navegador contra el Supabase local: abre una página con la sesión de una persona.
import { chromium } from 'playwright';
import { cookieSesion } from './sesion.mjs';

export const PERSONAS = {
    admin: ['a0000000-0000-0000-0000-000000000001', 'admin@inroprin.com', 'Ana Admin'],
    solicitante: ['a0000000-0000-0000-0000-000000000002', 'solicitante@inroprin.com', 'Sergio Solicitante'],
    gerente: ['a0000000-0000-0000-0000-000000000003', 'gerente@inroprin.com', 'Gabriela Gerente de Proyecto'],
    pcp: ['a0000000-0000-0000-0000-000000000004', 'pcp@inroprin.com', 'Paula Planeamiento'],
    tecnica: ['a0000000-0000-0000-0000-000000000005', 'tecnica@inroprin.com', 'Tomás Técnica'],
    compras: ['a0000000-0000-0000-0000-000000000006', 'compras@inroprin.com', 'Carla Compras'],
    importaciones: ['a0000000-0000-0000-0000-000000000007', 'importaciones@inroprin.com', 'Iván Importaciones'],
    cg: ['a0000000-0000-0000-0000-000000000008', 'cg@inroprin.com', 'Carlos Control de Gestión'],
    gop: ['a0000000-0000-0000-0000-000000000009', 'gop@inroprin.com', 'Gloria GOP'],
    gaf: ['a0000000-0000-0000-0000-000000000010', 'gaf@inroprin.com', 'Gustavo GAF'],
    finanzas: ['a0000000-0000-0000-0000-000000000011', 'finanzas@inroprin.com', 'Fernanda Finanzas'],
    contabilidad: ['a0000000-0000-0000-0000-000000000012', 'contabilidad@inroprin.com', 'Cecilia Contabilidad'],
    jefecompras: ['a0000000-0000-0000-0000-000000000013', 'jefecompras@inroprin.com', 'Jorge Jefe de Compras'],
    jefeimp: ['a0000000-0000-0000-0000-000000000014', 'jefeimp@inroprin.com', 'Julia Jefa de Importaciones'],
};
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
