// Seguimiento de ítems SIN montos (C-18): lo que devuelve seguimiento_items(). Para Técnica, Planeamiento, Almacén,
// Comercial y los solicitantes: qué es, si tiene OC, en qué estado y si está pagado. PURO.

import { palabrasDe, plano } from '@/shared/texto.ts';

export interface FilaSeguimiento {
    itemId: string;
    proyecto: string;
    requerimiento: string;
    rqSidige: string;
    codigoCliente: string;
    codigoSidige: string;
    descripcion: string;
    cantidad: number;
    saldo: number;
    validacionTecnica: string;
    marca: string;
    modelo: string;
    ordenes: string;
    estadoOrden: string;
    fechaMeta: string | null;
    pagado: boolean;
}

export const ESTADOS_COMPRA = ['por_comprar', 'con_oc', 'pagado'] as const;
export type EstadoCompra = (typeof ESTADOS_COMPRA)[number];
export const ETIQUETA_COMPRA: Record<EstadoCompra, string> = { por_comprar: 'Por comprar', con_oc: 'Con OC', pagado: 'Pagado' };

export const estadoCompra = (f: FilaSeguimiento): EstadoCompra => (f.pagado ? 'pagado' : f.ordenes ? 'con_oc' : 'por_comprar');

export interface FiltrosSeguimiento {
    proyecto: string;
    estado: '' | EstadoCompra;
    texto: string;
}
export const FILTROS_SEGUIMIENTO: FiltrosSeguimiento = { proyecto: '', estado: '', texto: '' };

/** El proyecto se filtra en la base (parámetro de seguimiento_items); aquí, el estado y el texto. */
export function filtrarSeguimiento(lista: FilaSeguimiento[], f: Pick<FiltrosSeguimiento, 'estado' | 'texto'>): FilaSeguimiento[] {
    const palabras = palabrasDe(f.texto);
    return lista.filter((x) => {
        if (f.estado && estadoCompra(x) !== f.estado) return false;
        if (!palabras.length) return true;
        const t = plano(
            `${x.descripcion} ${x.codigoCliente} ${x.codigoSidige} ${x.requerimiento} ${x.rqSidige} ${x.ordenes} ${x.proyecto} ${x.marca} ${x.modelo}`,
        );
        return palabras.every((w) => t.includes(w));
    });
}

export function contarPorEstado(lista: FilaSeguimiento[]): Record<EstadoCompra, number> {
    const r: Record<EstadoCompra, number> = { por_comprar: 0, con_oc: 0, pagado: 0 };
    for (const x of lista) r[estadoCompra(x)]++;
    return r;
}

/** Orden: por proyecto, requerimiento y descripción. */
export const ordenarSeguimiento = (l: FilaSeguimiento[]) =>
    [...l].sort(
        (a, b) =>
            a.proyecto.localeCompare(b.proyecto, 'es') ||
            a.requerimiento.localeCompare(b.requerimiento, 'es', { numeric: true }) ||
            a.descripcion.localeCompare(b.descripcion, 'es'),
    );
