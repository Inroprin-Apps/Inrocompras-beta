// Equipo: el administrador asigna área, jefe, ámbito, roles y si la persona está activa (0005: ac_equipo_guardar).
// PURO: tipos, filtros y cómo se lee el historial de cambios.
import { rolLabel } from '@/shared/tipos.ts';
import { palabrasDe, plano } from '@/shared/texto.ts';

export interface Miembro {
    id: string;
    email: string;
    nombre: string;
    area: string;
    jefeId: string | null;
    ambito: 'nac' | 'imp' | 'todas';
    activo: boolean;
    creado: string;
    roles: string[];
}

export interface DatosEquipo {
    area: string;
    jefeId: string | null;
    ambito: string;
    activo: boolean;
    roles: string[];
}

export interface CambioEquipo {
    id: number;
    accion: string;
    de: string | null;
    a: string | null;
    usuarioId: string | null;
    ts: string;
}

export const FILTROS_EQUIPO = ['todas', 'sin-area', 'inactivas'] as const;
export type FiltroEquipo = (typeof FILTROS_EQUIPO)[number];

export function filtrarEquipo(lista: Miembro[], filtro: FiltroEquipo, texto: string): Miembro[] {
    const palabras = palabrasDe(texto);
    return lista.filter((p) => {
        if (filtro === 'sin-area' && p.area !== 'Sin área') return false;
        if (filtro === 'inactivas' && p.activo) return false;
        const t = plano(`${p.nombre} ${p.email} ${p.area} ${p.roles.map(rolLabel).join(' ')}`);
        return palabras.every((w) => t.includes(w));
    });
}

/** Personas activas sin área: recién entraron y esperan que el administrador las configure. */
export const sinArea = (lista: Miembro[]) => lista.filter((p) => p.area === 'Sin área' && p.activo).length;

export const datosDe = (p: Miembro): DatosEquipo => ({ area: p.area, jefeId: p.jefeId, ambito: p.ambito, activo: p.activo, roles: [...p.roles].sort() });

export function hayCambios(p: Miembro, d: DatosEquipo): boolean {
    return (
        d.area !== p.area ||
        (d.jefeId || null) !== p.jefeId ||
        d.ambito !== p.ambito ||
        d.activo !== p.activo ||
        [...d.roles].sort().join() !== [...p.roles].sort().join()
    );
}

const ACCION: Record<string, string> = {
    equipo_area: 'Área',
    equipo_jefe: 'Jefe',
    equipo_ambito: 'Ámbito',
    equipo_activo: 'Activo',
    equipo_roles: 'Roles',
    alta_admin_inicial: 'Alta como administrador',
};
export const etiquetaCambio = (accion: string) => ACCION[accion] ?? accion.replace(/_/g, ' ');

/** Un valor del historial en palabras (el jefe por su nombre; activo como Sí/No). */
export function valorCambio(c: Pick<CambioEquipo, 'accion'>, v: string | null, nombre: (id: string) => string | undefined): string {
    if (c.accion === 'equipo_jefe') return v ? (nombre(v) ?? '—') : '—';
    if (c.accion === 'equipo_activo') return v === 'true' ? 'Sí' : v === 'false' ? 'No' : '—';
    return v || '—';
}
