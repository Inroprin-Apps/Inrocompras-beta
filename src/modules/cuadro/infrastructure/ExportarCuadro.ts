// La descarga del cuadro: Excel (write-excel-file, cargada al usarse) y CSV. Solo E/S: qué va en cada columna y cómo
// se escribe lo decide el dominio (COLUMNAS_CUADRO, valorExcel, aCsv).
import { err, ok, type Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { ExportarPort } from '../application/ports/CuadroPort.ts';
import { aCsv, COLUMNAS_CUADRO, valorExcel, type FilaCuadro } from '../domain/cuadro.ts';

const FORMATO: Partial<Record<string, string>> = { moneda: '#,##0.00', pct: '0%', fecha: 'dd/mm/yyyy', entero: '0' };

export class ExportarCuadro implements ExportarPort {
    async excel(filas: FilaCuadro[], archivo: string): Promise<Result<null, ErrorFuente>> {
        try {
            const { default: writeXlsxFile } = await import('write-excel-file/browser');
            const titulos = COLUMNAS_CUADRO.map((c) => ({ value: c.titulo, fontWeight: 'bold' as const }));
            const datos = filas.map((r) =>
                COLUMNAS_CUADRO.map((c) => {
                    const v = valorExcel(c, r.valores[c.titulo]);
                    if (v === null) return null;
                    const format = FORMATO[c.tipo];
                    if (v instanceof Date) return { value: v, type: Date, format };
                    if (typeof v === 'number') return { value: v, type: Number, format };
                    if (typeof v === 'boolean') return { value: v, type: Boolean };
                    return { value: v, type: String };
                }),
            );
            await writeXlsxFile([titulos, ...datos], {
                sheet: 'Cuadro de aprobaciones',
                columns: COLUMNAS_CUADRO.map((c) => ({ width: c.ancho })),
                stickyRowsCount: 1,
            }).toFile(`${archivo}.xlsx`);
            return ok(null);
        } catch {
            return err({ kind: 'fuente', message: 'No se pudo armar el Excel. Inténtalo otra vez o descarga el CSV.' });
        }
    }

    csv(filas: FilaCuadro[], archivo: string): Result<null, ErrorFuente> {
        try {
            const blob = new Blob([aCsv(filas)], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${archivo}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return ok(null);
        } catch {
            return err({ kind: 'fuente', message: 'No se pudo armar el CSV. Inténtalo otra vez.' });
        }
    }
}
