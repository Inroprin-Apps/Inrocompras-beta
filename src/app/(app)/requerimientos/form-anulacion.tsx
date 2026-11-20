'use client';

// Pedir la anulación del requerimiento entero o de un ítem (ac_anulacion_solicitar). Quién puede pedirla y si ya hay
// otra pendiente lo dice la base; el mensaje se muestra tal cual. La decide el jefe de quien la pide (Error de emisión)
// o los aprobadores de la solicitud.
import { useState } from 'react';
import { CAUSAS_ANULACION, faltaEnAnulacion, type CausaAnulacion, type ItemRequerimiento, type PedidoAnulacion } from '@/modules/requerimientos/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Textarea } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { ejecutarAccion } from '../_acciones/panel-acciones.tsx';
import { refrescar } from '../_lib/resource.ts';

export function FormAnulacion({
    requerimientoId,
    items,
    itemId,
    onCerrar,
    onPedida,
}: {
    requerimientoId: string;
    items: ItemRequerimiento[];
    itemId: string | null;
    onCerrar: () => void;
    onPedida?: (id: string) => void;
}) {
    const [f, setF] = useState<PedidoAnulacion>({ itemId, causa: '', motivo: '' });
    const [error, setError] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const vivos = items.filter((i) => !i.anulado);

    async function pedir() {
        const falta = faltaEnAnulacion(f);
        if (falta) return setError(falta);
        setEnviando(true);
        const r = await ejecutarAccion('ac_anulacion_solicitar', { p_req: requerimientoId, p_item: f.itemId, p_causa: f.causa, p_motivo: f.motivo.trim() });
        setEnviando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success('Anulación pedida. Te avisamos cuando la decidan.');
        refrescar(['anulaciones', 'requerimientos', 'acciones', 'te_toca', 'notificaciones']);
        if (typeof r.value.id === 'string') onPedida?.(r.value.id);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Pedir anulación"
            descripcion="No se anula al momento: la decide el jefe de quien la pide (si es un error de emisión) o quien liberó la solicitud."
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={enviando}>
                        Volver
                    </Button>
                    <Button variant="danger" onClick={() => void pedir()} disabled={enviando}>
                        {enviando ? 'Un momento…' : 'Pedir anulación'}
                    </Button>
                </>
            }
        >
            <Field label="Qué se anula">
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={f.itemId ?? ''}
                        onChange={(x) => setF({ ...f, itemId: x || null })}
                        options={[{ value: '', label: 'Todo el requerimiento' }, ...vivos.map((i) => ({ value: i.id, label: `Ítem ${i.nItem ?? '—'} · ${i.descripcion}` }))]}
                    />
                )}
            </Field>
            <Field label="Causa">
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={f.causa}
                        onChange={(c) => setF({ ...f, causa: c as CausaAnulacion })}
                        placeholder="Elige la causa"
                        options={CAUSAS_ANULACION.map((c) => ({ value: c, label: c }))}
                    />
                )}
            </Field>
            <Field label="Motivo">{(p) => <Textarea {...p} rows={3} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} />}</Field>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
