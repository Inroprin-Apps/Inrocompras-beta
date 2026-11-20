// La carga masiva de ítems desde Excel (AppSheet: Carga_items). PURO: recibe las filas tal como las entrega el
// lector de Excel (texto, número, fecha o vacío por celda) y devuelve los `datos` que espera ac_carga_procesar.
// Aquí solo se ENTIENDE el archivo (títulos con o sin tildes, sinónimos, fechas de Excel, números con coma);
// si una fila es válida lo decide la base, que marca las filas con error con su mensaje.

/** Las claves de `carga_items.datos` que lee ac_carga_procesar (más fila_excel, para decir de qué fila es cada error). */
export type ClaveCarga =
    | 'tipo'
    | 'codigo_cliente'
    | 'descripcion'
    | 'detalle'
    | 'unidad'
    | 'cantidad'
    | 'plazo_adquisicion'
    | 'canal'
    | 'presupuesto_unit'
    | 'moneda_ppto'
    | 'referencia_link';

export interface ColumnaPlantilla {
    clave: ClaveCarga;
    titulo: string;
    ejemplo: string | number;
    ayuda: string;
    ancho: number;
}

/** Las columnas de la plantilla, en orden (docs/05 «Carga inicial»). */
export const COLUMNAS_PLANTILLA: ColumnaPlantilla[] = [
    { clave: 'tipo', titulo: 'Tipo', ejemplo: 'Bienes', ayuda: 'Bienes, Accesorios, Servicio o Muestra', ancho: 12 },
    { clave: 'codigo_cliente', titulo: 'Código cliente', ejemplo: 'EQU-001', ayuda: 'Código del ítem en el expediente del cliente', ancho: 16 },
    { clave: 'descripcion', titulo: 'Descripción', ejemplo: 'Taladro de banco 1/2 HP', ayuda: 'Obligatoria', ancho: 40 },
    { clave: 'detalle', titulo: 'Detalle', ejemplo: 'Con mandril de 16 mm', ayuda: 'Especificación técnica', ancho: 30 },
    { clave: 'unidad', titulo: 'Unidad', ejemplo: 'UND', ayuda: 'Por defecto UND', ancho: 10 },
    { clave: 'cantidad', titulo: 'Cantidad', ejemplo: 2, ayuda: 'Número mayor que cero', ancho: 10 },
    { clave: 'plazo_adquisicion', titulo: 'Plazo de adquisición', ejemplo: '15/03/2027', ayuda: 'Fecha dd/mm/aaaa, no pasada', ancho: 18 },
    { clave: 'canal', titulo: 'Canal', ejemplo: 'Nacional', ayuda: 'Nacional o Importación', ancho: 12 },
    { clave: 'presupuesto_unit', titulo: 'Presupuesto unitario', ejemplo: 1250.5, ayuda: 'Sin símbolo de moneda', ancho: 18 },
    { clave: 'moneda_ppto', titulo: 'Moneda', ejemplo: 'PEN', ayuda: 'PEN, USD o EUR', ancho: 10 },
    { clave: 'referencia_link', titulo: 'Referencia (link)', ejemplo: 'https://ejemplo.com/ficha', ayuda: 'Link a la ficha o foto', ancho: 28 },
];

/** Cómo puede venir escrito el título de cada columna (ya sin tildes, en minúsculas y con espacios simples). */
const SINONIMOS: Record<ClaveCarga, string[]> = {
    tipo: ['tipo', 'tipo item', 'tipo de item', 'tipo de bien', 'clase'],
    codigo_cliente: ['codigo cliente', 'codigo del cliente', 'cod cliente', 'codigo', 'cod', 'codigo item', 'item cliente', 'codigo expediente'],
    descripcion: ['descripcion', 'descripcion cliente', 'descripcion del item', 'producto', 'item', 'nombre', 'bien', 'denominacion'],
    detalle: ['detalle', 'especificacion', 'especificaciones', 'especificacion tecnica', 'especificaciones tecnicas', 'caracteristicas'],
    unidad: ['unidad', 'unidad medida', 'unidad de medida', 'um', 'u m', 'und', 'medida'],
    cantidad: ['cantidad', 'cant', 'qty', 'cantidad requerida', 'cantidad solicitada'],
    plazo_adquisicion: ['plazo de adquisicion', 'plazo adquisicion', 'plazo', 'fecha requerida', 'fecha de adquisicion', 'fecha limite', 'fecha meta', 'fecha', 'fecha necesaria'],
    canal: ['canal', 'origen', 'procedencia', 'tipo de compra', 'nacional importacion', 'nacional o importacion'],
    presupuesto_unit: ['presupuesto unitario', 'presupuesto', 'ppto unitario', 'ppto', 'precio unitario', 'costo unitario', 'pu', 'p u', 'valor unitario', 'presupuesto unit'],
    moneda_ppto: ['moneda', 'moneda presupuesto', 'moneda ppto', 'divisa'],
    referencia_link: ['referencia link', 'referencia', 'link', 'enlace', 'url', 'link referencia', 'link de referencia'],
};

/** Título normalizado: sin tildes, minúsculas, sin lo que va entre paréntesis y con separadores como espacio. */
export function normalizarTitulo(t: string): string {
    return t
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[°º]/g, ' ')
        .replace(/[_\-./:]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** A qué clave corresponde un título (o null si no se reconoce). Primero exacto; después sin lo que va entre paréntesis. */
export function claveDeTitulo(titulo: string): ClaveCarga | null {
    const t = normalizarTitulo(titulo);
    if (!t) return null;
    const sinParentesis = normalizarTitulo(titulo.replace(/\(.*?\)/g, ' '));
    for (const cand of [t, sinParentesis]) {
        for (const [clave, lista] of Object.entries(SINONIMOS) as [ClaveCarga, string[]][]) if (lista.includes(cand)) return clave;
    }
    return null;
}

/** Lo que puede traer una celda del lector de Excel. */
export type Celda = string | number | boolean | Date | null | undefined;

const dos = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${dos(m)}-${dos(d)}`;

function fechaValida(y: number, m: number, d: number): boolean {
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Excel guarda las fechas como días desde el 30/12/1899 (con el error del 29/02/1900 ya incluido). */
export function fechaDeSerial(n: number): string | null {
    if (!Number.isFinite(n) || n < 1 || n > 200000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86_400_000);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Una fecha en aaaa-mm-dd. Acepta: fecha del lector, número de serie de Excel, dd/mm/aaaa (o con guiones/puntos,
 * año de 2 cifras) y aaaa-mm-dd. Lo que no entiende lo devuelve tal cual (la base lo marca con error).
 */
export function normalizarFecha(v: Celda): string {
    if (v == null || v === '') return '';
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
    if (typeof v === 'number') return fechaDeSerial(v) ?? String(v);
    const t = String(v).trim();
    if (!t) return '';
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/.exec(t);
    if (m) return fechaValida(+m[1], +m[2], +m[3]) ? iso(+m[1], +m[2], +m[3]) : t;
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s.*)?$/.exec(t);
    if (m) {
        const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
        return fechaValida(y, +m[2], +m[1]) ? iso(y, +m[2], +m[1]) : t;
    }
    if (/^\d+(\.\d+)?$/.test(t)) return fechaDeSerial(Number(t)) ?? t;
    return t;
}

/**
 * Un número como texto con punto decimal: «1,234.50», «1.234,50», «12,5», «S/ 1 200», «US$ 30» → «1234.50», «1234.50»,
 * «12.5», «1200», «30». Lo que no es número se devuelve tal cual (la base lo marca con error).
 */
export function normalizarNumero(v: Celda): string {
    if (v == null || v === '') return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    if (typeof v === 'boolean' || v instanceof Date) return String(v);
    const original = String(v).trim();
    let t = original.replace(/(US\$|S\/\.?|\$|€|PEN|USD|EUR)/gi, '').replace(/[\s ]/g, '');
    if (!t) return '';
    const coma = t.lastIndexOf(',');
    const punto = t.lastIndexOf('.');
    if (coma >= 0 && punto >= 0) {
        // El que va al final es el decimal; el otro, separador de miles.
        t = coma > punto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    } else if (coma >= 0) {
        // «1,234» (tres cifras después y una sola coma) es miles; «12,5» es decimal.
        t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    } else if (punto >= 0 && /^\d{1,3}(\.\d{3}){2,}$/.test(t)) {
        t = t.replace(/\./g, '');
    }
    return /^-?\d+(\.\d+)?$/.test(t) ? t : original;
}

const plano = (t: string) => normalizarTitulo(t).replace(/\s/g, '');

export function normalizarTipo(v: Celda): string {
    const t = plano(String(v ?? ''));
    if (!t) return '';
    if (/^bien(es)?$/.test(t)) return 'Bienes';
    if (/^accesorios?$/.test(t)) return 'Accesorios';
    if (/^servicios?$/.test(t)) return 'Servicio';
    if (/^muestras?$/.test(t)) return 'Muestra';
    return String(v).trim();
}

export function normalizarCanal(v: Celda): string {
    const t = plano(String(v ?? ''));
    if (!t) return '';
    if (['nacional', 'nac', 'local', 'peru', 'n'].includes(t)) return 'Nacional';
    if (['importacion', 'importaciones', 'imp', 'importado', 'extranjero', 'internacional', 'i'].includes(t)) return 'Importación';
    return String(v).trim();
}

export function normalizarMoneda(v: Celda): string {
    const raw = String(v ?? '').trim();
    if (!raw) return '';
    if (raw.includes('€')) return 'EUR';
    const t = normalizarTitulo(raw).replace(/[^a-z$]/g, '');
    if (['pen', 's', 'sol', 'soles', 'nuevossoles'].includes(t)) return 'PEN';
    if (['usd', 'us$', '$', 'us', 'dolar', 'dolares', 'dolaresamericanos', 'usdolares'].includes(t)) return 'USD';
    if (['eur', 'euro', 'euros'].includes(t)) return 'EUR';
    return raw.toUpperCase();
}

function texto(v: Celda): string {
    if (v == null) return '';
    if (v instanceof Date) return normalizarFecha(v);
    return String(v).trim();
}

/** Una fila leída del Excel, lista para carga_items. */
export interface FilaLeida {
    /** Fila del Excel (1 = la primera), para decir dónde está cada error. */
    filaExcel: number;
    datos: Partial<Record<ClaveCarga, string>> & { fila_excel: string };
}

export interface Lectura {
    filas: FilaLeida[];
    /** Títulos que no se reconocieron (sus columnas se ignoran). */
    ignoradas: string[];
    /** Las columnas reconocidas: clave → título como venía. */
    columnas: Partial<Record<ClaveCarga, string>>;
}

export type ErrorLectura = { mensaje: string };

/**
 * Busca la fila de títulos (entre las 15 primeras: la primera con «Descripción» y otra columna conocida) y convierte
 * cada fila de abajo en `datos`. Las filas vacías se saltan. Las celdas vacías NO van en `datos` (la base pone
 * sus valores por defecto: tipo Bienes, unidad UND).
 */
export function leerFilas(hoja: Celda[][]): Lectura | ErrorLectura {
    let cabecera = -1;
    let mapa: (ClaveCarga | null)[] = [];
    for (let r = 0; r < Math.min(hoja.length, 15); r++) {
        const claves = (hoja[r] ?? []).map((c) => (c == null ? null : claveDeTitulo(String(c))));
        if (claves.includes('descripcion') && claves.filter(Boolean).length >= 2) {
            cabecera = r;
            mapa = claves;
            break;
        }
    }
    if (cabecera < 0) return { mensaje: 'No encontré la fila de títulos. Usa la plantilla: necesita al menos las columnas «Descripción» y «Cantidad».' };
    if (!mapa.includes('cantidad')) return { mensaje: 'Falta la columna «Cantidad». Usa la plantilla o agrega esa columna.' };

    const columnas: Partial<Record<ClaveCarga, string>> = {};
    const ignoradas: string[] = [];
    const usada = new Set<ClaveCarga>();
    mapa = mapa.map((k, i) => {
        const titulo = String(hoja[cabecera][i] ?? '').trim();
        if (!k) {
            if (titulo) ignoradas.push(titulo);
            return null;
        }
        if (usada.has(k)) {
            ignoradas.push(titulo);
            return null; // dos columnas para lo mismo: vale la primera
        }
        usada.add(k);
        columnas[k] = titulo;
        return k;
    });

    const filas: FilaLeida[] = [];
    for (let r = cabecera + 1; r < hoja.length; r++) {
        const fila = hoja[r] ?? [];
        const datos: FilaLeida['datos'] = { fila_excel: String(r + 1) };
        let algo = false;
        mapa.forEach((k, i) => {
            if (!k) return;
            const v = fila[i];
            const x =
                k === 'plazo_adquisicion'
                    ? normalizarFecha(v)
                    : k === 'cantidad' || k === 'presupuesto_unit'
                      ? normalizarNumero(v)
                      : k === 'tipo'
                        ? normalizarTipo(v)
                        : k === 'canal'
                          ? normalizarCanal(v)
                          : k === 'moneda_ppto'
                            ? normalizarMoneda(v)
                            : texto(v);
            if (x !== '') {
                datos[k] = x;
                algo = true;
            }
        });
        if (algo) filas.push({ filaExcel: r + 1, datos });
    }
    if (!filas.length) return { mensaje: 'El archivo no tiene filas debajo de los títulos.' };
    return { filas, ignoradas, columnas };
}

export const esErrorLectura = (x: Lectura | ErrorLectura): x is ErrorLectura => 'mensaje' in x;

/** La plantilla: la fila de títulos y una fila de ejemplo (para write-excel-file). */
export function filasPlantilla(): { titulos: string[]; ejemplo: (string | number)[]; anchos: number[] } {
    return {
        titulos: COLUMNAS_PLANTILLA.map((c) => c.titulo),
        ejemplo: COLUMNAS_PLANTILLA.map((c) => c.ejemplo),
        anchos: COLUMNAS_PLANTILLA.map((c) => c.ancho),
    };
}

/** Cómo se lee una fila de carga en pantalla: «Fila 7 · Taladro de banco». */
export const etiquetaFila = (datos: Record<string, string>, nFila: number) =>
    `Fila ${datos.fila_excel ?? nFila}${datos.descripcion ? ` · ${datos.descripcion}` : ''}`;
