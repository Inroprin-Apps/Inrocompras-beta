import type { Perfil } from '@/shared/tipos.ts';

// El menú por perfil (docs/02_ROLES_Y_PERMISOS.md). Es comodidad, no seguridad: la ponen RLS y las funciones.
// `hito`: en qué hito llega la pantalla (mientras no exista, la sección dice cuándo llega).
export type Icono = 'bandeja' | 'solicitudes' | 'requerimientos' | 'validaciones' | 'plan' | 'ordenes' | 'cuadro' | 'proyectos'
    | 'proveedores' | 'pagos' | 'embarques' | 'seguimiento' | 'equipo' | 'config';

export interface EntradaMenu {
    key: string;
    label: string;
    href: string;
    icono: Icono;
    hito: number;
}

const E = {
    teToca: { key: 'te-toca', label: 'Te toca', href: '/', icono: 'bandeja', hito: 0 },
    solicitudes: { key: 'solicitudes', label: 'Mis solicitudes', href: '/solicitudes', icono: 'solicitudes', hito: 1 },
    requerimientos: { key: 'requerimientos', label: 'Requerimientos', href: '/requerimientos', icono: 'requerimientos', hito: 1 },
    validaciones: { key: 'validaciones', label: 'Validaciones', href: '/validaciones', icono: 'validaciones', hito: 1 },
    seguimiento: { key: 'seguimiento', label: 'Seguimiento', href: '/seguimiento', icono: 'seguimiento', hito: 1 },
    proveedores: { key: 'proveedores', label: 'Proveedores', href: '/proveedores', icono: 'proveedores', hito: 2 },
    plan: { key: 'plan', label: 'Plan de compras', href: '/plan', icono: 'plan', hito: 3 },
    ordenes: { key: 'ordenes', label: 'Órdenes', href: '/ordenes', icono: 'ordenes', hito: 3 },
    proyectos: { key: 'proyectos', label: 'Proyectos', href: '/proyectos', icono: 'proyectos', hito: 3 },
    cuadro: { key: 'cuadro', label: 'Cuadro de aprobaciones', href: '/cuadro', icono: 'cuadro', hito: 4 },
    pagos: { key: 'pagos', label: 'Pagos', href: '/pagos', icono: 'pagos', hito: 5 },
    embarques: { key: 'embarques', label: 'Desaduanaje', href: '/desaduanaje', icono: 'embarques', hito: 6 },
    equipo: { key: 'equipo', label: 'Equipo', href: '/equipo', icono: 'equipo', hito: 0 },
    config: { key: 'config', label: 'Configuración', href: '/configuracion', icono: 'config', hito: 8 },
} satisfies Record<string, EntradaMenu>;

export const TODAS: EntradaMenu[] = Object.values(E);

export function menuPara(p: Perfil): { title: string; items: EntradaMenu[] }[] {
    const r = new Set<string>(p.roles);
    const aprobador = r.has('CONTROL_GESTION') || r.has('GOP') || r.has('GAF');
    const trabajo = new Map<string, EntradaMenu>();
    const add = (...xs: EntradaMenu[]) => xs.forEach((x) => trabajo.set(x.key, x));

    add(E.teToca, E.solicitudes);
    if (['Comercial', 'Proyectos', 'Planeamiento', 'Control de Gestión', 'Gerencia'].includes(p.area)) add(E.proyectos);
    if (p.area === 'Planeamiento') add(E.requerimientos, E.plan);
    if (p.area === 'Técnica' || r.has('TECNICA')) add(E.validaciones);
    if (p.es_compras) {
        add(E.plan, E.ordenes, E.requerimientos, E.proveedores, E.pagos);
        if (p.ambito !== 'nac') add(E.embarques);
    }
    if (aprobador) add(E.ordenes, E.cuadro, E.proyectos);
    if (p.area === 'Finanzas' || r.has('FINANZAS')) add(E.pagos, E.proveedores, E.ordenes);
    if (p.area === 'Contabilidad' || r.has('CONTABILIDAD')) add(E.proveedores, E.embarques, E.ordenes);
    add(E.seguimiento);

    const grupos = [{ title: 'Trabajo', items: [...trabajo.values()] }];
    if (p.es_admin) {
        const resto = TODAS.filter((x) => !trabajo.has(x.key) && x.key !== 'equipo' && x.key !== 'config');
        if (resto.length) grupos.push({ title: 'Todo', items: resto });
        grupos.push({ title: 'Administración', items: [E.equipo, E.config] });
    }
    return grupos;
}

export const FECHA_HITO: Record<number, string> = { 1: '29/11', 2: '3/12', 3: '8/12', 4: '12/12', 5: '17/12', 6: '20/12', 7: '28/12', 8: '31/12' };
