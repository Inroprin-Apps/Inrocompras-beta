// Validación técnica de ítems (C-16): Técnica registra marca y modelo, observa con motivo o marca «No aplica».
// PURO: agrupación por requerimiento, filtros y el formulario. Quién valida lo decide ac_item_tecnica.
import type { ItemRequerimiento, Validacion } from './requerimiento.ts';
import { palabrasDe, plano } from '@/shared/texto.ts';

export interface ItemTecnica extends ItemRequerimiento {
    req: { id: string; numero: string; motivo: string; estado: string; proyectoId: string | null };
}

export interface FiltrosTecnica {
    estado: '' | Validacion;
    proyecto: string;
    texto: string;
}
export const FILTROS_TECNICA: FiltrosTecnica = { estado: 'Pendiente', proyecto: '', texto: '' };

export function filtrarTecnica(lista: ItemTecnica[], f: FiltrosTecnica, nombreProyecto?: (id: string | null) => string): ItemTecnica[] {
    const palabras = palabrasDe(f.texto);
    return lista.filter((i) => {
        if (f.estado && i.validacionTecnica !== f.estado) return false;
        if (f.proyecto && i.req.proyectoId !== f.proyecto) return false;
        if (!palabras.length) return true;
        const t = plano(
            `${i.descripcion} ${i.codigoCliente} ${i.codigoSidige} ${i.marca} ${i.modelo} ${i.req.numero} ${i.req.motivo} ${nombreProyecto?.(i.req.proyectoId) ?? ''}`,
        );
        return palabras.every((w) => t.includes(w));
    });
}

/** Los ítems agrupados por requerimiento (el más antiguo primero); dentro, por N° de ítem. */
export function agruparPorRequerimiento(items: ItemTecnica[]): { req: ItemTecnica['req']; items: ItemTecnica[] }[] {
    const g = new Map<string, { req: ItemTecnica['req']; items: ItemTecnica[] }>();
    for (const i of items) {
        if (!g.has(i.req.id)) g.set(i.req.id, { req: i.req, items: [] });
        g.get(i.req.id)!.items.push(i);
    }
    const grupos = [...g.values()];
    for (const x of grupos) x.items.sort((a, b) => (a.nItem ?? 1e9) - (b.nItem ?? 1e9));
    return grupos.sort((a, b) => (a.req.numero || '~').localeCompare(b.req.numero || '~', 'es', { numeric: true }));
}

export type ResultadoTecnica = Exclude<Validacion, 'Pendiente'>;
export const RESULTADOS_TECNICA: ResultadoTecnica[] = ['Validado', 'Observado', 'No aplica'];

export interface FormTecnica {
    resultado: ResultadoTecnica;
    marca: string;
    modelo: string;
    motivo: string;
}
export const TECNICA_VACIA: FormTecnica = { resultado: 'Validado', marca: '', modelo: '', motivo: '' };

/** Qué falta para registrar la validación (en palabras), o null. Validado pide marca o modelo; Observado, el motivo. */
export function faltaEnTecnica(f: FormTecnica): string | null {
    if (f.resultado === 'Validado' && !f.marca.trim() && !f.modelo.trim()) return 'Escribe la marca y el modelo validados (al menos uno).';
    if (f.resultado === 'Observado' && !f.motivo.trim()) return 'Escribe qué observas: lo lee Planeamiento.';
    return null;
}

/** Los parámetros de ac_item_tecnica (lo vacío va como null: no borra la marca o el modelo que ya había). */
export function paramsTecnica(itemId: string, f: FormTecnica): Record<string, unknown> {
    const t = (x: string) => x.trim() || null;
    return {
        p_item: itemId,
        p_resultado: f.resultado,
        p_marca: f.resultado === 'Validado' ? t(f.marca) : null,
        p_modelo: f.resultado === 'Validado' ? t(f.modelo) : null,
        p_motivo: t(f.motivo),
    };
}
