import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { miPerfil } from '../../lib/sesion.ts';
import { supabaseServidor } from '../../lib/supabase/server.ts';
import type { TeTocaFila } from '../../lib/tipos.ts';
import { Notice, SectionTitle } from '../../ui/bits.tsx';
import { Chip } from '../../ui/card.tsx';
import { dmy } from '../../ui/format.ts';

export const metadata: Metadata = { title: 'Te toca' };

// Ruta de la ficha de cada tipo de registro que aparece en la bandeja.
const RUTA: Record<string, string> = {
    solicitudes: '/solicitudes',
    requerimientos: '/requerimientos',
    requerimiento_items: '/validaciones',
    ordenes: '/ordenes',
    pagos: '/pagos',
    proveedores: '/proveedores',
    anulaciones: '/requerimientos/anulaciones',
};
const DIAS_ALERTA = 3;

function diasDesde(iso: string | null) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default async function TeToca() {
    const perfil = await miPerfil();
    const supabase = await supabaseServidor();
    const { data, error } = await supabase.rpc('te_toca');
    if (error) throw new Error(error.message);
    const filas = (data ?? []) as TeTocaFila[];

    // Agrupado por paso; dentro, lo que más espera primero.
    const grupos = new Map<string, TeTocaFila[]>();
    for (const f of [...filas].sort((a, b) => (a.desde ?? '').localeCompare(b.desde ?? ''))) {
        grupos.set(f.paso, [...(grupos.get(f.paso) ?? []), f]);
    }
    const sinArea = perfil?.area === 'Sin área' && !perfil.roles.length;

    return (
        <>
            <SectionTitle title="Te toca" />
            {sinArea && (
                <Notice tone="info" cerrable={false}>
                    Tu cuenta aún no tiene área ni roles. Pide al administrador que te los asigne en Equipo; mientras tanto puedes crear solicitudes.
                </Notice>
            )}
            {filas.length === 0 ? (
                <div className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-14 text-center">
                    <Inbox size={28} className="mb-3 text-ink-3" aria-hidden />
                    <p className="text-heading font-medium">No tienes nada pendiente</p>
                    <p className="mt-1 text-ui text-ink-2">Aquí aparece lo que espera una acción tuya: liberar, validar, aprobar, pagar.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {[...grupos.entries()].map(([paso, lista]) => (
                        <section key={paso} className="rounded-card border border-line bg-surface">
                            <h2 className="flex items-center gap-2 border-b border-divider px-4 py-3 text-heading font-semibold">
                                {paso}
                                <span className="rounded-full bg-surface-3 px-2 py-px text-caption font-medium tabular-nums">{lista.length}</span>
                            </h2>
                            <ul>
                                {lista.map((f) => {
                                    const d = diasDesde(f.desde);
                                    return (
                                        <li key={f.tabla + f.id} className="border-b border-divider last:border-b-0">
                                            <Link
                                                href={`${RUTA[f.tabla] ?? '/'}/${f.id}`}
                                                className="flex items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
                                            >
                                                <span className="min-w-0 flex-1 truncate text-ui">{f.titulo}</span>
                                                {d !== null && d > DIAS_ALERTA ? (
                                                    <Chip tone="danger" title={`Esperando desde el ${dmy(f.desde)}`}>
                                                        {d} días
                                                    </Chip>
                                                ) : (
                                                    <span className="text-small text-ink-3 tabular-nums">{f.desde ? dmy(f.desde) : ''}</span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </>
    );
}
