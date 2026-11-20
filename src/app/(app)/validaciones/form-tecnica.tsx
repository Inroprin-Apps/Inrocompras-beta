'use client';

// Registrar la validación técnica de uno o varios ítems (ac_item_tecnica, uno por uno). Validado lleva marca y modelo;
// Observado, el motivo; No aplica, nada. Si algún ítem falla, se dice cuál y por qué (el texto de la base).
import { useState } from 'react';
import { RESULTADOS_TECNICA, TECNICA_VACIA, faltaEnTecnica, paramsTecnica, type FormTecnica, type ItemTecnica, type ResultadoTecnica } from '@/modules/requerimientos/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Segmented } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { ejecutarAccion } from '../_acciones/panel-acciones.tsx';
import { refrescar } from '../_lib/resource.ts';

/** Los campos del formulario, para el diálogo en bloque y para la ficha de un ítem. */
export function CamposTecnica({ f, onChange }: { f: FormTecnica; onChange: (f: FormTecnica) => void }) {
    const set = (p: Partial<FormTecnica>) => onChange({ ...f, ...p });
    return (
        <>
            <div className="flex flex-col gap-1.5">
                <span className="text-ui font-medium">Resultado</span>
                <Segmented<ResultadoTecnica> options={RESULTADOS_TECNICA.map((r) => ({ value: r, label: r }))} value={f.resultado} onChange={(resultado) => set({ resultado })} />
            </div>
            {f.resultado === 'Validado' && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Marca">{(p) => <Input {...p} value={f.marca} onChange={(e) => set({ marca: e.target.value })} />}</Field>
                    <Field label="Modelo">{(p) => <Input {...p} value={f.modelo} onChange={(e) => set({ modelo: e.target.value })} />}</Field>
                </div>
            )}
            <Field label={f.resultado === 'Observado' ? 'Qué observas' : 'Comentario'} optional={f.resultado !== 'Observado'}>
                {(p) => <Textarea {...p} rows={2} value={f.motivo} onChange={(e) => set({ motivo: e.target.value })} />}
            </Field>
        </>
    );
}

export interface Fallo {
    item: ItemTecnica;
    mensaje: string;
}

/** Ejecuta la validación para cada ítem, de a uno; devuelve los que fallaron con su motivo. */
export async function validarItems(items: ItemTecnica[], f: FormTecnica): Promise<Fallo[]> {
    const fallos: Fallo[] = [];
    for (const i of items) {
        const r = await ejecutarAccion('ac_item_tecnica', paramsTecnica(i.id, f));
        if (r.isErr()) fallos.push({ item: i, mensaje: r.error.message });
    }
    refrescar(['requerimiento_items', 'acciones', 'te_toca']);
    return fallos;
}

export function DialogoTecnica({ items, onCerrar, onHecho }: { items: ItemTecnica[]; onCerrar: () => void; onHecho: (fallos: Fallo[]) => void }) {
    const [f, setF] = useState<FormTecnica>(TECNICA_VACIA);
    const [error, setError] = useState<string | null>(null);
    const [haciendo, setHaciendo] = useState(false);

    async function confirmar() {
        const falta = faltaEnTecnica(f);
        if (falta) return setError(falta);
        setHaciendo(true);
        const fallos = await validarItems(items, f);
        setHaciendo(false);
        const bien = items.length - fallos.length;
        if (bien) toast.success(`${bien} ${bien === 1 ? 'ítem quedó' : 'ítems quedaron'} como «${f.resultado}».`);
        if (fallos.length) toast.error(`${fallos.length} no se pudieron registrar. Mira el detalle arriba de la lista.`);
        onHecho(fallos);
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={items.length === 1 ? 'Validación técnica' : `Validación técnica de ${items.length} ítems`}
            descripcion={items.length === 1 ? items[0].descripcion : 'El mismo resultado, marca y modelo para todos los marcados.'}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={haciendo}>
                        Volver
                    </Button>
                    <Button onClick={() => void confirmar()} disabled={haciendo}>
                        {haciendo ? 'Registrando…' : `Registrar ${f.resultado.toLowerCase()}`}
                    </Button>
                </>
            }
        >
            <CamposTecnica f={f} onChange={setF} />
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
