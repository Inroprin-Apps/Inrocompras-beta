// El primer tramo del flujo en el navegador: la persona solicitante arma una solicitud, le agrega un ítem y la emite;
// los botones salen de acciones_disponibles, así que esto también prueba el panel «Lo que te toca».
import { entrarComo, expect, test } from './sesion.ts';

test('solicitante crea, completa y emite una solicitud', async ({ page, errores }) => {
    const marca = `E2E ${Date.now()}`;
    await entrarComo(page, 'solicitante');
    await page.goto('/solicitudes');
    await page.getByRole('button', { name: 'Nueva solicitud' }).click();

    const dialogo = page.getByRole('dialog');
    await dialogo.getByLabel('Proyecto').click();
    await page.getByRole('option', { name: /Talleres EPT/ }).click();
    await dialogo.getByLabel('Sustento').fill(`Prueba en navegador (${marca})`);
    await page.getByRole('button', { name: 'Crear borrador' }).click();
    await expect(page.getByRole('heading', { name: 'Borrador de solicitud' })).toBeVisible();

    // Sin ítems no se puede emitir: la base no ofrece el botón.
    await expect(page.getByRole('button', { name: 'Emitir solicitud' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Ítem', exact: true }).click();
    await page.getByLabel('Descripción').fill(`Mesa de trabajo (${marca})`);
    await page.getByLabel('Cantidad').fill('3');
    await page.getByRole('button', { name: 'Agregar ítem' }).click();
    await expect(page.getByText(`Mesa de trabajo (${marca})`)).toBeVisible();

    await page.getByRole('button', { name: 'Emitir solicitud' }).click();
    await expect(page.getByText('Pendiente Liberación').first()).toBeVisible();
    expect(new URL(page.url()).searchParams.get('ver'), 'la ficha queda abierta en la URL').toBeTruthy();
    expect(errores).toEqual([]);
});

test('una persona sin roles no ve acciones de Compras', async ({ page }) => {
    await entrarComo(page, 'solicitante');
    await page.goto('/ordenes');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Nueva orden|Generar OC/ })).toHaveCount(0);
});
