'use client';

// Editar la cabecera de una orden editable: solo las columnas que permite app.proteger (UPDATE directo con RLS
// «editar») y después ac_oc_recalcular (montos, IGV, monto en soles y ruta de aprobación). Se muestra solo lo que
// aplica: incoterm y referencia en importación; IGV en nacional; % de adelanto o días de crédito según la forma de pago.
import { useState } from 'react';
import { ordenes } from '@/modules/ordenes/composition.ts';
import {
    CONDICIONES,
    FORMAS_PAGO,
    HITOS_SALDO,
    IMPUESTOS_NACIONAL,
    INCOTERMS,
    MONEDAS,
    faltaEnCabecera,
    leerNumero,
    pideAdelanto,
    pideCredito,
    type Cabecera,
    type FormaPago,
    type OrdenDetalle,
} from '@/modules/ordenes/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { catalogosStore } from '../_lib/stores.ts';
import { proveedoresStore } from './store.ts';

const op = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

export function FormCabecera({ o, onCerrar }: { o: OrdenDetalle; onCerrar: () => void }) {
    const proveedores = proveedoresStore.use().data ?? [];
    const conceptos = (catalogosStore.use().data?.conceptos ?? []).filter((c) => c.ambito === 'OC');
    const imp = o.procedencia === 'Importación';
    const [c, setC] = useState<Cabecera>(o.cabecera);
    const [pct, setPct] = useState(o.cabecera.pctAdelanto != null ? String(Math.round(o.cabecera.pctAdelanto * 100)) : '');
    const [dias, setDias] = useState(o.cabecera.diasCredito != null ? String(o.cabecera.diasCredito) : '');
    const [plazo, setPlazo] = useState(o.cabecera.plazoEntregaDias != null ? String(o.cabecera.plazoEntregaDias) : '');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (p: Partial<Cabecera>) => setC((x) => ({ ...x, ...p }));
    const deOrigen = proveedores.filter((p) => p.origen === (imp ? 'Extranjero' : 'Nacional'));

    async function guardar() {
        const pctN = leerNumero(pct);
        const diasN = leerNumero(dias);
        const plazoN = leerNumero(plazo);
        const final: Cabecera = {
            ...c,
            pctAdelanto: pideAdelanto(c.formaPago) && pctN != null ? Math.round(pctN * 100) / 10000 : null,
            hitoSaldo: pideAdelanto(c.formaPago) ? c.hitoSaldo : '',
            diasCredito: pideCredito(c.formaPago) && diasN != null ? Math.round(diasN) : null,
            plazoEntregaDias: plazoN != null ? Math.round(plazoN) : null,
            tipoImpuesto: imp ? 'Sin IGV' : c.tipoImpuesto,
        };
        const falta = faltaEnCabecera(final);
        if (falta) return setError(falta);
        setGuardando(true);
        const r = await ordenes().guardarCabecera(o.id, final);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success('Orden guardada y montos recalculados.');
        refrescar(['ordenes', 'acciones']);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Editar la orden"
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
                        Volver
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                </>
            }
        >
            <Field label="Proveedor" hint={imp ? 'Una importación lleva proveedor extranjero.' : 'Una compra nacional lleva proveedor nacional.'}>
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={c.proveedorId ?? ''}
                        onChange={(v) => set({ proveedorId: v || null, correoEnvio: c.correoEnvio || (proveedores.find((x) => x.id === v)?.correo ?? '') })}
                        options={deOrigen.map((x) => ({ value: x.id, label: `${x.razonSocial}${x.ruc ? ` · ${x.ruc}` : x.pais ? ` · ${x.pais}` : ''}` }))}
                    />
                )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Moneda">{(p) => <SelectMenu {...p} value={c.moneda} onChange={(moneda) => set({ moneda })} options={op(MONEDAS)} />}</Field>
                {imp ? (
                    <Field label="Incoterm" optional>
                        {(p) => (
                            <SelectMenu
                                {...p}
                                value={c.incoterm}
                                onChange={(incoterm) => set({ incoterm })}
                                options={[{ value: '', label: 'Sin incoterm' }, ...op(INCOTERMS)]}
                            />
                        )}
                    </Field>
                ) : (
                    <Field label="Impuesto">
                        {(p) => (
                            <SelectMenu {...p} value={c.tipoImpuesto} onChange={(tipoImpuesto) => set({ tipoImpuesto })} options={op(IMPUESTOS_NACIONAL)} />
                        )}
                    </Field>
                )}
                <Field label="Forma de pago">
                    {(p) => <SelectMenu {...p} value={c.formaPago} onChange={(f) => set({ formaPago: f as FormaPago })} options={op(FORMAS_PAGO)} />}
                </Field>
                {pideAdelanto(c.formaPago) && (
                    <Field label="% de adelanto" hint="Entre 1 y 99.">
                        {(p) => <Input {...p} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />}
                    </Field>
                )}
                {pideCredito(c.formaPago) && (
                    <Field label="Días de crédito">{(p) => <Input {...p} inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} />}</Field>
                )}
                {pideAdelanto(c.formaPago) && (
                    <Field label="Hito del saldo">
                        {(p) => (
                            <SelectMenu
                                {...p}
                                value={c.hitoSaldo}
                                onChange={(hitoSaldo) => set({ hitoSaldo })}
                                options={[{ value: '', label: 'Contra entrega' }, ...op(HITOS_SALDO.slice(1))]}
                            />
                        )}
                    </Field>
                )}
                <Field label="Condición">
                    {(p) => <SelectMenu {...p} value={c.condicion} onChange={(condicion) => set({ condicion })} options={op(CONDICIONES)} />}
                </Field>
                <Field label="Concepto" optional>
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={c.concepto}
                            onChange={(concepto) => set({ concepto })}
                            options={[{ value: '', label: 'Sin concepto' }, ...conceptos.map((x) => ({ value: x.id, label: x.id }))]}
                        />
                    )}
                </Field>
                <Field label="Plazo de entrega (días)" optional>
                    {(p) => <Input {...p} inputMode="numeric" value={plazo} onChange={(e) => setPlazo(e.target.value)} />}
                </Field>
                <Field label="Lugar de entrega" optional>
                    {(p) => <Input {...p} value={c.lugarEntrega} onChange={(e) => set({ lugarEntrega: e.target.value })} />}
                </Field>
                {imp && (
                    <Field label="Referencia del proveedor" optional hint="N° de proforma o PI.">
                        {(p) => <Input {...p} value={c.referenciaProv} onChange={(e) => set({ referenciaProv: e.target.value })} />}
                    </Field>
                )}
                <Field label="Correo de envío" optional hint="A dónde va la orden al enviarla.">
                    {(p) => <Input {...p} type="email" value={c.correoEnvio} onChange={(e) => set({ correoEnvio: e.target.value })} />}
                </Field>
            </div>
            <Field label="Términos" optional>
                {(p) => <Textarea {...p} rows={3} value={c.terminos} onChange={(e) => set({ terminos: e.target.value })} />}
            </Field>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
