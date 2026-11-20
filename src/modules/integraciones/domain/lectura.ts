// Lector de cotizaciones y facturas (docs/07 §5). PURO: qué se saca del TEXTO del PDF (paso 1, gratis, sin IA)
// y cómo se combina con lo que lee Gemini (paso 2). Lo leído queda como PROPUESTA en documentos.lectura:
// la persona la confirma con ac_documento_confirmar_lectura; aquí nunca se confirma nada.

export type Moneda = 'PEN' | 'USD' | 'EUR' | 'GBP';

export interface ItemLeido {
    descripcion: string;
    cantidad: number | null;
    unidad: string | null;
    precio_unitario: number | null;
    total: number | null;
    marca: string | null;
    modelo: string | null;
}

/** Lo que se guarda en documentos.lectura (jsonb, snake_case como el resto de la base). */
export interface LecturaDocumento {
    fuente: 'texto' | 'gemini' | 'ninguna';
    ruc: string | null;
    rucs_encontrados: string[];
    razon_social: string | null;
    tipo: 'Cotización' | 'Factura' | 'Proforma' | 'Otro' | null;
    numero: string | null;
    fecha: string | null;
    moneda: Moneda | null;
    subtotal: number | null;
    igv: number | null;
    total: number | null;
    validez_dias: number | null;
    plazo_entrega_dias: number | null;
    forma_pago: string | null;
    items: ItemLeido[];
    avisos: string[];
}

export const LECTURA_VACIA: LecturaDocumento = {
    fuente: 'ninguna',
    ruc: null,
    rucs_encontrados: [],
    razon_social: null,
    tipo: null,
    numero: null,
    fecha: null,
    moneda: null,
    subtotal: null,
    igv: null,
    total: null,
    validez_dias: null,
    plazo_entrega_dias: null,
    forma_pago: null,
    items: [],
    avisos: [],
};

/** «1.234,56» → 1234.56 ; «1,234.56» → 1234.56 ; «1234» → 1234. */
export function aNumero(v: string): number | null {
    let t = v.trim();
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

/** El primer número que sigue a una de las etiquetas (en orden de prioridad). */
export function leerMonto(texto: string, etiquetas: RegExp[]): number | null {
    for (const e of etiquetas) {
        const m = texto.match(new RegExp('(?:' + e.source + ')' + String.raw`[^\d\n]{0,25}([\d.,]*\d)`, 'i'));
        if (!m) continue;
        const n = aNumero(m[1]);
        if (n !== null) return n;
    }
    return null;
}

/** Los RUC válidos del texto, sin repetir y sin los propios (INROPRIN y demás empresas del grupo). */
export function rucsDelTexto(texto: string, esValido: (r: string) => boolean, propios: string[] = []): string[] {
    const todos = texto.match(/\b(?:10|15|16|17|20)\d{9}\b/g) ?? [];
    return [...new Set(todos)].filter((r) => esValido(r) && !propios.includes(r));
}

export function monedaDelTexto(texto: string): Moneda | null {
    if (/US\$|\bUSD\b|D[ÓO]LARES/i.test(texto)) return 'USD';
    if (/€|\bEUR\b|EUROS/i.test(texto)) return 'EUR';
    if (/£|\bGBP\b|LIBRAS/i.test(texto)) return 'GBP';
    if (/S\/\.?|\bPEN\b|SOLES/i.test(texto)) return 'PEN';
    return null;
}

/** La primera fecha dd/mm/aaaa (o aaaa-mm-dd) del texto, como AAAA-MM-DD. */
export function fechaDelTexto(texto: string): string | null {
    const iso = texto.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const m = texto.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/);
    if (!m) return null;
    const [d, mes] = [Number(m[1]), Number(m[2])];
    if (d < 1 || d > 31 || mes < 1 || mes > 12) return null;
    return `${m[3]}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Serie y número del comprobante: F001-123, E001-45, B001-9 (o «N° 000123» en una cotización). */
export function numeroDelTexto(texto: string): string | null {
    const cpe = texto.match(/\b([FEB][A-Z0-9]{3})\s*[-–]\s*(\d{1,8})\b/);
    if (cpe) return `${cpe[1]}-${cpe[2]}`;
    const cot = texto.match(/(?:COTIZACI[ÓO]N|PROFORMA|QUOTATION)\s*(?:N[°ºo.]*|#)?\s*:?\s*([A-Z0-9][A-Z0-9-]{2,20})/i);
    return cot ? cot[1] : null;
}

export function tipoDelTexto(texto: string): LecturaDocumento['tipo'] {
    if (/FACTURA\s+ELECTR/i.test(texto)) return 'Factura';
    if (/PROFORMA/i.test(texto)) return 'Proforma';
    if (/COTIZACI|QUOTATION/i.test(texto)) return 'Cotización';
    return null;
}

/** Paso 1: lo que se saca del texto del PDF, sin IA. */
export function extraerDeTexto(texto: string, esValido: (r: string) => boolean, propios: string[] = []): LecturaDocumento {
    const rucs = rucsDelTexto(texto, esValido, propios);
    const avisos: string[] = [];
    if (texto.trim().length < 50) avisos.push('El PDF parece escaneado (sin texto): conviene leerlo con Gemini o completar los datos a mano.');
    if (rucs.length > 1) avisos.push('Hay más de un RUC en el documento: confirma cuál es el del proveedor.');
    if (rucs.length === 0) avisos.push('No se encontró un RUC válido.');
    const total = leerMonto(texto, [/importe\s+total/, /total\s+a\s+pagar/, /total\s+general/, /(?<!sub\s?-?\s?)\btotal\b/]);
    if (total === null) avisos.push('No se encontró el total.');
    return {
        ...LECTURA_VACIA,
        fuente: 'texto',
        ruc: rucs[0] ?? null,
        rucs_encontrados: rucs,
        tipo: tipoDelTexto(texto),
        numero: numeroDelTexto(texto),
        fecha: fechaDelTexto(texto),
        moneda: monedaDelTexto(texto),
        subtotal: leerMonto(texto, [/sub\s*-?\s*total/, /valor\s+(?:de\s+)?venta/, /op\.?\s*gravadas?/]),
        igv: leerMonto(texto, [/\bI\.?G\.?V\.?(?![a-z])/]),
        total,
        avisos,
    };
}

/** ¿Basta la lectura del texto, o conviene Gemini? (escaneado, varios RUC o sin total). */
export const bastaElTexto = (l: LecturaDocumento, texto: string) => Boolean(l.ruc && l.rucs_encontrados.length === 1 && l.total !== null && texto.trim().length >= 50);

/** Avisos sobre lo que leyó Gemini (RUC que no pasa el módulo 11, ítems que no suman el subtotal). */
export function revisarGemini(g: LecturaDocumento, esValido: (r: string) => boolean): LecturaDocumento {
    const avisos = [...g.avisos];
    if (g.ruc && !esValido(g.ruc)) avisos.push(`El RUC leído (${g.ruc}) no pasa la validación: revísalo.`);
    const suma = g.items.reduce((a, i) => a + (i.total ?? 0), 0);
    if (g.subtotal && suma && Math.abs(suma - g.subtotal) > 1) avisos.push('La suma de los ítems no coincide con el subtotal.');
    return { ...g, fuente: 'gemini', rucs_encontrados: g.ruc && esValido(g.ruc) ? [g.ruc] : [], avisos };
}

/** Junta las dos lecturas: si el texto halló un RUC válido único y Gemini otro, gana el del texto (y se avisa). */
export function combinar(texto: LecturaDocumento, gemini: LecturaDocumento): LecturaDocumento {
    const g = { ...gemini, avisos: [...gemini.avisos] };
    if (texto.ruc && texto.rucs_encontrados.length === 1 && g.ruc !== texto.ruc) {
        if (g.ruc) g.avisos.push(`Gemini leyó el RUC ${g.ruc}, pero en el texto aparece ${texto.ruc}: se usa el del texto.`);
        g.ruc = texto.ruc;
        g.rucs_encontrados = [texto.ruc];
    }
    for (const k of ['moneda', 'total', 'subtotal', 'igv', 'numero', 'fecha'] as const) if (g[k] == null && texto[k] != null) (g as Record<string, unknown>)[k] = texto[k];
    return g;
}

/** Cuando Gemini no está o falla: la lectura gratuita, con el aviso de por qué. */
export const sinGemini = (l: LecturaDocumento, motivo: string): LecturaDocumento => ({
    ...l,
    avisos: [...l.avisos, `No se leyó con Gemini (${motivo}). Revisa y completa los datos a mano.`],
});
