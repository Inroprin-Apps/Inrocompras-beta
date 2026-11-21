'use client';

// El costeo: totales (EXW en soles, gastos que entran al costo, ad valorem, costo total) y el factor de importación
// (FI = costo total / EXW) que guarda «Calcular costeo»; y el historial de versiones (des_costeo_hist): cada cierre
// es una versión, con el motivo de la reapertura que la originó.
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
    costeoDesactualizado,
    factor,
    monto,
    numero,
    totalesCosteo,
    type DesaduanajeDetalle,
    type VersionCosteo,
} from '@/modules/desaduanaje/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { dayTime } from '@/shared/ui/format.ts';

export function Costeo({ d, nombre }: { d: DesaduanajeDetalle; nombre: (u: string | null) => string }) {
    const t = totalesCosteo(d.productos, d.gastos);
    const calculado = d.exwTotalS != null;
    return (
        <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Total k="EXW" v={calculado ? monto(d.exwTotalS ?? 0) : '—'} />
                <Total k="Gastos al costo" v={calculado ? monto(d.gastosCostoS ?? 0) : '—'} />
                <Total k="Ad valorem" v={calculado ? monto(t.adValoremS) : '—'} />
                <Total k="FI" v={factor(d.fi)} fuerte />
            </dl>
            {!calculado ? (
                <p className="text-small text-ink-3">Aún no se calcula. Registra los gastos y pulsa «Calcular costeo»: reparte los gastos y da el FI.</p>
            ) : costeoDesactualizado(d, t) ? (
                <Notice tone="warning" cerrable={false}>
                    Hay gastos que aún no están en el costeo ({monto(t.gastosCostoS)} registrados, {monto(d.gastosCostoS ?? 0)} calculados). Pulsa «Calcular
                    costeo».
                </Notice>
            ) : (
                <p className="text-small text-ink-2">
                    Costo total {monto(t.costoTotalS)}
                    {d.fechaCierre && d.estado === 'Costeo cerrado' && ` · cerrado por ${nombre(d.cerradoPor)} el ${dayTime(d.fechaCierre)}`}
                </p>
            )}
            {d.versiones.length > 0 && (
                <div>
                    <h4 className="mb-1 text-small font-semibold text-ink-2">Versiones del costeo</h4>
                    <ul className="flex flex-col divide-y divide-divider">
                        {d.versiones.map((v) => (
                            <Version key={v.version} v={v} nombre={nombre} />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function Version({ v, nombre }: { v: VersionCosteo; nombre: (u: string | null) => string }) {
    const [abierta, setAbierta] = useState(false);
    const Icono = abierta ? ChevronDown : ChevronRight;
    return (
        <li className="py-2">
            <button
                type="button"
                onClick={() => setAbierta((x) => !x)}
                aria-expanded={abierta}
                className="flex w-full items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
            >
                <Icono size={16} className="mt-0.5 flex-none text-ink-3" aria-hidden />
                <div className="min-w-0 flex-1">
                    <div className="text-ui font-medium">
                        Versión {v.version} <span className="font-normal text-ink-2">· FI {factor(v.fi)}</span>
                    </div>
                    <div className="text-small text-ink-2">
                        {nombre(v.cerradoPor)} · {dayTime(v.fecha)}
                    </div>
                    {v.motivo && <div className="text-small text-ink-2">Reabierto por: «{v.motivo}»</div>}
                </div>
            </button>
            {abierta && (
                <ul className="mt-1.5 ml-6 flex flex-col gap-1">
                    {v.productos.map((p, i) => (
                        <li key={i} className="flex gap-2 text-small">
                            <span className="min-w-0 flex-1 truncate">
                                {p.producto} <span className="text-ink-3">× {numero(p.cantidad)}</span>
                            </span>
                            <span className="tabular-nums text-ink-2">{p.costoUnitS == null ? '—' : monto(p.costoUnitS)} c/u</span>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
}

function Total({ k, v, fuerte = false }: { k: string; v: string; fuerte?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className="text-caption text-ink-3">{k}</dt>
            <dd className={`text-ui tabular-nums ${fuerte ? 'font-semibold' : ''}`}>{v}</dd>
        </div>
    );
}
