// RUC peruano: 11 dígitos, empieza con 10, 15, 16, 17 o 20, y el último es el dígito verificador (módulo 11).
// PURO. Es la misma regla que public.ruc_valido (0003_acciones.sql) y la usa también el lector de documentos.

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;
const FORMA = /^(10|15|16|17|20)\d{9}$/;

/** El dígito verificador de los 10 primeros dígitos. */
export function digitoVerificador(diez: string): number {
    const s = PESOS.reduce((a, p, i) => a + p * Number(diez[i]), 0);
    const d = 11 - (s % 11);
    return d === 10 ? 0 : d === 11 ? 1 : d;
}

export function rucValido(ruc: string): boolean {
    return FORMA.test(ruc) && digitoVerificador(ruc) === Number(ruc[10]);
}

/** Lo escrito sin espacios, puntos ni guiones (como se pega desde un PDF o un correo). */
export const limpiarRuc = (t: string) => t.replace(/[\s.-]/g, '');

/** Qué le pasa al RUC, en palabras para el campo (validación en vivo), o null si está bien. */
export function motivoRuc(texto: string): string | null {
    const r = limpiarRuc(texto);
    if (!r) return 'Escribe el RUC.';
    if (/\D/.test(r)) return 'El RUC solo lleva números.';
    if (r.length < 11) return `Faltan dígitos: llevas ${r.length} de 11.`;
    if (r.length > 11) return `Sobran dígitos: el RUC tiene 11 y llevas ${r.length}.`;
    if (!FORMA.test(r)) return 'El RUC empieza con 10, 15, 16, 17 o 20.';
    if (!rucValido(r)) return 'El dígito verificador no coincide. Revisa que esté bien copiado.';
    return null;
}
