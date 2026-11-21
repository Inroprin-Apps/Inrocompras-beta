// Formato es-PE de montos, factores y tipos de cambio. PURO.

// ───────────────────────── Formato ─────────────────────────
const SIMBOLO: Record<string, string> = { PEN: 'S/', USD: 'US$', EUR: '€' };
/**
 * Como money() de la guía (ux/formatos): «S/ 1,234.50», «US$ 10.00», «-S/ 480.50». Coma de miles, punto decimal,
 * siempre dos decimales y signo menos. No depende del ICU del navegador (Intl da «USD» en unos y «US$» en otros).
 */
export function monto(n: number, moneda = 'PEN'): string {
    const s = SIMBOLO[moneda] ?? moneda;
    const [ent, dec] = Math.abs(n).toFixed(2).split('.');
    const signo = n < 0 && Number(`${ent}.${dec}`) !== 0 ? '-' : '';
    return `${signo}${s} ${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}
export const numero = (n: number, dec = 3) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: dec }).format(n);
export const porcentaje = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('es-PE', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(n);
export const factor = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
export const tc = (n: number | null) => (n == null ? '—' : new Intl.NumberFormat('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 6 }).format(n));

/** Lee un número escrito a mano («1,234.5», «1234,5»). */
export function leerNumero(t: string): number | null {
    const s = t.trim().replace(/\s/g, '');
    if (!s) return null;
    const norm = s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, '');
    const n = Number(norm);
    return Number.isFinite(n) ? n : null;
}

/** Hoy en America/Lima como «AAAA-MM-DD». */
export const hoyLima = (ahora: Date = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
