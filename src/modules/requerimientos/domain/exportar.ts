// Las columnas del Excel de Requerimientos, Validaciones y Seguimiento: las de cada tabla, un dato por columna (la
// sub-línea se desarma). Los montos (presupuesto) van con su moneda aparte y solo para quien ve precios. PURO.
import { fechaExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import type { Requerimiento } from './requerimiento.ts';
import { ETIQUETA_COMPRA, estadoCompra, type FilaSeguimiento } from './seguimiento.ts';
import type { ItemTecnica } from './validacion.ts';

export function columnasRequerimientos(nombreProyecto: (id: string | null) => string): ColumnaExcel<Requerimiento>[] {
    return [
        { titulo: 'Requerimiento', ancho: 16, valor: (r) => r.numero || 'En proceso, sin número' },
        { titulo: 'RQ del SIDIGE', ancho: 14, valor: (r) => r.rqSidige },
        { titulo: 'Proyecto', ancho: 32, valor: (r) => nombreProyecto(r.proyectoId) },
        { titulo: 'Motivo', ancho: 32, valor: (r) => r.motivo },
        { titulo: 'Tipo de compra', ancho: 16, valor: (r) => r.tipoCompra ?? '' },
        { titulo: 'Estado', ancho: 14, valor: (r) => r.estado },
        { titulo: 'Área emisora', ancho: 16, valor: (r) => r.areaEmisora },
        { titulo: 'Ítems', tipo: 'entero', valor: (r) => r.nItems },
        { titulo: 'Creado', tipo: 'fecha', valor: (r) => fechaExcel(r.creado) },
        { titulo: 'Emitido', tipo: 'fecha', valor: (r) => fechaExcel(r.fechaEmision) },
    ];
}

export function columnasTecnica(nombreProyecto: (id: string | null) => string, verMontos: boolean): ColumnaExcel<ItemTecnica>[] {
    const base: ColumnaExcel<ItemTecnica>[] = [
        { titulo: 'Requerimiento', ancho: 16, valor: (i) => i.req.numero || 'En proceso' },
        { titulo: 'Proyecto o motivo', ancho: 32, valor: (i) => nombreProyecto(i.req.proyectoId) || i.req.motivo },
        { titulo: 'N° ítem', tipo: 'entero', valor: (i) => i.nItem },
        { titulo: 'Descripción', ancho: 40, valor: (i) => i.descripcion },
        { titulo: 'Cantidad', tipo: 'numero', valor: (i) => i.cantidad },
        { titulo: 'Unidad', ancho: 8, valor: (i) => i.unidad },
        { titulo: 'Tipo', ancho: 12, valor: (i) => i.tipo },
        { titulo: 'Código cliente', ancho: 16, valor: (i) => i.codigoCliente },
        { titulo: 'SKU del SIDIGE', ancho: 14, valor: (i) => i.codigoSidige },
        { titulo: 'Canal', ancho: 12, valor: (i) => i.canal ?? '' },
        { titulo: 'Validación técnica', ancho: 18, valor: (i) => i.validacionTecnica },
        { titulo: 'Marca', ancho: 16, valor: (i) => i.marca },
        { titulo: 'Modelo', ancho: 16, valor: (i) => i.modelo },
        { titulo: 'Comentario técnico', ancho: 32, valor: (i) => i.tecMotivo },
        { titulo: 'Fecha meta', tipo: 'fecha', valor: (i) => fechaExcel(i.fechaMeta) },
    ];
    if (!verMontos) return base;
    return [
        ...base,
        { titulo: 'Presupuesto unitario', tipo: 'monto', valor: (i) => i.presupuestoUnit },
        { titulo: 'Moneda', ancho: 8, valor: (i) => (i.presupuestoUnit == null ? '' : (i.monedaPpto ?? '')) },
    ];
}

/** Seguimiento no lleva montos para nadie (seguimiento_items no los trae). */
export function columnasSeguimiento(): ColumnaExcel<FilaSeguimiento>[] {
    return [
        { titulo: 'Proyecto', ancho: 32, valor: (f) => f.proyecto || 'Administrativa' },
        { titulo: 'Requerimiento', ancho: 16, valor: (f) => f.requerimiento || 'En proceso' },
        { titulo: 'RQ del SIDIGE', ancho: 14, valor: (f) => f.rqSidige },
        { titulo: 'Descripción', ancho: 40, valor: (f) => f.descripcion },
        { titulo: 'Código cliente', ancho: 16, valor: (f) => f.codigoCliente },
        { titulo: 'SKU del SIDIGE', ancho: 14, valor: (f) => f.codigoSidige },
        { titulo: 'Validación técnica', ancho: 18, valor: (f) => f.validacionTecnica },
        { titulo: 'Marca', ancho: 16, valor: (f) => f.marca },
        { titulo: 'Modelo', ancho: 16, valor: (f) => f.modelo },
        { titulo: 'Cantidad', tipo: 'numero', valor: (f) => f.cantidad },
        { titulo: 'Por comprar', tipo: 'numero', valor: (f) => f.saldo },
        { titulo: 'Compra', ancho: 12, valor: (f) => ETIQUETA_COMPRA[estadoCompra(f)] },
        { titulo: 'Órdenes', ancho: 20, valor: (f) => f.ordenes },
        { titulo: 'Estado de la orden', ancho: 18, valor: (f) => f.estadoOrden },
        { titulo: 'Fecha meta', tipo: 'fecha', valor: (f) => fechaExcel(f.fechaMeta) },
    ];
}
