// Lista de desaduanajes: filtros, orden y textos de la fila. PURO.
import type { Desaduanaje, EstadoDes, OcElegible, TipoDes } from './desaduanaje.ts';
import { palabrasDe, plano } from '@/shared/texto.ts';

// ───────────────────────── Lista: filtros y orden ─────────────────────────
export interface FiltrosDes {
    estado: '' | EstadoDes | 'abiertos';
    tipo: '' | TipoDes;
    texto: string;
}
export const FILTROS_DES: FiltrosDes = { estado: '', tipo: '', texto: '' };

export function filtrarDes(lista: readonly Desaduanaje[], f: FiltrosDes): Desaduanaje[] {
    const palabras = palabrasDe(f.texto);
    return lista.filter((d) => {
        if (f.estado === 'abiertos' ? d.estado === 'Costeo cerrado' : f.estado && d.estado !== f.estado) return false;
        if (f.tipo && d.tipo !== f.tipo) return false;
        if (!palabras.length) return true;
        const t = plano(`${d.numero} ${d.romano} ${d.ordenNumero} ${d.proveedor} ${d.proyecto} ${d.nDam} ${d.blAwb}`);
        return palabras.every((w) => t.includes(w));
    });
}

export type OrdenDes = 'recientes' | 'numero' | 'llegada';
export function ordenarDes(lista: readonly Desaduanaje[], o: OrdenDes): Desaduanaje[] {
    const c = [...lista];
    if (o === 'numero') return c.sort((a, b) => b.numero.localeCompare(a.numero, 'es', { numeric: true }));
    if (o === 'llegada') {
        const f = (d: Desaduanaje) => d.fechaLlegada ?? d.fechaLlegadaEst ?? '9999';
        return c.sort((a, b) => f(a).localeCompare(f(b)));
    }
    return c.sort((a, b) => b.creado.localeCompare(a.creado));
}

/** «DES-2026-0001 (I)». */
export const nombreDes = (d: { numero: string; romano: string }) => `${d.numero || 'Desaduanaje'}${d.romano ? ` (${d.romano})` : ''}`;

/** La fecha más relevante del estado actual, para la lista. */
export function fechaDelEstado(d: Desaduanaje): { etiqueta: string; fecha: string | null } {
    if (d.fechaAlmacen) return { etiqueta: 'En almacén', fecha: d.fechaAlmacen };
    if (d.fechaLevante) return { etiqueta: 'Levante', fecha: d.fechaLevante };
    if (d.fechaLlegada) return { etiqueta: 'Llegó', fecha: d.fechaLlegada };
    if (d.fechaLlegadaEst) return { etiqueta: 'Llegada estimada', fecha: d.fechaLlegadaEst };
    if (d.fechaEmbarque) return { etiqueta: 'Embarque', fecha: d.fechaEmbarque };
    return { etiqueta: '', fecha: null };
}

export function filtrarOcs(lista: readonly OcElegible[], texto: string): OcElegible[] {
    const palabras = palabrasDe(texto);
    if (!palabras.length) return [...lista];
    return lista.filter((o) => {
        const t = plano(`${o.numero} ${o.proveedor} ${o.proyecto}`);
        return palabras.every((w) => t.includes(w));
    });
}
