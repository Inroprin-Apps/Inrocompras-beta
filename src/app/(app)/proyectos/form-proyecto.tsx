'use client';

// Alta y edición de un proyecto. El borrador se guarda en este navegador mientras se escribe (docs/06 §9:
// si se cae internet, no se pierde) y se borra al guardar.
import { useState } from 'react';
import { proyectos } from '@/modules/proyectos/composition.ts';
import { faltaEnProyecto, type NuevoProyecto, type Proyecto } from '@/modules/proyectos/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog, useCerrarConCambios } from '@/shared/ui/dialog.tsx';
import { Field, Input } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { useBorrador } from '../_lib/borrador.ts';
import { refrescar } from '../_lib/resource.ts';
import { catalogosStore, personasStore } from '../_lib/stores.ts';

const VACIO: NuevoProyecto = { codigo: '', nombre: '', cliente: '', empresaId: 'INROPRIN', gerenteId: null, fechaMeta: null, lugarEntrega: '' };

export function FormProyecto({ proyecto, onCerrar, onCreado }: { proyecto?: Proyecto; onCerrar: () => void; onCreado: (id: string) => void }) {
    const gente = (personasStore.use().data ?? []).filter((g) => g.activo);
    const empresas = catalogosStore.use().data?.empresas ?? [];
    const inicial: NuevoProyecto = proyecto
        ? {
              codigo: proyecto.codigo,
              nombre: proyecto.nombre,
              cliente: proyecto.cliente,
              empresaId: proyecto.empresaId,
              gerenteId: proyecto.gerenteId,
              fechaMeta: proyecto.fechaMeta,
              lugarEntrega: proyecto.lugarEntrega,
          }
        : VACIO;
    const [f, setF, olvidar] = useBorrador<NuevoProyecto>(proyecto ? `proyecto:${proyecto.id}` : 'proyecto:nuevo', inicial);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (patch: Partial<NuevoProyecto>) => (setF({ ...f, ...patch }), setError(null));
    const sucio = JSON.stringify(f) !== JSON.stringify(inicial);
    const { cerrar, aviso } = useCerrarConCambios(sucio, onCerrar);
    const nombreProyecto = [f.codigo.trim(), f.nombre.trim()].filter(Boolean).join(' ');
    // El error de un campo va junto a él (guía, «Formulario»); abajo solo lo que dice la base.
    const [intento, setIntento] = useState(false);
    const errNombre = intento && !f.nombre.trim() ? 'Escribe el nombre del proyecto.' : null;

    async function guardar() {
        setIntento(true);
        const falta = faltaEnProyecto(f);
        if (falta) return setError(f.nombre.trim() ? falta : null);
        setGuardando(true);
        const r = proyecto ? (await proyectos().editar(proyecto.id, f)).map(() => proyecto.id) : await proyectos().crear(f);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        olvidar();
        toast.success(`Proyecto ${nombreProyecto} ${proyecto ? 'guardado' : 'creado'}.`);
        refrescar(['proyectos']);
        onCreado(r.value);
    }

    return (
        <Dialog
            abierto
            amplio
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            titulo={proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
            pie={
                <>
                    <Button variant="secondary" onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? (proyecto ? 'Guardando…' : 'Creando…') : proyecto ? 'Guardar proyecto' : 'Crear proyecto'}
                    </Button>
                </>
            }
        >
            <Field label="Nombre" error={errNombre}>
                {(p) => <Input {...p} value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Código" optional hint="Centro de costo o código interno.">
                    {(p) => <Input {...p} value={f.codigo} onChange={(e) => set({ codigo: e.target.value })} />}
                </Field>
                <Field label="Cliente" optional>
                    {(p) => <Input {...p} value={f.cliente} onChange={(e) => set({ cliente: e.target.value })} />}
                </Field>
                <Field label="Empresa">
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={f.empresaId}
                            onChange={(empresaId) => set({ empresaId })}
                            options={empresas.map((e) => ({ value: e.id, label: e.razonSocial }))}
                        />
                    )}
                </Field>
                <Field label="Gerente del proyecto" optional>
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={f.gerenteId ?? ''}
                            onChange={(g) => set({ gerenteId: g || null })}
                            placeholder="Sin gerente"
                            options={[{ value: '', label: 'Sin gerente' }, ...gente.map((g) => ({ value: g.id, label: g.nombre }))]}
                        />
                    )}
                </Field>
                <Field label="Fecha meta en almacén" optional hint="La usa el plan de compras para el semáforo.">
                    {(p) => <Input {...p} type="date" value={f.fechaMeta ?? ''} onChange={(e) => set({ fechaMeta: e.target.value || null })} />}
                </Field>
                <Field label="Lugar de entrega" optional>
                    {(p) => <Input {...p} value={f.lugarEntrega} onChange={(e) => set({ lugarEntrega: e.target.value })} />}
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
