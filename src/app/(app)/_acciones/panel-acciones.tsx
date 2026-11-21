'use client';

// «Lo que te toca»: el recuadro azul de la ficha. Los botones salen de acciones_disponibles() (la UI no
// repite reglas): un solo principal, el resto secundarios, las peligrosas piden confirmar y motivo.
// Si la acción pide datos, se abre un diálogo con esos campos; el error de la base se muestra tal cual.
// Tras hacerla: aviso, y se recargan los almacenes de las tablas tocadas (`refrescar`).
import { useState } from 'react';
import { acciones } from '@/modules/acciones/composition.ts';
import {
    etiquetaCampo,
    faltante,
    necesitaDialogo,
    ordenar,
    parametroId,
    parametros,
    preguntables,
    valoresIniciales,
    type Accion,
    type Campo,
} from '@/modules/acciones/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { keyed, refrescar } from '../_lib/resource.ts';

const clave = (tabla: string, id: string) => `${tabla}:${id}`;
// Todas las tablas: cualquier acción puede cambiar los botones de otro registro.
const accionesStore = keyed<Accion[]>(
    (k) => {
        const [tabla, id] = k.split(':');
        return acciones().disponibles(tabla, id);
    },
    ['acciones'],
);

/** Ejecuta una acción con los parámetros dados (también la usan las acciones en bloque). */
export async function ejecutarAccion(funcion: string, params: Record<string, unknown>) {
    return acciones().ejecutar(funcion, params);
}

export function PanelAcciones({
    tabla,
    id,
    tocadas,
    onHecho,
    vacio = 'Por ahora no te toca nada aquí.',
}: {
    tabla: string;
    id: string;
    /** Tablas que cambian con estas acciones: se recargan sus listas. */
    tocadas: readonly string[];
    onHecho?: (accion: Accion, respuesta: Record<string, unknown>) => void;
    vacio?: string;
}) {
    const { data, error } = accionesStore.use(clave(tabla, id));
    const [abierta, setAbierta] = useState<Accion | null>(null);
    const [haciendo, setHaciendo] = useState<string | null>(null);

    async function hacer(a: Accion, valores: Record<string, string> = {}) {
        setHaciendo(a.accion);
        const r = await ejecutarAccion(a.funcion, parametros(a, parametroId(a.funcion), id, valores));
        setHaciendo(null);
        if (r.isErr()) return r.error.message;
        setAbierta(null);
        toast.success(`${a.etiqueta}: listo.`);
        refrescar([...tocadas, 'acciones', 'te_toca', 'notificaciones']);
        // La acción pudo encolar correos, PDF o Drive: se despierta la cola (en el plan Hobby el cron es diario).
        void fetch('/api/cola/despertar', { method: 'POST' }).catch(() => {});
        onHecho?.(a, r.value);
        return null;
    }

    async function pulsar(a: Accion) {
        if (necesitaDialogo(a)) return setAbierta(a);
        const e = await hacer(a);
        if (e) toast.error(e);
    }

    const lista = data ? ordenar(data) : null;
    return (
        <div className="rounded-card border border-primary-line bg-primary-soft px-4 py-3.5">
            <p className="mb-2.5 text-small font-semibold text-primary-strong">Lo que te toca</p>
            {error ? (
                <p className="text-small text-danger-strong">{error}</p>
            ) : !lista ? (
                <div className="flex gap-2">
                    <Hueco className="h-9 w-40" />
                    <Hueco className="h-9 w-28" />
                </div>
            ) : lista.length === 0 ? (
                <p className="text-small text-ink-2">{vacio}</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {lista.map((a) => (
                        <Button
                            key={a.accion}
                            variant={a.tipo === 'p' ? 'primary' : a.tipo === 'd' ? 'secondary' : 'secondary'}
                            className={a.tipo === 'd' ? 'text-danger-strong' : ''}
                            disabled={!!haciendo}
                            onClick={() => void pulsar(a)}
                        >
                            {haciendo === a.accion ? 'Un momento…' : a.etiqueta}
                        </Button>
                    ))}
                </div>
            )}
            {abierta && (
                <DialogoAccion
                    accion={abierta}
                    ocupado={haciendo === abierta.accion}
                    onCerrar={() => setAbierta(null)}
                    onConfirmar={(v) => hacer(abierta, v)}
                />
            )}
        </div>
    );
}

function DialogoAccion({
    accion,
    ocupado,
    onCerrar,
    onConfirmar,
}: {
    accion: Accion;
    ocupado: boolean;
    onCerrar: () => void;
    onConfirmar: (valores: Record<string, string>) => Promise<string | null>;
}) {
    const [valores, setValores] = useState(() => valoresIniciales(accion));
    const [error, setError] = useState<string | null>(null);
    const campos = preguntables(accion).filter((c) => c.tipo !== 'documento');
    async function confirmar() {
        const f = faltante(accion, valores);
        if (f) return setError(f);
        setError(await onConfirmar(valores));
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={accion.etiqueta}
            descripcion={accion.tipo === 'd' ? 'Esta acción no se deshace con un clic. Revisa antes de confirmar.' : undefined}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={ocupado}>
                        Volver
                    </Button>
                    <Button variant={accion.tipo === 'd' ? 'danger' : 'primary'} onClick={() => void confirmar()} disabled={ocupado}>
                        {ocupado ? 'Un momento…' : accion.etiqueta}
                    </Button>
                </>
            }
        >
            {campos.map((c) => (
                <CampoAccion key={c.campo} campo={c} valor={valores[c.campo] ?? ''} onChange={(v) => setValores((x) => ({ ...x, [c.campo]: v }))} />
            ))}
            {!campos.length && <p className="text-ui text-ink-2">¿Confirmas?</p>}
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}

function CampoAccion({ campo, valor, onChange }: { campo: Campo; valor: string; onChange: (v: string) => void }) {
    const label = etiquetaCampo(campo);
    return (
        <Field label={label} optional={campo.opcional}>
            {(p) =>
                campo.tipo === 'opcion' ? (
                    <SelectMenu {...p} value={valor} onChange={onChange} options={(campo.opciones ?? []).map((o) => ({ value: o, label: o }))} />
                ) : campo.tipo === 'texto' && campo.campo !== 'p_n_operacion' && campo.campo !== 'p_rq' && campo.campo !== 'p_n_dam' ? (
                    <Textarea {...p} value={valor} onChange={(e) => onChange(e.target.value)} rows={3} />
                ) : (
                    <Input
                        {...p}
                        value={valor}
                        onChange={(e) => onChange(e.target.value)}
                        type={campo.tipo === 'fecha' ? 'date' : campo.tipo === 'correo' ? 'email' : 'text'}
                        inputMode={campo.tipo === 'numero' ? 'decimal' : undefined}
                    />
                )
            }
        </Field>
    );
}
