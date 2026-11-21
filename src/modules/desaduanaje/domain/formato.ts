// Formato es-PE de montos, factores y tipos de cambio. PURO.

// ───────────────────────── Formato ─────────────────────────
const fmt = new Map<string, Intl.NumberFormat>();
export function monto(n: number, moneda = 'PEN'): string {
    try {
        if (!fmt.has(moneda))
            fmt.set(moneda, new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        return fmt.get(moneda)!.format(n);
    } catch {
        return `${moneda} ${n.toFixed(2)}`;
    }
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
