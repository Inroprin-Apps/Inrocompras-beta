// Cuadro de aprobaciones (la hoja OC del AppSheet) y la bandeja de aprobación del celular. PURO.
// Las 35 columnas salen de la vista public.v_cuadro_aprobaciones (0040), con sus nombres exactos y en su orden:
// la pantalla y la exportación usan este mismo arreglo. D-05: faltan 2 columnas por confirmar contra la hoja real.

export type TipoColumna = 'texto' | 'numero' | 'moneda' | 'fecha' | 'si_no' | 'pct' | 'url' | 'entero';

export interface ColumnaCuadro {
    /** El nombre exacto de la columna (el de la hoja y el de la vista). */
    titulo: string;
    tipo: TipoColumna;
    /** Ancho en caracteres para el Excel y la tabla. */
    ancho: number;
}

export const COLUMNAS_CUADRO = [
    { titulo: 'VB C. GESTION', tipo: 'si_no', ancho: 10 },
    { titulo: 'OC', tipo: 'texto', ancho: 24 },
    { titulo: 'Estatus Compra', tipo: 'texto', ancho: 20 },
    { titulo: 'Comprador', tipo: 'texto', ancho: 20 },
    { titulo: 'N° Requerimiento', tipo: 'texto', ancho: 18 },
    { titulo: 'Procedencia', tipo: 'texto', ancho: 12 },
    { titulo: 'Unidad de negocio', tipo: 'texto', ancho: 16 },
    { titulo: 'Fecha', tipo: 'fecha', ancho: 12 },
    { titulo: 'Proveedor', tipo: 'texto', ancho: 30 },
    { titulo: 'Proyecto', tipo: 'texto', ancho: 30 },
    { titulo: 'Concepto', tipo: 'texto', ancho: 18 },
    { titulo: 'Link de la carpeta OC', tipo: 'url', ancho: 30 },
    { titulo: 'Monto', tipo: 'moneda', ancho: 14 },
    { titulo: 'Moneda original', tipo: 'texto', ancho: 10 },
    { titulo: 'Monto en Soles', tipo: 'moneda', ancho: 14 },
    { titulo: 'Tipo de aprobación', tipo: 'texto', ancho: 20 },
    { titulo: 'Forma de pago', tipo: 'texto', ancho: 16 },
    { titulo: '% adelanto', tipo: 'pct', ancho: 10 },
    { titulo: 'Días de crédito', tipo: 'entero', ancho: 10 },
    { titulo: 'Condición', tipo: 'texto', ancho: 10 },
    { titulo: 'Aprobación Ppto', tipo: 'texto', ancho: 18 },
    { titulo: 'Aprobación GOP', tipo: 'texto', ancho: 14 },
    { titulo: 'Aprobación GAF', tipo: 'texto', ancho: 14 },
    { titulo: 'Check Aprobació', tipo: 'si_no', ancho: 10 },
    { titulo: 'Check Control Gestión', tipo: 'si_no', ancho: 10 },
    { titulo: 'Estado de Aprobación3', tipo: 'texto', ancho: 20 },
    { titulo: 'Observación finanzas', tipo: 'texto', ancho: 14 },
    { titulo: 'Criterio de observación finanzas', tipo: 'texto', ancho: 28 },
    { titulo: 'LEGAJO PARA PAGO', tipo: 'si_no', ancho: 10 },
    { titulo: 'OC CERRADA', tipo: 'si_no', ancho: 10 },
    { titulo: 'Cuadro de pagos', tipo: 'texto', ancho: 40 },
    { titulo: 'Comentarios compras', tipo: 'texto', ancho: 24 },
    { titulo: 'UBICACIÓN', tipo: 'texto', ancho: 20 },
    { titulo: 'SUSTENTO DEL EXCESO PARA LA BD', tipo: 'texto', ancho: 28 },
    { titulo: 'Concatenado', tipo: 'texto', ancho: 50 },
] as const satisfies readonly ColumnaCuadro[];

export type TituloCuadro = (typeof COLUMNAS_CUADRO)[number]['titulo'];
export type Valor = string | number | boolean | null;

/** Una fila del cuadro: el id de la orden, la empresa (para filtrar) y los 35 valores por su título exacto. */
export interface FilaCuadro {
    id: string;
    empresaId: string;
    valores: Record<TituloCuadro, Valor>;
}

const txt = (v: Valor) => (v == null ? '' : String(v));

// ── Filtros (en la URL) ──
export interface FiltrosCuadro {
    estatus: string;
    aprobacion: string;
    procedencia: string;
    empresa: string;
    desde: string;
    hasta: string;
    texto: string;
}
export const FILTROS_CUADRO: FiltrosCuadro = { estatus: '', aprobacion: '', procedencia: '', empresa: '', desde: '', hasta: '', texto: '' };

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarCuadro(filas: FilaCuadro[], f: FiltrosCuadro): FilaCuadro[] {
    const palabras = plano(f.texto).split(/\s+/).filter(Boolean);
    return filas.filter((r) => {
        const v = r.valores;
        if (f.estatus && v['Estatus Compra'] !== f.estatus) return false;
        if (f.aprobacion && !txt(v['Estado de Aprobación3']).startsWith(f.aprobacion)) return false;
        if (f.procedencia && v['Procedencia'] !== f.procedencia) return false;
        if (f.empresa && r.empresaId !== f.empresa) return false;
        const fecha = txt(v['Fecha']);
        if (f.desde && fecha < f.desde) return false;
        if (f.hasta && fecha > f.hasta) return false;
        if (!palabras.length) return true;
        const t = plano([v['OC'], v['Proveedor'], v['Proyecto'], v['Comprador'], v['N° Requerimiento'], v['Concepto']].map(txt).join(' '));
        return palabras.every((w) => t.includes(w));
    });
}

/** Las más recientes primero (por fecha y luego por número). */
export function ordenarCuadro(filas: FilaCuadro[]): FilaCuadro[] {
    return [...filas].sort((a, b) => txt(b.valores['Fecha']).localeCompare(txt(a.valores['Fecha'])) || txt(b.valores['OC']).localeCompare(txt(a.valores['OC']), 'es', { numeric: true }));
}

/** Valores distintos de una columna (para las opciones de un filtro). */
export const distintos = (filas: FilaCuadro[], t: TituloCuadro) => [...new Set(filas.map((r) => txt(r.valores[t])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

// ── Presentación ──
const num = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Cómo se ve una celda en la tabla de la pantalla. */
export function textoCelda(c: ColumnaCuadro, v: Valor): string {
    if (v == null || v === '') return '';
    if (c.tipo === 'si_no') return v === true ? 'Sí' : v === false ? 'No' : String(v);
    if (c.tipo === 'moneda') return num.format(Number(v));
    if (c.tipo === 'pct') return `${Math.round(Number(v) * 10000) / 100} %`;
    if (c.tipo === 'fecha') {
        const [y, m, d] = String(v).slice(0, 10).split('-');
        return d ? `${d}/${m}/${y}` : String(v);
    }
    return String(v);
}

// ── Exportación ──
/** El valor tal como va al Excel (número, fecha, sí/no como VERDADERO/FALSO; el resto texto). */
export function valorExcel(c: ColumnaCuadro, v: Valor): Valor | Date {
    if (v == null || v === '') return null;
    if (c.tipo === 'moneda' || c.tipo === 'pct' || c.tipo === 'entero') return Number(v);
    if (c.tipo === 'fecha') return new Date(`${String(v).slice(0, 10)}T00:00:00Z`);
    if (c.tipo === 'si_no') return Boolean(v);
    return String(v);
}

const celdaCsv = (t: string) => (/[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
/** CSV (coma, UTF-8 con BOM para que Excel lea las tildes) con los encabezados exactos. */
export function aCsv(filas: FilaCuadro[]): string {
    const lineas = [COLUMNAS_CUADRO.map((c) => celdaCsv(c.titulo)).join(',')];
    for (const r of filas) {
        lineas.push(
            COLUMNAS_CUADRO.map((c) => {
                const v = r.valores[c.titulo];
                if (v == null) return '';
                if (c.tipo === 'si_no') return v ? 'TRUE' : 'FALSE';
                return celdaCsv(String(v));
            }).join(','),
        );
    }
    return '﻿' + lineas.join('\r\n') + '\r\n';
}

/** «cuadro-aprobaciones-2026-11-20». */
export const nombreArchivo = (hoy: string) => `cuadro-aprobaciones-${hoy}`;

// ── Aprobar desde el celular ──
export interface FirmaTarjeta {
    valor: string | null;
    por: string | null;
    fecha: string | null;
}
export interface DemasiaPendiente {
    id: string;
    descripcion: string;
    cantidad: number;
    subtotal: number;
    motivo: string;
}
/** Una orden que espera la firma de la persona (CG, GOP o GAF), lista para la tarjeta. */
export interface OrdenPorAprobar {
    id: string;
    numero: string;
    proveedor: string;
    proyecto: string;
    compradorId: string;
    moneda: string;
    monto: number;
    montoSoles: number;
    tipoAprobacion: string | null;
    estadoAprobacion: string | null;
    aprobacionPpto: string | null;
    ppto: FirmaTarjeta;
    gop: FirmaTarjeta;
    gaf: FirmaTarjeta;
    demasias: DemasiaPendiente[];
    fechaEmision: string | null;
    lineas: number;
}

/** Firmas que ya están (para «quién ya firmó»), en el orden de la ruta. */
export function yaFirmaron(o: OrdenPorAprobar): { quien: string; valor: string; por: string | null; fecha: string | null }[] {
    const out: { quien: string; valor: string; por: string | null; fecha: string | null }[] = [];
    if (o.ppto.por && o.ppto.valor) out.push({ quien: 'Control de Gestión', valor: o.ppto.valor, por: o.ppto.por, fecha: o.ppto.fecha });
    if (o.gop.valor) out.push({ quien: 'GOP', valor: o.gop.valor, por: o.gop.por, fecha: o.gop.fecha });
    if (o.gaf.valor) out.push({ quien: 'GAF', valor: o.gaf.valor, por: o.gaf.por, fecha: o.gaf.fecha });
    return out;
}

/** «Única: basta la GOP» / «Conjunta: GOP y GAF». */
export function textoRuta(t: string | null): string {
    if (t === 'Aprobación Única') return 'Ruta única: basta la GOP';
    if (t === 'Aprobación Conjunta') return 'Ruta conjunta: GOP y GAF';
    if (t === 'Pre Aprobado') return 'Pre aprobada';
    return t ?? 'Ruta por definir';
}

/** Ordena la bandeja: lo más antiguo primero (lo que más espera). */
export function ordenarPorAprobar(lista: OrdenPorAprobar[], desde: ReadonlyMap<string, string | null>): OrdenPorAprobar[] {
    return [...lista].sort((a, b) => (desde.get(a.id) ?? a.fechaEmision ?? '').localeCompare(desde.get(b.id) ?? b.fechaEmision ?? ''));
}
