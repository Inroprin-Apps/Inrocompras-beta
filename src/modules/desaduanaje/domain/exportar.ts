// Las columnas del Excel de Desaduanaje: las de la tabla, con la sub-línea y cada fecha en su propia columna. El FI
// (que deja ver la relación costo/EXW) solo va para quien ve precios. PURO.
import { fechaExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import type { Desaduanaje } from './desaduanaje.ts';
import { nombreDes } from './lista.ts';

export function columnasDes(vePrecios: boolean): ColumnaExcel<Desaduanaje>[] {
    const cols: ColumnaExcel<Desaduanaje>[] = [
        { titulo: 'Desaduanaje', valor: (d) => nombreDes(d), ancho: 18 },
        { titulo: 'Tipo', valor: (d) => d.tipo, ancho: 10 },
        { titulo: 'Alcance', valor: (d) => d.alcance, ancho: 10 },
        { titulo: 'N° de DAM', valor: (d) => d.nDam, ancho: 20 },
        { titulo: 'BL / AWB', valor: (d) => d.blAwb, ancho: 18 },
        { titulo: 'OC', valor: (d) => d.ordenNumero, ancho: 16 },
        { titulo: 'Proveedor', valor: (d) => d.proveedor, ancho: 32 },
        { titulo: 'Proyecto', valor: (d) => d.proyecto },
        { titulo: 'Estado', valor: (d) => d.estado, ancho: 20 },
        { titulo: 'Versión del costeo', tipo: 'entero', valor: (d) => d.versionCosteo || null, ancho: 10 },
        { titulo: 'Embarque', tipo: 'fecha', valor: (d) => fechaExcel(d.fechaEmbarque) },
        { titulo: 'Llegada estimada', tipo: 'fecha', valor: (d) => fechaExcel(d.fechaLlegadaEst) },
        { titulo: 'Numeración', tipo: 'fecha', valor: (d) => fechaExcel(d.fechaNumeracion) },
        { titulo: 'Llegada', tipo: 'fecha', valor: (d) => fechaExcel(d.fechaLlegada) },
        { titulo: 'Levante', tipo: 'fecha', valor: (d) => fechaExcel(d.fechaLevante) },
        { titulo: 'Ingreso a almacén', tipo: 'fecha', valor: (d) => fechaExcel(d.fechaAlmacen) },
    ];
    if (vePrecios) cols.push({ titulo: 'FI', tipo: 'numero', valor: (d) => d.fi, ancho: 10 });
    return cols;
}
