'use client';

// Una cuota en la lista de Pagos: fila de la tabla (escritorio) o tarjeta (celular), y su fecha límite.
import { monto } from '@/modules/ordenes/application/views.ts';
import { formatoCuota, seleccionable, tonoPago, vencida, type Pago } from '@/modules/pagos/application/views.ts';
import { T } from '@/shared/ui/bits.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { dmy } from '@/shared/ui/format.ts';

function Limite({ p, hoy }: { p: Pago; hoy: string }) {
    if (!p.fechaLimite) return <span className="text-ink-3">—</span>;
    const v = vencida(p, hoy);
    return (
        <span className={v ? 'font-medium text-danger-strong' : ''}>
            {dmy(p.fechaLimite)}
            {v && <span className="sr-only"> (vencida)</span>}
        </span>
    );
}

export function FilaPago({
    p,
    hoy,
    activa,
    enBloque,
    marcada,
    onMarcar,
    onAbrir,
}: {
    p: Pago;
    hoy: string;
    activa: boolean;
    enBloque: boolean;
    marcada: boolean;
    onMarcar: () => void;
    onAbrir: () => void;
}) {
    return (
        <tr
            tabIndex={0}
            className={`${T.row} cursor-pointer ${activa ? 'bg-primary-soft' : ''}`}
            onClick={onAbrir}
            onKeyDown={(e) => e.key === 'Enter' && onAbrir()}
        >
            {enBloque && (
                <td className={T.td} onClick={(e) => e.stopPropagation()}>
                    {seleccionable(p) && (
                        <input
                            type="checkbox"
                            aria-label={`Marcar ${p.ordenNumero} cuota ${formatoCuota(p.nCuota)}`}
                            checked={marcada}
                            onChange={onMarcar}
                            className="size-4 accent-primary"
                        />
                    )}
                </td>
            )}
            <td className={T.td}>
                <div className="font-medium">{p.ordenNumero}</div>
                <div className={T.sub}>{p.proveedor || 'Sin proveedor'}</div>
            </td>
            <td className={T.td}>
                {formatoCuota(p.nCuota)}. {p.tipo}
                {p.porcentaje != null && p.porcentaje < 1 && <span className="text-ink-2"> · {Math.round(p.porcentaje * 100)} %</span>}
                <div className={T.sub}>{p.factura ? `Factura ${p.factura.numero || 'sin número'}` : p.hito}</div>
            </td>
            <td className={`${T.tdNum} text-right`}>
                {monto(p.monto, p.moneda)}
                {p.moneda !== 'PEN' && <div className={T.sub}>{monto(p.montoSoles)}</div>}
            </td>
            <td className={`${T.tdNum} text-right`}>
                {p.aplicaRetencion ? (
                    <>
                        <span className="text-ink-2">−{monto(p.retencion, p.moneda)}</span>
                        <div className={T.sub}>Neto {monto(p.neto ?? p.monto - p.retencion, p.moneda)}</div>
                    </>
                ) : (
                    <span className="text-ink-3">Sin retención</span>
                )}
            </td>
            <td className={T.tdNum}>
                <Limite p={p} hoy={hoy} />
                {p.fechaProgramada && p.estado === 'Programado' && <div className={T.sub}>Programada {dmy(p.fechaProgramada)}</div>}
            </td>
            <td className={T.td}>
                <Chip tone={tonoPago(p.estado)}>{p.estado}</Chip>
                {p.estado === 'Pagado' && p.nOperacion && <div className={T.sub}>Op. {p.nOperacion}</div>}
            </td>
            <td className={T.td}>{p.inropayRef || <span className="text-ink-3">—</span>}</td>
        </tr>
    );
}

export function TarjetaPago({
    p,
    hoy,
    activa,
    marcable,
    marcada,
    onMarcar,
    onAbrir,
}: {
    p: Pago;
    hoy: string;
    activa: boolean;
    marcable: boolean;
    marcada: boolean;
    onMarcar: () => void;
    onAbrir: () => void;
}) {
    return (
        <li className={`flex items-stretch rounded-card border border-line ${activa ? 'bg-primary-soft' : 'bg-surface'}`}>
            {marcable && (
                <label className="flex items-center pl-3.5">
                    <input
                        type="checkbox"
                        aria-label={`Marcar ${p.ordenNumero} cuota ${formatoCuota(p.nCuota)}`}
                        checked={marcada}
                        onChange={onMarcar}
                        className="size-5 accent-primary"
                    />
                </label>
            )}
            <button
                type="button"
                onClick={onAbrir}
                className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-card px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-primary active:bg-surface-2"
            >
                <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 truncate text-ui font-semibold">
                        {p.ordenNumero} · {formatoCuota(p.nCuota)}
                    </span>
                    <span className="text-ui font-medium tabular-nums">{monto(p.monto, p.moneda)}</span>
                </div>
                <div className="truncate text-small text-ink-2">
                    {p.proveedor || 'Sin proveedor'} · {p.tipo}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-small">
                    <Chip tone={tonoPago(p.estado)}>{p.estado}</Chip>
                    {p.fechaLimite && (
                        <span className={vencida(p, hoy) ? 'font-medium text-danger-strong' : 'text-ink-2'}>
                            {vencida(p, hoy) ? 'Venció' : 'Vence'} {dmy(p.fechaLimite)}
                        </span>
                    )}
                </div>
            </button>
        </li>
    );
}
