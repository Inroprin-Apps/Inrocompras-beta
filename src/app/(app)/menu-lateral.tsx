'use client';

import {
    Building2, ClipboardCheck, ClipboardList, FileSpreadsheet, FileText, Inbox, ListChecks, Settings, Ship,
    ShoppingCart, Table2, Users, Wallet, Waypoints,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sidebar, type SidebarGroup } from '../../ui/sidebar.tsx';
import type { EntradaMenu, Icono } from '../../lib/menu.ts';

const ICONOS: Record<Icono, React.ReactNode> = {
    bandeja: <Inbox size={18} />,
    solicitudes: <FileText size={18} />,
    requerimientos: <ClipboardList size={18} />,
    validaciones: <ClipboardCheck size={18} />,
    plan: <ListChecks size={18} />,
    ordenes: <ShoppingCart size={18} />,
    cuadro: <Table2 size={18} />,
    proyectos: <Building2 size={18} />,
    proveedores: <FileSpreadsheet size={18} />,
    pagos: <Wallet size={18} />,
    embarques: <Ship size={18} />,
    seguimiento: <Waypoints size={18} />,
    equipo: <Users size={18} />,
    config: <Settings size={18} />,
};

export function MenuLateral({ grupos, pendientes }: { grupos: { title: string; items: EntradaMenu[] }[]; pendientes: number }) {
    const ruta = usePathname();
    const g: SidebarGroup[] = grupos.map((x) => ({
        title: x.title,
        items: x.items.map((it) => ({
            key: it.key,
            label: it.label,
            href: it.href,
            icon: ICONOS[it.icono],
            badge: it.key === 'te-toca' ? { count: pendientes, title: `${pendientes} pendientes` } : undefined,
        })),
    }));
    // La sección activa: la entrada cuyo href es el prefijo más largo de la ruta («/» solo para la bandeja).
    const activo = grupos
        .flatMap((x) => x.items)
        .filter((it) => (it.href === '/' ? ruta === '/' : ruta === it.href || ruta.startsWith(it.href + '/')))
        .sort((a, b) => b.href.length - a.href.length)[0]?.key;
    return <Sidebar marca={{ nombre: 'INROCOMPRAS', detalle: 'Compras e Importaciones' }} grupos={g} activo={activo ?? ''} clave="inrocompras.menu.contraido" />;
}
