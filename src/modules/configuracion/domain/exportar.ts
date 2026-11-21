// Las columnas del Excel de la cola de trabajos: las de la tabla (trabajo, estado, mensaje), con el número, la fecha,
// los intentos y el registro en su propia columna, para pasarle los errores a sistemas. PURO.
import { fechaExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import { etiquetaTipo, type TrabajoCola } from './configuracion.ts';

/** El día en Lima de un instante ISO (un registro creado a las 22:00 de Lima no pasa al día siguiente). */
const diaLima = (iso: string | null | undefined) =>
    iso ? fechaExcel(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(iso))) : null;

export function columnasCola(): ColumnaExcel<TrabajoCola>[] {
    return [
        { titulo: 'N°', tipo: 'entero', valor: (x) => x.id },
        { titulo: 'Trabajo', valor: (x) => etiquetaTipo(x.tipo), ancho: 28 },
        { titulo: 'Creado', tipo: 'fecha', valor: (x) => diaLima(x.creado) },
        { titulo: 'Estado', valor: (x) => x.estado, ancho: 12 },
        { titulo: 'Intentos', tipo: 'entero', valor: (x) => x.intentos },
        { titulo: 'Próximo intento', tipo: 'fecha', valor: (x) => (x.estado === 'Pendiente' ? diaLima(x.procesarDesde) : null), ancho: 14 },
        { titulo: 'Mensaje', valor: (x) => x.error ?? '', ancho: 60 },
        { titulo: 'Tabla', valor: (x) => x.refTabla ?? '', ancho: 18 },
        { titulo: 'Registro', valor: (x) => x.refId ?? '', ancho: 38 },
    ];
}
