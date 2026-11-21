'use client';

// Alta y edición de un ítem de la solicitud (mientras está en Borrador u Observada: RLS «escribir» de 0002).
// El presupuesto solo lo ve y escribe quien ve precios; el solicitante común no ve montos.
import { useState } from 'react';
import { solicitudes } from '@/modules/solicitudes/composition.ts';
import {
    CANALES,
    ITEM_VACIO,
    TIPOS_ITEM,
    UNIDADES,
    faltaEnItem,
    posiblesContenedores,
    siguienteNItem,
    type Canal,
    type ItemSolicitud,
    type NuevoItem,
    type TipoItem,
} from '@/modules/solicitudes/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { DateField } from '@/shared/ui/date-field.tsx';
import { Dialog, useCerrarConCambios } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { useBorrador } from '../_lib/borrador.ts';
import { refrescar } from '../_lib/resource.ts';
import { catalogosStore } from '../_lib/stores.ts';

export function FormItem({
    solicitudId,
    item,
    items,
    onCerrar,
}: {
    solicitudId: string;
    /** El ítem a editar; sin él, uno nuevo. */
    item?: NuevoItem;
    items: ItemSolicitud[];
    onCerrar: () => void;
}) {
    const perfil = usePerfil();
    const monedas = catalogosStore.use().data?.monedas ?? [];
    const inicial: NuevoItem = item ?? { ...ITEM_VACIO, nItem: siguienteNItem(items) };
    const [f, setF, olvidar] = useBorrador<NuevoItem>(item?.id ? `item:${item.id}` : `item:nuevo:${solicitudId}`, inicial);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (patch: Partial<NuevoItem>) => setF({ ...f, ...patch });
    const sucio = JSON.stringify(f) !== JSON.stringify(inicial);
    const { cerrar, aviso } = useCerrarConCambios(sucio, onCerrar);
    const contenedores = posiblesContenedores(items, f.id);
    const tieneHijos = !!f.id && items.some((i) => i.incluidoEn === f.id);

    async function guardar(otro: boolean) {
        const falta = faltaEnItem(f);
        if (falta) return setError(falta);
        setGuardando(true);
        const r = await solicitudes().guardarItem(solicitudId, f);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        olvidar();
        toast.success(f.id ? `Ítem «${f.descripcion.trim()}» guardado.` : `Ítem «${f.descripcion.trim()}» agregado.`);
        refrescar(['solicitud_items', 'acciones']);
        if (otro) {
            setError(null);
            setF({
                ...ITEM_VACIO,
                nItem: (f.nItem ?? siguienteNItem(items)) + 1,
                plazoAdquisicion: f.plazoAdquisicion,
                canal: f.canal,
                monedaPpto: f.monedaPpto,
            });
        } else onCerrar();
    }

    return (
        <Dialog
            abierto
            amplio
            onCerrar={cerrar}
            onEnviar={() => void guardar(false)}
            aviso={aviso}
            titulo={f.id ? `Editar ítem ${f.nItem ?? ''}`.trim() : 'Nuevo ítem'}
            pie={
                <>
                    <Button variant="secondary" onClick={cerrar}>
                        Cancelar
                    </Button>
                    {!f.id && (
                        <Button variant="secondary" onClick={() => void guardar(true)} disabled={guardando}>
                            Guardar y agregar otro
                        </Button>
                    )}
                    <Button type="submit" disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar ítem'}
                    </Button>
                </>
            }
        >
            <div className="grid grid-cols-[5rem_1fr] gap-4">
                <Field label="N°">
                    {(p) => (
                        <Input
                            {...p}
                            inputMode="numeric"
                            value={f.nItem ?? ''}
                            onChange={(e) => set({ nItem: e.target.value.replace(/\D/g, '') ? Number(e.target.value.replace(/\D/g, '')) : null })}
                        />
                    )}
                </Field>
                <Field label="Tipo">
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={f.tipo}
                            onChange={(t) => set({ tipo: t as TipoItem })}
                            options={TIPOS_ITEM.map((t) => ({ value: t, label: t }))}
                        />
                    )}
                </Field>
            </div>
            <Field label="Descripción" hint="Como la pide el cliente o el área.">
                {(p) => <Input {...p} value={f.descripcion} onChange={(e) => set({ descripcion: e.target.value })} />}
            </Field>
            <Field label="Detalle" optional hint="Especificación técnica, medidas, material.">
                {(p) => <Textarea {...p} rows={2} value={f.detalle} onChange={(e) => set({ detalle: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Código cliente" optional hint="EQU-…, COMPL-…">
                    {(p) => <Input {...p} value={f.codigoCliente} onChange={(e) => set({ codigoCliente: e.target.value })} />}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Cantidad">
                        {(p) => <Input {...p} inputMode="decimal" value={f.cantidad} onChange={(e) => set({ cantidad: e.target.value })} />}
                    </Field>
                    <Field label="Unidad">
                        {(p) => <Input {...p} list="unidades-item" value={f.unidad} onChange={(e) => set({ unidad: e.target.value.toUpperCase() })} />}
                    </Field>
                    <datalist id="unidades-item">
                        {UNIDADES.map((u) => (
                            <option key={u} value={u} />
                        ))}
                    </datalist>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-ui font-medium">
                        Plazo de adquisición <span className="ml-1.5 font-normal text-ink-3">(opcional)</span>
                    </span>
                    <DateField label="Plazo de adquisición" value={f.plazoAdquisicion ?? ''} onChange={(d) => set({ plazoAdquisicion: d || null })} />
                    <p className="text-small text-ink-3">Fecha en que se necesita.</p>
                </div>
                <Field label="Canal" optional>
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={f.canal ?? ''}
                            onChange={(c) => set({ canal: (c || null) as Canal | null })}
                            options={[{ value: '', label: 'Por definir' }, ...CANALES.map((c) => ({ value: c, label: c }))]}
                        />
                    )}
                </Field>
                {perfil.ve_precios && (
                    <div className="grid grid-cols-[1fr_6rem] gap-3 sm:col-span-2">
                        <Field label="Presupuesto unitario" optional>
                            {(p) => <Input {...p} inputMode="decimal" value={f.presupuestoUnit} onChange={(e) => set({ presupuestoUnit: e.target.value })} />}
                        </Field>
                        <Field label="Moneda">
                            {(p) => (
                                <SelectMenu
                                    {...p}
                                    value={f.monedaPpto ?? 'PEN'}
                                    onChange={(monedaPpto) => set({ monedaPpto })}
                                    options={monedas.map((m) => ({ value: m.id, label: m.id }))}
                                />
                            )}
                        </Field>
                    </div>
                )}
                <Field
                    label="Incluido en"
                    optional
                    hint={tieneHijos ? 'Tiene accesorios incluidos: no puede ir dentro de otro.' : 'Accesorio que viene con su equipo: no se compra aparte.'}
                >
                    {(p) => (
                        <SelectMenu
                            {...p}
                            disabled={tieneHijos}
                            value={f.incluidoEn ?? ''}
                            onChange={(x) => set({ incluidoEn: x || null })}
                            options={[
                                { value: '', label: 'Se compra aparte' },
                                ...contenedores.map((i) => ({ value: i.id, label: `${i.nItem ?? '—'} · ${i.descripcion}` })),
                            ]}
                        />
                    )}
                </Field>
                <Field label="Link de referencia" optional>
                    {(p) => (
                        <Input {...p} type="url" value={f.referenciaLink} onChange={(e) => set({ referenciaLink: e.target.value })} placeholder="https://" />
                    )}
                </Field>
            </div>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
