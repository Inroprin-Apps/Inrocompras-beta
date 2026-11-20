// LOS COLORES SON TOKENS CSS Y ECHARTS NO HABLA CSS. Viene de GRAMA (shared/ui/chart/resolve-css-color).
//
// Cada color de un gráfico es un token (`var(--color-chart-1)`, `color-mix(in oklch, var(--color-chart-ink) 40%, var(--color-surface))`),
// así que cambiar el azul en `globals.css` cambia todos los gráficos solo. ECharts interpreta los colores por su cuenta
// para mezclar los hover y atenuar series, y solo conoce hex, rgb y nombres: con un `var(...)` pinta negro o nada, sin error.
//
// Por eso cada token de una opción se convierte en un `rgba()` plano justo antes de llegar a ECharts, con lo que el
// navegador calcula AHORA. El navegador puede responder `oklch(...)` o `color(srgb ...)`, que ECharts tampoco entiende,
// así que el último paso lo pinta en un canvas de 1×1 y lee el píxel: cualquier sintaxis de color que el navegador
// conozca sale como cuatro números.

/** ¿Es un color que solo el navegador puede resolver? */
export function isCssColorToken(value: string): boolean {
    return /^\s*(var|color-mix|oklch|oklab|color)\(/i.test(value);
}

/**
 * Recorre una opción de ECharts y cambia cada token CSS por lo que diga `resolve`. Pura (el resolutor se inyecta)
 * para poder probarla sin navegador. Las funciones (formatters) y los objetos no planos se dejan como están.
 */
export function resolveTokensDeep<T>(value: T, resolve: (token: string) => string): T {
    if (typeof value === 'string') return (isCssColorToken(value) ? resolve(value) : value) as T;
    if (Array.isArray(value)) return value.map((item: unknown) => resolveTokensDeep(item, resolve)) as T;
    if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        const out: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) out[key] = resolveTokensDeep(item, resolve);
        return out as T;
    }
    return value;
}

const cache = new Map<string, string>();

/** El token como `rgba(r, g, b, a)`, leído de la página. Solo en el navegador. */
export function resolveCssColor(token: string): string {
    const known = cache.get(token);
    if (known !== undefined) return known;

    // La sonda vive en la página para que `var(--…)` se resuelva contra la hoja de estilos real.
    const probe = document.createElement('span');
    probe.style.color = token;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const pen = canvas.getContext('2d', { willReadFrequently: true });
    if (pen === null) return computed;
    pen.fillStyle = computed;
    pen.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data;
    const rgba = `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
    cache.set(token, rgba);
    return rgba;
}

/** Vacía la memoria de colores: tras cambiar un token en caliente, para que el gráfico lea el nuevo. */
export function forgetResolvedColors(): void {
    cache.clear();
}
