// Humo: cada pantalla abre sin error para cada perfil, en escritorio y en el celular (sin scroll horizontal).
import { entrarComo, expect, test, type Persona } from './sesion.ts';

const RUTAS = [
    '/',
    '/solicitudes',
    '/requerimientos',
    '/validaciones',
    '/seguimiento',
    '/proyectos',
    '/plan',
    '/ordenes',
    '/proveedores',
    '/pagos',
    '/cuadro',
    '/cuadro/aprobar',
    '/desaduanaje',
    '/equipo',
    '/configuracion',
];
const PERFILES: Persona[] = ['admin', 'solicitante', 'compras', 'importaciones', 'finanzas', 'gop', 'contabilidad'];
const ROTO = /No se pudo cargar|Application error|This page could not be found/;

for (const quien of PERFILES) {
    test(`${quien}: todas las pantallas abren @celular`, async ({ page, errores }, info) => {
        await entrarComo(page, quien);
        for (const ruta of RUTAS) {
            const r = await page.goto(ruta);
            expect(r?.status(), `${ruta} responde`).toBeLessThan(400);
            await expect(page.getByRole('navigation').or(page.getByRole('main')).first()).toBeVisible();
            await page.waitForLoadState('networkidle');
            await expect(page.locator('body'), `${ruta} sin error`).not.toContainText(ROTO);
            if (info.project.name === 'celular') {
                const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
                expect(sobra, `${ruta} sin scroll horizontal`).toBeLessThanOrEqual(1);
            }
        }
        expect(errores, 'sin errores en la consola').toEqual([]);
    });
}
