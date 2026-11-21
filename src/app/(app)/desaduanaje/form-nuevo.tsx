'use client';

// «Nuevo desaduanaje»: busca una OC de importación aprobada, elige tipo y alcance, y llama a ac_des_crear.
// La base decide si se puede (área, procedencia, aprobación, anulación) y trae las líneas de la OC como productos.
import { useMemo, useState } from 'react';
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import { ALCANCES, TIPOS_DES, filtrarOcs, monto, type Alcance, type TipoDes } from '@/modules/desaduanaje/application/views.ts';
import { SearchBox } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field } from '@/shared/ui/field.tsx';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { ocsElegiblesStore } from './store.ts';

const op = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

export function FormNuevo({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (id: string) => void }) {
    const ocs = ocsElegiblesStore.use();
    const [texto, setTexto] = useState('');
    const [oc, setOc] = useState('');
    const [tipo, setTipo] = useState<TipoDes>('Marítimo');
    const [alcance, setAlcance] = useState<Alcance>('Total');
    const [error, setError] = useState<string | null>(null);
    const [creando, setCreando] = useState(false);
    const lista = useMemo(() => filtrarOcs(ocs.data ?? [], texto).slice(0, 30), [ocs.data, texto]);
    const elegida = ocs.data?.find((o) => o.id === oc);

    async function crear() {
        if (!oc) return setError('Elige la orden de importación.');
        setCreando(true);
        const r = await desaduanajes().crear(oc, tipo, alcance);
        setCreando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success('Desaduanaje creado. Completa el checklist para avanzar.');
        refrescar(['desaduanajes', 'te_toca', 'acciones']);
        void fetch('/api/cola/despertar', { method: 'POST' }).catch(() => {});
        onCreado(r.value);
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Nuevo desaduanaje"
            descripcion="De una orden de importación aprobada. Trae sus líneas como productos."
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={creando}>
                        Volver
                    </Button>
                    <Button onClick={() => void crear()} disabled={creando || !oc}>
                        {creando ? 'Creando…' : 'Crear desaduanaje'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-2">
                <span className="text-ui font-medium">Orden de importación</span>
                <SearchBox value={texto} onChange={setTexto} placeholder="Busca por número, proveedor o proyecto" />
                {ocs.error ? (
                    <p className="text-small text-danger-strong">{ocs.error}</p>
                ) : !ocs.data ? (
                    <Hueco className="h-24 w-full" />
                ) : lista.length === 0 ? (
                    <p className="text-small text-ink-3">
                        {ocs.data.length
                            ? 'Ninguna orden coincide con la búsqueda.'
                            : 'No hay órdenes de importación aprobadas. Una orden aparece aquí cuando la gerencia la aprueba.'}
                    </p>
                ) : (
                    <ul
                        role="listbox"
                        aria-label="Órdenes de importación"
                        className="flex max-h-60 flex-col divide-y divide-divider overflow-y-auto rounded-control border border-line"
                    >
                        {lista.map((o) => (
                            <li key={o.id} role="option" aria-selected={o.id === oc}>
                                <button
                                    type="button"
                                    onClick={() => (setOc(o.id), setError(null))}
                                    className={`flex w-full items-start gap-3 px-3 py-2 text-left ${o.id === oc ? 'bg-primary-soft' : 'hover:bg-surface-2'} focus-visible:outline-2 focus-visible:outline-primary`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="text-ui font-medium">{o.numero}</div>
                                        <div className="truncate text-small text-ink-2">
                                            {[o.proveedor || 'Sin proveedor', o.proyecto].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                    <div className="text-right text-small">
                                        <div className="tabular-nums">{monto(o.monto, o.moneda)}</div>
                                        {o.desaduanajes > 0 && (
                                            <div className="text-ink-3">
                                                {o.desaduanajes} ya creado{o.desaduanajes > 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {elegida && elegida.desaduanajes > 0 && (
                    <p className="text-small text-ink-2">Esta orden ya tiene desaduanaje: el nuevo trae solo las cantidades que faltan (embarque parcial).</p>
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo">{(p) => <SelectMenu {...p} value={tipo} onChange={(t) => setTipo(t as TipoDes)} options={op(TIPOS_DES)} />}</Field>
                <Field label="Alcance">{(p) => <SelectMenu {...p} value={alcance} onChange={(a) => setAlcance(a as Alcance)} options={op(ALCANCES)} />}</Field>
            </div>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
