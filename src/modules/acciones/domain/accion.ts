// Una acción que la persona puede hacer sobre un registro, tal como la devuelve
// public.acciones_disponibles(tabla, id). PURO: sin React, sin Supabase.
// tipo: 'p' principal (un solo botón azul), 's' secundaria, 'd' peligro (pide confirmar).
// pide: los campos que la UI debe pedir antes de llamar a la función (o fijar con `valor`).

export type TipoAccion = 'p' | 's' | 'd';
export type TipoCampo = 'texto' | 'opcion' | 'fecha' | 'numero' | 'correo' | 'documento';

export interface Campo {
    campo: string;
    tipo?: TipoCampo;
    opciones?: string[];
    opcional?: boolean;
    /** Valor fijo (p. ej. p_aprobar: true) o sugerido (p_correo: el del proveedor). */
    valor?: unknown;
}

export interface Accion {
    accion: string;
    etiqueta: string;
    tipo: TipoAccion;
    funcion: string;
    pide: Campo[];
}

/** Un campo con `valor` y sin `tipo` va fijo: no se le pregunta a la persona. */
export const esFijo = (c: Campo) => c.tipo === undefined && c.valor !== undefined;
export const preguntables = (a: Accion) => a.pide.filter((c) => !esFijo(c));
/** Se abre el diálogo si hay algo que preguntar o si es peligrosa (siempre confirma). */
export const necesitaDialogo = (a: Accion) => a.tipo === 'd' || preguntables(a).length > 0;

const ETIQUETAS: Record<string, string> = {
    p_motivo: 'Motivo',
    p_ppto: 'Estado del presupuesto',
    p_correo: 'Correo del proveedor',
    p_fecha: 'Fecha',
    p_n_operacion: 'N° de operación',
    p_voucher: 'Voucher',
    p_sustento: 'Sustento (si no hay factura)',
    p_detalle: 'Detalle',
    p_monto: 'Monto',
    p_n_dam: 'N° de DAM',
    p_tipo: 'Tipo',
    p_alcance: 'Alcance',
    p_rq: 'N° de RQ del SIDIGE',
    p_nota: 'Nota',
    p_agente: 'Agente de retención',
    p_buen_contribuyente: 'Buen contribuyente',
};
export const etiquetaCampo = (c: Campo) => ETIQUETAS[c.campo] ?? c.campo.replace(/^p_/, '').replace(/_/g, ' ');

/** Valores iniciales del formulario: el sugerido si viene, si no vacío. */
export function valoresIniciales(a: Accion): Record<string, string> {
    const v: Record<string, string> = {};
    for (const c of preguntables(a)) v[c.campo] = c.valor == null ? '' : String(c.valor);
    return v;
}

/** Qué falta llenar (en palabras), o null si está completo. */
export function faltante(a: Accion, valores: Record<string, string>): string | null {
    for (const c of preguntables(a)) {
        const x = (valores[c.campo] ?? '').trim();
        if (!c.opcional && !x) return `Completa: ${etiquetaCampo(c).toLowerCase()}.`;
        if (x && c.tipo === 'numero' && !Number.isFinite(Number(x.replace(',', '.')))) return `${etiquetaCampo(c)}: escribe un número.`;
        if (x && c.tipo === 'correo' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)) return 'Escribe un correo válido.';
    }
    return null;
}

/** Los parámetros para la función: fijos + lo escrito (vacío opcional = null; número convertido). */
export function parametros(a: Accion, idParam: string, id: string, valores: Record<string, string>): Record<string, unknown> {
    const out: Record<string, unknown> = { [idParam]: id };
    for (const c of a.pide) {
        if (esFijo(c)) {
            out[c.campo] = c.valor;
            continue;
        }
        const x = (valores[c.campo] ?? '').trim();
        out[c.campo] = x === '' ? null : c.tipo === 'numero' ? Number(x.replace(',', '.')) : x;
    }
    return out;
}

/** La principal primero, después las secundarias y al final las de peligro (un solo botón azul por paso). */
export function ordenar(acciones: Accion[]): Accion[] {
    const peso = { p: 0, s: 1, d: 2 } as const;
    const vistas = new Set<string>();
    let principal = false;
    return [...acciones]
        .sort((x, y) => peso[x.tipo] - peso[y.tipo])
        .filter((a) => (vistas.has(a.accion) ? false : (vistas.add(a.accion), true)))
        .map((a) => {
            // Si la base ofrece dos principales a la vez (raro), la segunda se pinta como secundaria.
            if (a.tipo !== 'p') return a;
            if (principal) return { ...a, tipo: 's' as const };
            principal = true;
            return a;
        });
}

/** Las funciones ac_* de la base reciben el id con un nombre distinto según la tabla. */
export function parametroId(funcion: string): string {
    if (funcion === 'ac_oc_demasia') return 'p_linea';
    if (funcion === 'ac_item_tecnica' || funcion === 'ac_item_sku') return 'p_item';
    if (funcion === 'ac_des_crear') return 'p_oc';
    return 'p_id';
}
