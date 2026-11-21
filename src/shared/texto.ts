// Texto para buscar: sin tildes ni mayúsculas, y «todas las palabras» de una búsqueda. PURO (lo usan los dominios).

/** «Técnico» → «tecnico». */
export const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Las palabras de una búsqueda, ya planas. */
export const palabrasDe = (consulta: string) => plano(consulta).split(/\s+/).filter(Boolean);

/** ¿El texto contiene TODAS las palabras? (sin palabras, sí). */
export const contieneTodas = (texto: string, palabras: readonly string[]) => {
    if (!palabras.length) return true;
    const t = plano(texto);
    return palabras.every((w) => t.includes(w));
};
