// Las columnas del Excel de Pagos: las de la tabla, con cada sub-línea en su propia columna y la moneda aparte de los
// montos (para que en Excel se puedan sumar). PURO: la pantalla pasa la lista ya filtrada y ordenada.
import { fechaExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import { diaPago, formatoCuota, vencida, type Pago } from './pago.ts';

export function columnasPago(hoy: string): ColumnaExcel<Pago>[] {
    return [
        { titulo: 'Orden', valor: (p) => p.ordenNumero, ancho: 16 },
        { titulo: 'Proveedor', valor: (p) => p.proveedor, ancho: 32 },
        { titulo: 'Cuota', valor: (p) => formatoCuota(p.nCuota), ancho: 8 },
        { titulo: 'Tipo', valor: (p) => p.tipo, ancho: 14 },
        { titulo: '% de la orden', tipo: 'pct', valor: (p) => p.porcentaje, ancho: 10 },
        { titulo: 'Factura', valor: (p) => p.factura?.numero ?? '', ancho: 16 },
        { titulo: 'Hito', valor: (p) => p.hito, ancho: 24 },
        { titulo: 'Moneda', valor: (p) => p.moneda, ancho: 8 },
        { titulo: 'Monto', tipo: 'monto', valor: (p) => p.monto },
        { titulo: 'Monto en soles', tipo: 'monto', valor: (p) => p.montoSoles },
        { titulo: 'Retención', tipo: 'monto', valor: (p) => (p.aplicaRetencion ? p.retencion : null) },
        { titulo: 'Neto', tipo: 'monto', valor: (p) => p.neto ?? p.monto - p.retencion },
        { titulo: 'Fecha límite', tipo: 'fecha', valor: (p) => fechaExcel(p.fechaLimite) },
        { titulo: 'Vencida', valor: (p) => vencida(p, hoy), ancho: 8 },
        { titulo: 'Programada para', tipo: 'fecha', valor: (p) => fechaExcel(p.fechaProgramada) },
        { titulo: 'Pagada', tipo: 'fecha', valor: (p) => fechaExcel(diaPago(p)) },
        { titulo: 'Estado', valor: (p) => p.estado, ancho: 18 },
        { titulo: 'N° de operación', valor: (p) => p.nOperacion, ancho: 16 },
        { titulo: 'Referencia InroPay', valor: (p) => p.inropayRef, ancho: 18 },
    ];
}
