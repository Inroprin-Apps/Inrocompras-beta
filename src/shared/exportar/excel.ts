// Exportar una lista a Excel: lo que se ve, con los filtros puestos (guía, «Listado»). Cada pantalla dice sus columnas
// (título, tipo y cómo sacar el valor de una fila); esto solo escribe el archivo (write-excel-file, cargado al usarse).
// Los montos van como número con su formato y la moneda en su propia columna, para que en Excel se puedan sumar.
import { err, ok, type Result } from 'neverthrow';
import type { ErrorFuente } from '../errores.ts';

export type TipoColumna = 'texto' | 'monto' | 'numero' | 'entero' | 'fecha' | 'pct';
export interface ColumnaExcel<T> {
    titulo: string;
    tipo?: TipoColumna;
    /** Ancho en caracteres (por defecto, según el tipo). */
    ancho?: number;
    valor: (fila: T) => string | number | Date | boolean | null | undefined;
}

const FORMATO: Partial<Record<TipoColumna, string>> = { monto: '#,##0.00', numero: '#,##0.###', entero: '0', fecha: 'dd/mm/yyyy', pct: '0%' };
const ANCHO: Record<TipoColumna, number> = { texto: 24, monto: 14, numero: 12, entero: 8, fecha: 12, pct: 8 };

/** Una fecha ISO (aaaa-mm-dd o con hora) como Date de Excel, sin correrse de día por la zona horaria. */
export function fechaExcel(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
    return a && m && d ? new Date(Date.UTC(a, m - 1, d)) : null;
}

/** «Órdenes 2026-11-21»: el nombre del archivo con la fecha de Lima. */
export function nombreArchivo(base: string): string {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
    return `${base} ${hoy}`;
}

export async function exportarExcel<T>(base: string, columnas: readonly ColumnaExcel<T>[], filas: readonly T[]): Promise<Result<null, ErrorFuente>> {
    try {
        const { default: writeXlsxFile } = await import('write-excel-file/browser');
        const titulos = columnas.map((c) => ({ value: c.titulo, fontWeight: 'bold' as const }));
        const datos = filas.map((r) =>
            columnas.map((c) => {
                const v = c.valor(r);
                if (v === null || v === undefined || v === '') return null;
                const format = FORMATO[c.tipo ?? 'texto'];
                if (v instanceof Date) return { value: v, type: Date, format: format ?? 'dd/mm/yyyy' };
                if (typeof v === 'number') return Number.isFinite(v) ? { value: v, type: Number, format } : null;
                if (typeof v === 'boolean') return { value: v ? 'Sí' : 'No', type: String };
                return { value: v, type: String };
            }),
        );
        await writeXlsxFile([titulos, ...datos], {
            sheet: base.slice(0, 31),
            columns: columnas.map((c) => ({ width: c.ancho ?? ANCHO[c.tipo ?? 'texto'] })),
            stickyRowsCount: 1,
        }).toFile(`${nombreArchivo(base)}.xlsx`);
        return ok(null);
    } catch {
        return err({ kind: 'fuente', message: 'No se pudo armar el Excel. Inténtalo otra vez en un momento.' });
    }
}
