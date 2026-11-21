'use client';

// EL MENÚ LATERAL de las apps: la marca arriba y las secciones en grupos con su icono y su contador. Viene de INROCONTA
// (src/app/(app)/_components/sidebar.tsx) con el mismo comportamiento: se contrae a solo iconos (el nombre queda en el
// title) y lo recuerda en este navegador, y en el celular pasa arriba con un botón que lo despliega.
// El estilo es el de la guía: fondo blanco, títulos de grupo en texto normal (no en mayúsculas), la sección activa en azul
// sólido (`primary`), los contadores en gris y «Contraer» solo al pasar el cursor.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronsLeft, Menu, X } from 'lucide-react';
import { CuboRombos } from './marca.tsx';

export interface SidebarBadge {
    count: number;
    title?: string;
}

export interface SidebarItem {
    key: string;
    label: string;
    href: string;
    icon: ReactNode;
    badge?: SidebarBadge;
}

export interface SidebarGroup {
    title: string;
    items: SidebarItem[];
}

// Los contadores son neutros a propósito: en gris con letra negra se leen bien y no le quitan la atención a la sección.
// Sobre la sección activa (que ya es azul) van en blanco.
function Badge({ b, activo, contraido }: { b: SidebarBadge; activo: boolean; contraido: boolean }) {
    if (!b.count) return null;
    const color = activo ? 'bg-on-fill text-primary-strong' : 'bg-surface-3 text-ink';
    // Contraído no hay sitio para el número: se desvanece (no se quita del todo, para que nada se mueva a mitad de la animación).
    return (
        <span
            title={b.title}
            className={`flex ml-auto min-w-5 items-center justify-center rounded-full px-1.5 py-px text-center text-caption font-medium tabular-nums transition-opacity duration-150 ${color} ${contraido ? 'md:opacity-0' : ''}`}
        >
            {b.count.toLocaleString('en-US')}
        </span>
    );
}

function Item({ it, activo, contraido, onPick }: { it: SidebarItem; activo: boolean; contraido: boolean; onPick: () => void }) {
    return (
        <Link
            href={it.href}
            onClick={onPick}
            // Contraído solo se ve el icono: el nombre queda para el lector de pantalla.
            aria-label={contraido ? it.label : undefined}
            aria-current={activo ? 'page' : undefined}
            className={`relative flex h-9 items-center gap-2.5 rounded-control px-2.5 text-ui font-medium whitespace-nowrap no-underline focus-visible:outline-2 focus-visible:outline-primary ${
                activo ? 'bg-primary text-on-fill' : 'text-ink hover:bg-surface-2'
            }`}
        >
            {/* El icono nunca cambia de sitio: el menú contraído mide justo lo que le da (12 + 10 px de margen a cada lado del icono). */}
            <span className={`flex-none ${activo ? 'text-on-fill' : 'text-ink'}`}>{it.icon}</span>
            <span className={`transition-opacity duration-150 ${contraido ? 'md:opacity-0' : ''}`}>{it.label}</span>
            {it.badge && <Badge b={it.badge} activo={activo} contraido={contraido} />}
        </Link>
    );
}

/**
 * `marca`: el nombre de la app y su subtítulo (el logo es el cubo de la marca, relleno).
 * `grupos`: las secciones. `activo`: la clave de la sección elegida; si no se pasa, se toma de la ruta (la que tenga el
 * mismo href). `clave`: dónde recuerda en este navegador si está contraído. `fijo`: pegado a la pantalla de arriba a abajo
 * (lo normal); sin él ocupa lo que le dé su contenedor, para mostrarlo dentro de una caja.
 */
export function Sidebar({
    marca,
    grupos,
    activo,
    clave = 'ui.menu.contraido',
    fijo = true,
    className = '',
}: {
    marca: { nombre: ReactNode; detalle?: string };
    grupos: SidebarGroup[];
    activo?: string;
    clave?: string;
    fijo?: boolean;
    className?: string;
}) {
    const ruta = usePathname();
    const [contraido, setContraido] = useState(false);
    const [abierto, setAbierto] = useState(false);
    // La animación del ancho solo corre después de leer lo que se recordó: sin esto, quien dejó el menú contraído lo vería
    // abrirse y cerrarse al cargar la pantalla.
    const [anima, setAnima] = useState(false);
    useEffect(() => {
        try {
            setContraido(localStorage.getItem(clave) === '1');
        } catch {
            /* sin almacenamiento: abierto */
        }
        const id = setTimeout(() => setAnima(true), 60);
        return () => clearTimeout(id);
    }, [clave]);
    const alternar = () =>
        setContraido((c) => {
            try {
                localStorage.setItem(clave, c ? '' : '1');
            } catch {
                /* sin almacenamiento: no se recuerda */
            }
            return !c;
        });

    return (
        <aside
            className={`group/menu relative flex flex-none flex-col overflow-hidden border-b border-line bg-surface md:border-r md:border-b-0 ${anima ? 'transition-[width] duration-200 ease-out' : ''} ${contraido ? 'md:w-[62px]' : 'md:w-[252px]'} ${fijo ? 'md:sticky md:top-0 md:h-dvh' : ''} ${className}`}
        >
            <div className="relative flex items-center gap-2.5 px-4 pt-4 pb-3 md:px-[13px] md:pt-5 md:pb-4">
                <CuboRombos size={36} variante="relleno" />
                {/* Ancho fijo: si el texto se encogiera con el menú, el subtítulo se cortaría con «…» a mitad de la animación. */}
                <div className={`w-44 flex-none transition-opacity duration-150 ${contraido ? 'md:opacity-0' : ''}`}>
                    <div className="text-heading leading-tight font-semibold whitespace-nowrap">{marca.nombre}</div>
                    {marca.detalle && <div className="text-small whitespace-nowrap text-ink-2">{marca.detalle}</div>}
                </div>
                <button
                    type="button"
                    onClick={() => setAbierto((a) => !a)}
                    aria-expanded={abierto}
                    aria-label={abierto ? 'Cerrar el menú' : 'Abrir el menú'}
                    className="ml-auto rounded-control p-2 text-ink-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary md:hidden"
                >
                    {abierto ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            <div
                className={`no-scrollbar relative flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-3 pb-3 md:flex ${abierto ? 'flex max-h-[70dvh]' : 'hidden'}`}
            >
                {grupos.map((g) => (
                    <nav key={g.title} aria-label={g.title} className="flex flex-col gap-0.5">
                        {/* Misma altura abierto y contraído: al contraer, el título se cambia por una línea y los iconos no se mueven. */}
                        <p className="relative mb-1 flex h-5 items-center px-2.5 text-small font-medium whitespace-nowrap text-ink-2">
                            <span className={`transition-opacity duration-150 ${contraido ? 'md:opacity-0' : ''}`}>{g.title}</span>
                            <span
                                aria-hidden
                                className={`absolute inset-x-2.5 top-1/2 hidden h-px bg-divider opacity-0 transition-opacity duration-150 md:block ${contraido ? 'md:opacity-100' : ''}`}
                            />
                        </p>
                        {g.items.map((it) => (
                            <Item
                                key={it.key}
                                it={it}
                                activo={activo ? activo === it.key : ruta === it.href}
                                contraido={contraido}
                                onPick={() => setAbierto(false)}
                            />
                        ))}
                    </nav>
                ))}
            </div>

            {/* Contraer es lo que menos se usa: solo aparece cuando el cursor está sobre el menú (o con el teclado). */}
            <div className="relative hidden px-3 py-3 opacity-0 transition-opacity duration-150 group-hover/menu:opacity-100 focus-within:opacity-100 md:block">
                <button
                    type="button"
                    onClick={alternar}
                    title={contraido ? 'Expandir el menú' : 'Contraer el menú'}
                    aria-label={contraido ? 'Expandir el menú' : 'Contraer el menú'}
                    className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-ui font-medium text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                >
                    <ChevronsLeft size={18} className={`flex-none transition-transform ${contraido ? 'rotate-180' : ''}`} />
                    <span className={`whitespace-nowrap transition-opacity duration-150 ${contraido ? 'opacity-0' : ''}`}>Contraer</span>
                </button>
            </div>
        </aside>
    );
}
