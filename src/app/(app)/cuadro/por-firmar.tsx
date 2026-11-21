'use client';

// Las órdenes que esperan TU firma (CG, GOP o GAF) como tarjetas grandes para el celular: proveedor, monto en soles,
// ruta, demasías pendientes y quién ya firmó, con «Lo que te toca» debajo (los botones salen de la base).
// Qué órdenes son no lo decide la pantalla: son las que te_toca() pone en tu bandeja para validar o aprobar.
// Criterio D, «3 toques»: menú → Cuadro de aprobaciones (o Te toca) → Aprobar.
import { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, TriangleAlert } from 'lucide-react';
import { ordenarPorAprobar, textoRuta, yaFirmaron, type OrdenPorAprobar } from '@/modules/cuadro/application/views.ts';
import { cantidad, monto } from '@/modules/ordenes/application/views.ts';
import { LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { dayTime } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { ListaError, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { personasStore, teTocaStore } from '../_lib/stores.ts';
import { porAprobarStore } from './store.ts';

const PASOS = new Set(['Validar presupuesto', 'Aprobar orden']);
const TOCADAS = ['ordenes', 'oc_lineas', 'pagos'] as const;

export function PorFirmar({ titulo = true }: { titulo?: boolean }) {
    const bandeja = teTocaStore.use();
    const pendientes = useMemo(() => (bandeja.data ?? []).filter((t) => t.tabla === 'ordenes' && PASOS.has(t.paso)), [bandeja.data]);
    const clave = useMemo(() => [...new Set(pendientes.map((t) => t.id))].sort().join(','), [pendientes]);
    const desde = useMemo(() => new Map(pendientes.map((t) => [t.id, t.desde])), [pendientes]);
    const paso = useMemo(() => new Map(pendientes.map((t) => [t.id, t.paso])), [pendientes]);
    const ordenes = porAprobarStore.use(clave || null);

    const cabecera = titulo && (
        <h2 className="mb-2.5 text-heading font-semibold">
            Por firmar{bandeja.data && <span className="font-normal text-ink-2"> ({pendientes.length})</span>}
        </h2>
    );

    if (bandeja.error && !bandeja.data)
        return (
            <>
                {cabecera}
                <ListaError mensaje={bandeja.error} onReintentar={() => void teTocaStore.retry()} />
            </>
        );
    if (bandeja.data && !pendientes.length)
        return (
            <>
                {cabecera}
                <ListaVacia titulo="No tienes órdenes por firmar" icono={<CheckCircle2 size={28} aria-hidden />}>
                    Cuando una orden espere tu validación o tu aprobación, aparecerá aquí.
                </ListaVacia>
            </>
        );
    if (ordenes.error && !ordenes.data)
        return (
            <>
                {cabecera}
                <ListaError mensaje={ordenes.error} onReintentar={() => void porAprobarStore.reload(clave)} />
            </>
        );
    if (!ordenes.data)
        return (
            <>
                {cabecera}
                <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-4">
                            <Hueco className="h-5 w-2/3" />
                            <Hueco className="h-8 w-1/2" />
                            <Hueco className="h-4 w-3/4" />
                            <Hueco className="h-11 w-full" />
                        </div>
                    ))}
                </div>
            </>
        );

    return (
        <>
            {cabecera}
            <ul className="flex flex-col gap-3">
                {ordenarPorAprobar(ordenes.data, desde).map((o) => (
                    <li key={o.id}>
                        <Tarjeta o={o} paso={paso.get(o.id) ?? ''} />
                    </li>
                ))}
            </ul>
        </>
    );
}

function Tarjeta({ o, paso }: { o: OrdenPorAprobar; paso: string }) {
    const gente = personasStore.use().data;
    const nombre = (u: string | null) => (u ? (gente?.find((g) => g.id === u)?.nombre ?? 'Otra persona') : '');
    const firmas = yaFirmaron(o);
    return (
        <article className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-caption font-medium text-ink-3">{paso}</p>
                    <h3 className="text-heading font-semibold break-words">{o.proveedor || 'Sin proveedor'}</h3>
                    <p className="truncate text-small text-ink-2">
                        {o.numero}
                        {o.proyecto && ` · ${o.proyecto}`}
                    </p>
                </div>
            </div>
            <div>
                <p className="text-title font-semibold tabular-nums">{monto(o.montoSoles)}</p>
                {o.moneda !== 'PEN' && <p className="text-small text-ink-2 tabular-nums">{monto(o.monto, o.moneda)}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
                <Chip tone={o.tipoAprobacion === 'Aprobación Conjunta' ? 'warn' : 'info'}>{textoRuta(o.tipoAprobacion)}</Chip>
                {o.aprobacionPpto && <Chip tone="muted">Ppto: {o.aprobacionPpto}</Chip>}
                <Chip tone="muted">{o.lineas === 1 ? '1 línea' : `${o.lineas} líneas`}</Chip>
            </div>
            {o.demasias.length > 0 && (
                <div className="rounded-inner border border-line bg-surface-2 px-3 py-2.5 text-small">
                    <p className="flex items-center gap-1.5 font-medium text-warning-strong">
                        <TriangleAlert size={15} aria-hidden /> {o.demasias.length === 1 ? '1 demasía pendiente' : `${o.demasias.length} demasías pendientes`}
                    </p>
                    <ul className="mt-1 flex flex-col gap-1">
                        {o.demasias.map((d) => (
                            <li key={d.id} className="text-ink-2">
                                +{cantidad(d.cantidad)} · {d.descripcion} · {monto(d.subtotal, o.moneda)}
                                {d.motivo && <span className="text-ink-3"> · «{d.motivo}»</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="text-small">
                <p className="mb-1 font-medium text-ink-2">Ya firmaron</p>
                {firmas.length ? (
                    <ul className="flex flex-col gap-0.5">
                        {firmas.map((f) => (
                            <li key={f.quien} className="text-ink-2">
                                <span className="font-medium text-ink">{f.quien}</span>: {f.valor}
                                {f.por && ` · ${nombre(f.por)}`}
                                {f.fecha && ` · ${dayTime(f.fecha)}`}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-ink-3">Nadie todavía.</p>
                )}
            </div>
            <PanelAcciones tabla="ordenes" id={o.id} tocadas={TOCADAS} />
            <Link href={`/ordenes?ver=${o.id}`} className={`${LINK_CLASS} inline-flex items-center gap-1 self-start text-small`}>
                Ver la orden completa <ChevronRight size={14} aria-hidden />
            </Link>
        </article>
    );
}
