'use client';

// El menú de la guía: fijo a la izquierda en pantallas anchas, desplegable arriba en el móvil.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV } from './nav.ts';

function Links({ onPick }: { onPick?: () => void }) {
    const path = usePathname();
    return (
        <nav aria-label="Guía" className="flex flex-col gap-5">
            {NAV.map((g) => (
                <div key={g.title} className="flex flex-col gap-0.5">
                    <p className="mb-1 px-3 text-caption font-medium tracking-[.06em] text-ink-3 uppercase">{g.title}</p>
                    {g.items.map((i) => {
                        const active = path === i.href;
                        return (
                            <Link
                                key={i.href}
                                href={i.href}
                                onClick={onPick}
                                aria-current={active ? 'page' : undefined}
                                className={`rounded-control px-3 py-1.5 text-ui no-underline focus-visible:outline-2 focus-visible:outline-primary ${
                                    active ? 'bg-primary-soft font-medium text-primary-strong' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                                }`}
                            >
                                {i.label}
                            </Link>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}

function Brand() {
    return (
        <Link href="/introduccion" className="flex items-center gap-2.5 text-ink no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/IconRoland.png" alt="" className="size-7" />
            <span className="flex flex-col leading-tight">
                <span className="text-heading font-semibold">Guía UI/UX</span>
                <span className="text-caption text-ink-3">Apps de INROPRIN</span>
            </span>
        </Link>
    );
}

export function Sidebar() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <aside className="no-scrollbar sticky top-0 hidden h-dvh w-64 flex-none flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-3 py-5 lg:flex">
                <div className="px-3">
                    <Brand />
                </div>
                <Links />
            </aside>
            <header className="sticky top-0 z-20 border-b border-divider bg-surface lg:hidden">
                <div className="flex items-center justify-between px-4 py-3">
                    <Brand />
                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        aria-expanded={open}
                        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                        className="rounded-control p-2 text-ink-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
                {open && (
                    <div className="max-h-[70dvh] overflow-y-auto border-t border-divider px-2 py-4">
                        <Links onPick={() => setOpen(false)} />
                    </div>
                )}
            </header>
        </>
    );
}
