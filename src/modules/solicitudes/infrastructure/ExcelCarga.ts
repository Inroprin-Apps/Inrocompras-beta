// El archivo Excel de la carga masiva: leerlo (read-excel-file) y armar la plantilla (write-excel-file).
// Solo E/S: qué significa cada columna lo decide el dominio (domain/carga.ts). Las librerías se cargan al usarse.
import { err, ok, type Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import { filasPlantilla, type Celda } from '../domain/carga.ts';

/** La primera hoja del archivo, celda por celda (texto, número, fecha o vacío). */
export async function leerHoja(archivo: File): Promise<Result<Celda[][], ErrorFuente>> {
    if (!/\.xlsx$/i.test(archivo.name)) return err({ kind: 'regla', message: 'Sube un archivo .xlsx (Excel). Si lo tienes en .xls o .csv, guárdalo como .xlsx.' });
    try {
        const { readSheet } = await import('read-excel-file/browser');
        const filas = (await readSheet(archivo)) as unknown as Celda[][];
        return ok(filas);
    } catch {
        return err({ kind: 'fuente', message: 'No pude leer el archivo. Revisa que sea un Excel .xlsx que se abra bien y vuelve a subirlo.' });
    }
}

/** Descarga la plantilla: títulos en negrita, una fila de ejemplo y anchos cómodos. */
export async function descargarPlantilla(): Promise<Result<null, ErrorFuente>> {
    try {
        const { default: writeXlsxFile } = await import('write-excel-file/browser');
        const { titulos, ejemplo, anchos } = filasPlantilla();
        await writeXlsxFile(
            [titulos.map((value) => ({ value, fontWeight: 'bold' as const })), ejemplo],
            { sheet: 'Items', columns: anchos.map((width) => ({ width })), stickyRowsCount: 1 },
        ).toFile('plantilla-items-solicitud.xlsx');
        return ok(null);
    } catch {
        return err({ kind: 'fuente', message: 'No se pudo armar la plantilla. Inténtalo otra vez.' });
    }
}
