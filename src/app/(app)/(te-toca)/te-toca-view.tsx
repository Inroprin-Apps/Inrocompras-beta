'use client';

// «Te toca»: lo pendiente de cada persona en un solo lugar (te_toca() de la base), agrupado por paso, con
// lo que espera más de 3 días en rojo. Cada fila lleva a su ficha.
import Link from 'next/link';
import { agruparPorPaso, diasDesde, rutaDe } from '@/modules/comun/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Encabezado } from '@/shared/ui/encabezado.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { teTocaStore } from '../_lib/stores.ts';

const DIAS_ALERTA = 3;

export function TeTocaView() {
    const perfil = usePerfil();
    const estado = teTocaStore.use();
    const sinArea = perfil.area === 'Sin área' && !perfil.roles.length;
    return (
        <>
            <Encabezado titulo="Te toca" actualizado={estado.actualizado} />
            {sinArea && (
                <Notice tone="info" cerrable={false}>
                    Tu cuenta aún no tiene área ni roles. Pide al administrador que te los asigne en Equipo; mientras tanto puedes crear solicitudes.
                </Notice>
            )}
            <Lista
                estado={estado}
                onReintentar={() => void teTocaStore.retry()}
                vacia={<ListaVacia titulo="No tienes nada pendiente">Aquí aparece lo que espera una acción tuya: liberar, validar, aprobar, pagar.</ListaVacia>}
            >
                {(filas) => (
                    <div className="flex flex-col gap-4">
                        {agruparPorPaso(filas).map(([paso, lista]) => (
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
                                                    href={rutaDe(f.tabla, f.id)}
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
            </Lista>
        </>
    );
}
