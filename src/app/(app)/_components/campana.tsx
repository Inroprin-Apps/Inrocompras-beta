'use client';

// La campana: las notificaciones propias (las escribe la base con app.notificar). Al abrirla se marcan
// leídas; cada una lleva a su ficha.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { bandeja } from '@/modules/comun/composition.ts';
import { rutaDe } from '@/modules/comun/application/views.ts';
import { dayTime } from '@/shared/ui/format.ts';
import { useDismissOnOutside } from '@/shared/ui/use-dismiss-on-outside.ts';
import { refrescar } from '../_lib/resource.ts';
import { notificacionesStore } from '../_lib/stores.ts';

export function Campana() {
    const { data } = notificacionesStore.use();
    const [abierta, setAbierta] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useDismissOnOutside(abierta, ref, () => setAbierta(false));
    const sinLeer = (data ?? []).filter((n) => !n.leida);

    function alternar() {
        const abrir = !abierta;
        setAbierta(abrir);
        if (abrir && sinLeer.length)
            void bandeja()
                .marcarLeidas(sinLeer.map((n) => n.id))
                .then(() => refrescar(['notificaciones']));
    }
    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={alternar}
                aria-label={sinLeer.length ? `${sinLeer.length} notificaciones sin leer` : 'Notificaciones'}
                aria-expanded={abierta}
                className="relative rounded-control p-2 text-ink-2 hover:bg-surface-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
                <Bell size={18} />
                {sinLeer.length > 0 && (
                    <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-caption leading-4 font-medium text-on-fill">
                        {sinLeer.length}
                    </span>
                )}
            </button>
            {abierta && (
                <div className="absolute right-0 z-40 mt-1 w-[min(92vw,360px)] overflow-hidden rounded-card border border-line bg-surface shadow-float">
                    <p className="border-b border-divider px-4 py-2.5 text-ui font-semibold">Notificaciones</p>
                    {!data?.length ? (
                        <p className="px-4 py-6 text-center text-small text-ink-3">No tienes notificaciones.</p>
                    ) : (
                        <ul className="max-h-[60dvh] overflow-y-auto">
                            {data.map((n) => (
                                <li key={n.id} className="border-b border-divider last:border-b-0">
                                    <Link
                                        href={rutaDe(n.tabla, n.refId)}
                                        onClick={() => setAbierta(false)}
                                        className="block px-4 py-2.5 text-ink no-underline hover:bg-surface-2"
                                    >
                                        <div className={`text-ui ${n.leida ? '' : 'font-semibold'}`}>{n.titulo}</div>
                                        {n.cuerpo && <div className="truncate text-small text-ink-2">{n.cuerpo}</div>}
                                        <div className="text-caption text-ink-3">{dayTime(n.creado)}</div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
