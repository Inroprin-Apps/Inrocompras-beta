'use client';

// Editar los datos del embarque: solo las columnas que permite app.proteger (UPDATE directo con RLS «editar»).
// El N° de DAM y las fechas de numeración, llegada, levante y almacén los registran las acciones, no este formulario.
import { useState } from 'react';
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import { MONEDAS_DAM, nombreDes, type DatosDes, type DesaduanajeDetalle } from '@/modules/desaduanaje/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { DateField } from '@/shared/ui/date-field.tsx';
import { Dialog, useCerrarConCambios } from '@/shared/ui/dialog.tsx';
import { Checkbox, Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';

export function FormDatos({ d, onCerrar }: { d: DesaduanajeDetalle; onCerrar: () => void }) {
    const [inicial] = useState<DatosDes>(() => ({
        agente: d.agente,
        blAwb: d.blAwb,
        fechaEmbarque: d.fechaEmbarque,
        fechaLlegadaEst: d.fechaLlegadaEst,
        monedaDam: d.monedaDam,
        requierePermiso: d.requierePermiso,
        tipoPermiso: d.tipoPermiso,
        comentario: d.comentario,
    }));
    const [x, setX] = useState<DatosDes>(inicial);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (p: Partial<DatosDes>) => setX((v) => ({ ...v, ...p }));
    const { cerrar, aviso } = useCerrarConCambios(JSON.stringify(x) !== JSON.stringify(inicial), onCerrar);

    async function guardar() {
        if (x.fechaEmbarque && x.fechaLlegadaEst && x.fechaLlegadaEst < x.fechaEmbarque)
            return setError('La llegada estimada es anterior al embarque. Revisa las dos fechas.');
        setGuardando(true);
        const r = await desaduanajes().guardarDatos(d.id, x);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Datos del embarque de ${nombreDes(d)} guardados.`);
        refrescar(['desaduanajes', 'acciones']);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            amplio
            titulo="Datos del embarque"
            pie={
                <>
                    <Button variant="secondary" onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar datos'}
                    </Button>
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Agente de aduanas" optional>
                    {(p) => <Input {...p} value={x.agente} onChange={(e) => set({ agente: e.target.value })} />}
                </Field>
                <Field label="BL / AWB" optional>
                    {(p) => <Input {...p} value={x.blAwb} onChange={(e) => set({ blAwb: e.target.value })} />}
                </Field>
                <div className="flex flex-col gap-1.5">
                    <span className="text-ui font-medium">
                        Embarque <span className="font-normal text-ink-3">(opcional)</span>
                    </span>
                    <DateField label="Fecha de embarque" value={x.fechaEmbarque ?? ''} onChange={(f) => set({ fechaEmbarque: f || null })} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className="text-ui font-medium">
                        Llegada estimada <span className="font-normal text-ink-3">(opcional)</span>
                    </span>
                    <DateField label="Fecha de llegada estimada" value={x.fechaLlegadaEst ?? ''} onChange={(f) => set({ fechaLlegadaEst: f || null })} />
                </div>
                <Field label="Moneda de la DAM">
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={x.monedaDam}
                            onChange={(monedaDam) => set({ monedaDam })}
                            options={MONEDAS_DAM.map((m) => ({ value: m, label: m }))}
                        />
                    )}
                </Field>
            </div>
            <Checkbox
                label="Requiere permiso (MTC, DIGESA…)"
                hint="Si lo requiere, el permiso entra en el checklist."
                checked={x.requierePermiso}
                onChange={(e) => set({ requierePermiso: e.target.checked })}
            />
            {x.requierePermiso && (
                <Field label="Tipo de permiso" hint="Por ejemplo: MTC, DIGESA, SENASA.">
                    {(p) => <Input {...p} value={x.tipoPermiso} onChange={(e) => set({ tipoPermiso: e.target.value })} />}
                </Field>
            )}
            <Field label="Comentario" optional>
                {(p) => <Textarea {...p} rows={3} value={x.comentario} onChange={(e) => set({ comentario: e.target.value })} />}
            </Field>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
