'use client';

// Registrar o corregir un gasto del desaduanaje. El concepto dice si entra al costo y cómo se reparte (lo fija la base);
// el TC de costeo se sugiere: el congelado si la DAM ya está numerada, si no el vigente a la fecha del comprobante.
import { useMemo, useState } from 'react';
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import {
    MONEDAS_GASTO,
    TIPOS_COMPROBANTE,
    aNuevoGasto,
    faltaEnGasto,
    gastoVacio,
    hoyLima,
    leerNumero,
    monto,
    montoS,
    tcSugerido,
    type DesaduanajeDetalle,
    type GastoDes,
    type MonedaGasto,
    type NuevoGasto,
    type TipoComprobante,
} from '@/modules/desaduanaje/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { DateField } from '@/shared/ui/date-field.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { ordenesStore } from '../ordenes/store.ts';
import { conceptosGastoStore, tcCosteoStore } from './store.ts';

const op = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

export function FormGasto({ d, gasto, onCerrar }: { d: DesaduanajeDetalle; gasto?: GastoDes; onCerrar: () => void }) {
    const conceptos = conceptosGastoStore.use().data ?? [];
    const tcs = tcCosteoStore.use().data ?? [];
    const ordenesLeidos = ordenesStore.use().data;
    const ordenes = useMemo(() => ordenesLeidos ?? [], [ordenesLeidos]);
    const [g, setG] = useState<NuevoGasto>(gasto ? aNuevoGasto(gasto) : gastoVacio(d.monedaDam === 'EUR' ? 'EUR' : 'USD'));
    const [montoTxt, setMontoTxt] = useState(gasto ? String(gasto.montoSinIgv) : '');
    // null = usar el sugerido; texto = lo que escribió la persona.
    const [tcTxt, setTcTxt] = useState<string | null>(gasto && gasto.moneda !== 'PEN' ? String(gasto.tcCosteo) : null);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (p: Partial<NuevoGasto>) => setG((x) => ({ ...x, ...p }));

    const sugerido = tcSugerido(g.moneda, g.fechaComprobante ?? hoyLima(), d, tcs);
    const tcFinal = g.moneda === 'PEN' ? 1 : tcTxt === null ? sugerido.tc : leerNumero(tcTxt);
    const montoN = leerNumero(montoTxt);
    const concepto = conceptos.find((c) => c.concepto === g.concepto);
    const activos = conceptos.filter((c) => c.activo || c.concepto === g.concepto);
    const hijas = useMemo(() => ordenes.filter((o) => o.numero && o.id !== d.ordenId), [ordenes, d.ordenId]);

    async function guardar() {
        const final: NuevoGasto = { ...g, montoSinIgv: montoN, tcCosteo: tcFinal };
        const falta = faltaEnGasto(final);
        if (falta) return setError(falta);
        setGuardando(true);
        const r = await desaduanajes().guardarGasto(d.id, final, gasto?.id);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(gasto ? 'Gasto corregido. Vuelve a calcular el costeo.' : 'Gasto registrado. Vuelve a calcular el costeo.');
        refrescar(['des_gastos', 'desaduanajes']);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={gasto ? 'Corregir gasto' : 'Registrar gasto'}
            descripcion="Montos sin IGV. El IGV y la percepción se registran con su concepto: no entran al costo."
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
                        Volver
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : gasto ? 'Guardar cambios' : 'Registrar gasto'}
                    </Button>
                </>
            }
        >
            <Field
                label="Concepto"
                hint={
                    concepto
                        ? `${concepto.entraCosto ? 'Entra al costo' : 'No entra al costo'}${concepto.entraCosto ? ` · se reparte por ${concepto.reparto === 'Valor' ? 'valor EXW' : 'cantidad'}` : ''}.`
                        : undefined
                }
            >
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={g.concepto}
                        onChange={(c) => set({ concepto: c })}
                        options={[{ value: '', label: 'Elige el concepto' }, ...activos.map((c) => ({ value: c.concepto, label: c.concepto }))]}
                    />
                )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de comprobante">
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={g.tipoComprobante}
                            onChange={(t) => set({ tipoComprobante: t as TipoComprobante })}
                            options={op(TIPOS_COMPROBANTE)}
                        />
                    )}
                </Field>
                <Field label="N° de comprobante" optional>
                    {(p) => <Input {...p} value={g.nComprobante} onChange={(e) => set({ nComprobante: e.target.value })} placeholder="F001-123" />}
                </Field>
                <Field label="Emisor" optional>
                    {(p) => <Input {...p} value={g.emisor} onChange={(e) => set({ emisor: e.target.value })} />}
                </Field>
                <Field label="RUC del emisor" optional>
                    {(p) => (
                        <Input
                            {...p}
                            inputMode="numeric"
                            maxLength={11}
                            value={g.rucEmisor}
                            onChange={(e) => set({ rucEmisor: e.target.value.replace(/\D/g, '') })}
                        />
                    )}
                </Field>
                <div className="flex flex-col gap-1.5">
                    <span className="text-ui font-medium">
                        Fecha del comprobante <span className="font-normal text-ink-3">(opcional)</span>
                    </span>
                    <DateField label="Fecha del comprobante" value={g.fechaComprobante ?? ''} onChange={(f) => set({ fechaComprobante: f || null })} />
                </div>
                <Field label="Moneda">
                    {(p) => (
                        <SelectMenu {...p} value={g.moneda} onChange={(m) => (set({ moneda: m as MonedaGasto }), setTcTxt(null))} options={op(MONEDAS_GASTO)} />
                    )}
                </Field>
                <Field label="Monto sin IGV" hint={g.tipoComprobante === 'Nota de crédito' ? 'En positivo: el costeo lo resta.' : undefined}>
                    {(p) => <Input {...p} inputMode="decimal" value={montoTxt} onChange={(e) => setMontoTxt(e.target.value)} />}
                </Field>
                {g.moneda !== 'PEN' && (
                    <Field label="TC de costeo" hint={tcTxt === null ? sugerido.nota : 'Escrito a mano.'}>
                        {(p) => (
                            <Input
                                {...p}
                                inputMode="decimal"
                                value={tcTxt ?? (sugerido.tc != null ? String(sugerido.tc) : '')}
                                onChange={(e) => setTcTxt(e.target.value)}
                            />
                        )}
                    </Field>
                )}
            </div>
            {montoN != null && montoN > 0 && tcFinal != null && tcFinal > 0 && (
                <p className="text-small text-ink-2">
                    En soles: <span className="font-semibold text-ink tabular-nums">{monto(montoS(montoN, tcFinal))}</span>
                </p>
            )}
            <Field label="OC hija" optional hint="La orden nacional del servicio (flete local, agente…), si la hay.">
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={g.ocHijaId ?? ''}
                        onChange={(v) => set({ ocHijaId: v || null })}
                        options={[
                            { value: '', label: 'Sin OC hija' },
                            ...hijas.map((o) => ({ value: o.id, label: `${o.numero}${o.proveedor ? ` · ${o.proveedor}` : ''}` })),
                        ]}
                    />
                )}
            </Field>
            <Field label="Comentario" optional>
                {(p) => <Textarea {...p} rows={2} value={g.comentario} onChange={(e) => set({ comentario: e.target.value })} />}
            </Field>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
