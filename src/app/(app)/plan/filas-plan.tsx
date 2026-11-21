'use client';

// Una línea del plan de compras: fila de la tabla (escritorio) o tarjeta (celular), con sus piezas (OC, validación, fechas).
import Link from 'next/link';
import { etiquetaSemaforo, tonoCriticidad, tonoSemaforo, type FilaPlan } from '@/modules/plan/application/views.ts';
import { T } from '@/shared/ui/bits.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { dmy } from '@/shared/ui/format.ts';

const cant = (n: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(n);

function Marca({ f, marcada, onMarcar }: { f: FilaPlan; marcada: boolean; onMarcar: () => void }) {
    const bloqueada = !!f.bloqueo || f.saldo <= 0;
    return (
        <input
            type="checkbox"
            checked={marcada}
            onChange={onMarcar}
            aria-label={`Marcar ${f.descripcion}`}
            title={f.bloqueo ?? (f.saldo <= 0 ? 'Sin saldo' : 'Marcar para generar la OC')}
            className={`size-4 cursor-pointer accent-primary ${bloqueada && !marcada ? 'opacity-40' : ''}`}
        />
    );
}

function Ocs({ f, verOc }: { f: FilaPlan; verOc: boolean }) {
    if (!f.ordenes.length) return <span className="text-ink-3">—</span>;
    return (
        <div className="flex flex-col gap-1">
            {f.ordenes.map((o) => (
                <div key={o.id} className="text-small">
                    {verOc ? (
                        <Link href={`/ordenes?ver=${o.id}`} className="font-medium text-primary hover:underline">
                            {o.numero ?? 'Borrador'}
                        </Link>
                    ) : (
                        <span className="font-medium">{o.numero ?? 'Borrador'}</span>
                    )}
                    {o.numero && <span className="text-ink-2"> · {o.estatus}</span>}
                </div>
            ))}
            {f.pagado && <Chip tone="ok">Pagado</Chip>}
        </div>
    );
}

function Validacion({ f }: { f: FilaPlan }) {
    const tono = f.validacion === 'Validado' || f.validacion === 'No aplica' ? 'ok' : f.validacion === 'Observado' ? 'warn' : 'muted';
    return (
        <>
            <Chip tone={tono}>{f.validacion}</Chip>
            {(f.marca || f.modelo) && <div className={T.sub}>{[f.marca, f.modelo].filter(Boolean).join(' · ')}</div>}
        </>
    );
}

function Fechas({ f }: { f: FilaPlan }) {
    if (!f.fechaMeta) return <span className="text-ink-3">Sin fecha meta</span>;
    return (
        <>
            <div title="Fecha límite para emitir la OC">Límite {f.fechaLimite ? dmy(f.fechaLimite) : '—'}</div>
            <div className={T.sub}>
                Meta {dmy(f.fechaMeta)}
                {f.plazoDias != null && ` · ${f.plazoDias} d de plazo`}
            </div>
        </>
    );
}

function Descripcion({ f }: { f: FilaPlan }) {
    return (
        <div className={f.nivel ? 'border-l-2 border-l-divider-strong pl-3' : ''}>
            <div className={`font-medium ${f.anulado ? 'text-ink-3 line-through' : ''}`}>
                {f.nivel ? <span className="text-ink-3">↳ </span> : null}
                {f.descripcion}
            </div>
            <div className={T.sub}>
                {[
                    f.canal ?? 'Sin canal',
                    f.codigoCliente && `Cód. ${f.codigoCliente}`,
                    f.sku && `SKU ${f.sku}`,
                    f.requerimiento ?? 'RC sin emitir',
                    f.rqSidige && `RQ ${f.rqSidige}`,
                ]
                    .filter(Boolean)
                    .join(' · ')}
            </div>
            {f.bloqueo && <div className="mt-1 text-small text-warning-strong">{f.bloqueo}</div>}
        </div>
    );
}

export function FilaTabla({ f, compra, marcada, onMarcar, verOc }: { f: FilaPlan; compra: boolean; marcada: boolean; onMarcar: () => void; verOc: boolean }) {
    const diasTxt = f.saldo > 0 && f.diasALimite != null ? (f.diasALimite < 0 ? `hace ${-f.diasALimite} d` : `en ${f.diasALimite} d`) : '';
    return (
        <tr className={`${T.row} ${marcada ? 'bg-primary-soft' : ''}`}>
            {compra && (
                <td className={T.td}>
                    <Marca f={f} marcada={marcada} onMarcar={onMarcar} />
                </td>
            )}
            <td className={`${T.td} min-w-64`}>
                <Descripcion f={f} />
            </td>
            <td className={`${T.tdNum} text-right`}>
                {cant(f.cantidad)} <span className="text-ink-3">{f.unidad}</span>
            </td>
            <td className={`${T.tdNum} text-right font-medium`}>{cant(f.saldo)}</td>
            <td className={T.td}>
                <Validacion f={f} />
            </td>
            <td className={T.tdNum}>
                <Fechas f={f} />
            </td>
            <td className={T.td}>
                <div className="flex flex-col items-start gap-1">
                    <Chip tone={tonoSemaforo(f.semaforo)}>{etiquetaSemaforo(f.semaforo)}</Chip>
                    {diasTxt && <span className={T.sub}>{diasTxt}</span>}
                    <Chip tone={tonoCriticidad(f.criticidad)}>{f.criticidad}</Chip>
                </div>
            </td>
            <td className={T.td}>
                <Ocs f={f} verOc={verOc} />
            </td>
        </tr>
    );
}

export function TarjetaPlan({ f, compra, marcada, onMarcar, verOc }: { f: FilaPlan; compra: boolean; marcada: boolean; onMarcar: () => void; verOc: boolean }) {
    return (
        <li className={`flex gap-3 rounded-card border border-line px-4 py-3 ${marcada ? 'bg-primary-soft' : 'bg-surface'} ${f.nivel ? 'ml-4' : ''}`}>
            {compra && (
                <div className="pt-0.5">
                    <Marca f={f} marcada={marcada} onMarcar={onMarcar} />
                </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-ui">
                <Descripcion f={f} />
                <div className="text-small text-ink-2">
                    Cantidad {cant(f.cantidad)} {f.unidad} · <span className="font-medium text-ink">saldo {cant(f.saldo)}</span>
                </div>
                <div className="text-small text-ink-2">
                    <Fechas f={f} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Chip tone={tonoSemaforo(f.semaforo)}>{etiquetaSemaforo(f.semaforo)}</Chip>
                    <Chip tone={tonoCriticidad(f.criticidad)}>{f.criticidad}</Chip>
                    <Validacion f={f} />
                </div>
                <Ocs f={f} verOc={verOc} />
            </div>
        </li>
    );
}
