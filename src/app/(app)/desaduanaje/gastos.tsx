'use client';

// Los gastos del desaduanaje (Des_Gastos): los registran Importaciones, Compras o Contabilidad mientras el costeo no
// esté cerrado. Si entra al costo y cómo se reparte vienen del concepto (0050). Con el costeo cerrado RLS no deja
// agregar, cambiar ni borrar: aquí se dice y se explica qué hacer.
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import { monto, tc, totalesCosteo, type DesaduanajeDetalle, type GastoDes } from '@/modules/desaduanaje/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { FormGasto } from './form-gasto.tsx';

export function Gastos({ d, registra, nombre }: { d: DesaduanajeDetalle; registra: boolean; nombre: (u: string | null) => string }) {
    const [form, setForm] = useState<{ gasto?: GastoDes } | null>(null);
    const [borrando, setBorrando] = useState<GastoDes | null>(null);
    const t = totalesCosteo(d.productos, d.gastos);
    const cerrado = d.estado === 'Costeo cerrado';

    return (
        <div className="flex flex-col gap-3">
            {cerrado && (
                <Notice tone="info" cerrable={false}>
                    El costeo está cerrado (versión {d.versionCosteo}): ya no se agregan ni cambian gastos. Si llegó un gasto después (una multa, por ejemplo),
                    pide a la jefatura de Importaciones que lo reabra con motivo.
                </Notice>
            )}
            {d.gastos.length === 0 ? (
                <p className="text-small text-ink-3">Aún no hay gastos. Registra flete, seguro, agente, almacén, derechos y lo que llegue después.</p>
            ) : (
                <>
                    <ul className="flex flex-col divide-y divide-divider">
                        {d.gastos.map((g) => (
                            <li key={g.id} className="flex items-start gap-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5 text-ui font-medium">
                                        {g.concepto}
                                        {g.entraCosto ? <Chip tone="info">Entra al costo</Chip> : <Chip tone="muted">No entra al costo</Chip>}
                                    </div>
                                    <div className="text-small text-ink-2">
                                        {[
                                            `${g.tipoComprobante}${g.nComprobante ? ` ${g.nComprobante}` : ''}`,
                                            g.emisor || (g.rucEmisor ? `RUC ${g.rucEmisor}` : ''),
                                            g.fechaComprobante ? dmy(g.fechaComprobante) : '',
                                            g.ocHija ? `OC ${g.ocHija}` : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </div>
                                    <div className="text-caption text-ink-3">Registró {nombre(g.registradoPor)}</div>
                                </div>
                                <div className="flex flex-none flex-col items-end gap-0.5">
                                    <span className={`text-ui tabular-nums ${g.tipoComprobante === 'Nota de crédito' ? 'text-success-strong' : ''}`}>
                                        {monto(g.tipoComprobante === 'Nota de crédito' ? -g.montoS : g.montoS)}
                                    </span>
                                    {g.moneda !== 'PEN' && (
                                        <span className="text-caption text-ink-3 tabular-nums">
                                            {monto(g.montoSinIgv, g.moneda)} × {tc(g.tcCosteo)}
                                        </span>
                                    )}
                                    {registra && (
                                        <span className="flex gap-1">
                                            <Button variant="ghost" iconOnly aria-label={`Editar ${g.concepto}`} onClick={() => setForm({ gasto: g })}>
                                                <Pencil size={15} aria-hidden />
                                            </Button>
                                            <Button variant="ghost" iconOnly aria-label={`Borrar ${g.concepto}`} onClick={() => setBorrando(g)}>
                                                <Trash2 size={15} aria-hidden />
                                            </Button>
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <dl className="grid grid-cols-2 gap-3 rounded-control bg-surface-2 px-3 py-2.5">
                        <div>
                            <dt className="text-caption text-ink-3">Entran al costo</dt>
                            <dd className="text-ui font-semibold tabular-nums">{monto(t.gastosCostoS)}</dd>
                        </div>
                        <div>
                            <dt className="text-caption text-ink-3">No entran (IGV, percepción…)</dt>
                            <dd className="text-ui tabular-nums">{monto(t.gastosFueraS)}</dd>
                        </div>
                    </dl>
                </>
            )}
            {registra && (
                <div>
                    <Button variant="secondary" onClick={() => setForm({})}>
                        <Plus size={16} aria-hidden /> Registrar gasto
                    </Button>
                </div>
            )}
            {form && <FormGasto d={d} gasto={form.gasto} onCerrar={() => setForm(null)} />}
            {borrando && <ConfirmarBorrado g={borrando} onCerrar={() => setBorrando(null)} />}
        </div>
    );
}

function ConfirmarBorrado({ g, onCerrar }: { g: GastoDes; onCerrar: () => void }) {
    const [error, setError] = useState<string | null>(null);
    const [borrando, setBorrando] = useState(false);
    async function borrar() {
        setBorrando(true);
        const r = await desaduanajes().borrarGasto(g.id);
        setBorrando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Gasto de ${g.concepto} borrado. Vuelve a calcular el costeo.`);
        refrescar(['des_gastos', 'desaduanajes']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={`Borrar el gasto de ${g.concepto}`}
            descripcion={`${monto(g.montoS)}. No se puede deshacer: si lo necesitas otra vez, regístralo de nuevo.`}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={borrando}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={() => void borrar()} disabled={borrando}>
                        {borrando ? 'Borrando…' : 'Borrar gasto'}
                    </Button>
                </>
            }
        >
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
