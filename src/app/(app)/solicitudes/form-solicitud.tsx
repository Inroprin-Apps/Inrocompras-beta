'use client';

// Alta y edición de la cabecera de una solicitud: tipo (Proyecto o Administrativa), el proyecto ganado y su etapa
// (sus aprobadores la liberan) o el jefe (la libera él), y el sustento. Crea el Borrador por insert (RLS «alta»).
// El borrador del formulario se guarda en este navegador mientras se escribe (docs/06 §9).
import { useEffect, useState } from 'react';
import { solicitudes } from '@/modules/solicitudes/composition.ts';
import { TIPOS_SOLICITUD, faltaEnSolicitud, type NuevaSolicitud, type Solicitud, type TipoSolicitud } from '@/modules/solicitudes/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Segmented } from '@/shared/ui/card.tsx';
import { Dialog, useCerrarConCambios } from '@/shared/ui/dialog.tsx';
import { Field, Textarea } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { useBorrador } from '../_lib/borrador.ts';
import { refrescar } from '../_lib/resource.ts';
import { personasStore } from '../_lib/stores.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { miJefeStore } from './store.ts';

const VACIA: NuevaSolicitud = { tipo: 'Proyecto', proyectoId: null, etapaId: null, jefeId: null, sustento: '' };

export function FormSolicitud({ solicitud, onCerrar, onCreado }: { solicitud?: Solicitud; onCerrar: () => void; onCreado: (id: string) => void }) {
    const perfil = usePerfil();
    const todos = personasStore.use().data ?? [];
    const gente = todos.filter((g) => g.activo && g.id !== perfil.id);
    const proyectos = (proyectosStore.use().data ?? []).filter((p) => p.estado === 'Ganado' || p.id === solicitud?.proyectoId);
    const miJefe = miJefeStore.use().data ?? null;
    const inicial: NuevaSolicitud = solicitud
        ? { tipo: solicitud.tipo, proyectoId: solicitud.proyectoId, etapaId: solicitud.etapaId, jefeId: solicitud.jefeId, sustento: solicitud.sustento }
        : VACIA;
    const [f, setF, olvidar] = useBorrador<NuevaSolicitud>(solicitud ? `solicitud:${solicitud.id}` : 'solicitud:nueva', inicial);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (patch: Partial<NuevaSolicitud>) => setF({ ...f, ...patch });
    const sucio = JSON.stringify(f) !== JSON.stringify(inicial);
    const { cerrar, aviso } = useCerrarConCambios(sucio, onCerrar);

    // Una administrativa sin jefe elegido propone el que asignó el administrador en Equipo.
    useEffect(() => {
        if (f.tipo === 'Administrativa' && !f.jefeId && miJefe) setF({ ...f, jefeId: miJefe });
    }, [f, miJefe, setF]);

    const proyecto = proyectos.find((p) => p.id === f.proyectoId) ?? null;
    const etapas = proyecto?.etapas ?? [];
    const nombre = (id: string) => todos.find((g) => g.id === id)?.nombre ?? '';

    async function guardar() {
        const falta = faltaEnSolicitud(f);
        if (falta) return setError(falta);
        setGuardando(true);
        const r = solicitud ? (await solicitudes().editar(solicitud.id, f)).map(() => solicitud.id) : await solicitudes().crear(f);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        olvidar();
        toast.success(solicitud ? `Solicitud ${solicitud.numero || 'en borrador'} guardada.` : 'Borrador de solicitud creado. Ahora agrega los ítems.');
        refrescar(['solicitudes', 'acciones']);
        onCreado(r.value);
    }

    return (
        <Dialog
            abierto
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            titulo={solicitud ? 'Editar solicitud' : 'Nueva solicitud'}
            descripcion={solicitud ? undefined : 'Se crea como borrador. Después agregas los ítems (uno a uno o desde Excel) y la emites.'}
            pie={
                <>
                    <Button variant="secondary" onClick={cerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? (solicitud ? 'Guardando…' : 'Creando…') : solicitud ? 'Guardar solicitud' : 'Crear borrador'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-1.5">
                <span className="text-ui font-medium">Tipo</span>
                <Segmented<TipoSolicitud> options={TIPOS_SOLICITUD.map((t) => ({ value: t, label: t }))} value={f.tipo} onChange={(tipo) => set({ tipo })} />
            </div>
            {f.tipo === 'Proyecto' ? (
                <>
                    <Field label="Proyecto" hint={proyectos.length ? 'Solo proyectos ganados.' : 'No hay proyectos ganados todavía.'}>
                        {(p) => (
                            <SelectMenu
                                {...p}
                                value={f.proyectoId ?? ''}
                                onChange={(id) => {
                                    const pr = proyectos.find((x) => x.id === id);
                                    set({ proyectoId: id || null, etapaId: pr?.etapas.length === 1 ? pr.etapas[0].id : null });
                                }}
                                placeholder="Elige el proyecto"
                                options={proyectos.map((x) => ({ value: x.id, label: x.codigo ? `${x.codigo} · ${x.nombre}` : x.nombre }))}
                            />
                        )}
                    </Field>
                    <Field
                        label="Etapa"
                        hint={
                            proyecto && !etapas.length
                                ? 'El proyecto no tiene etapas: pide al gerente del proyecto que las cree.'
                                : 'Los aprobadores de la etapa liberan la solicitud.'
                        }
                    >
                        {(p) => (
                            <SelectMenu
                                {...p}
                                disabled={!proyecto}
                                value={f.etapaId ?? ''}
                                onChange={(etapaId) => set({ etapaId: etapaId || null })}
                                placeholder={proyecto ? 'Elige la etapa' : 'Primero elige el proyecto'}
                                options={etapas.map((e) => ({
                                    value: e.id,
                                    label: `${e.nombre}${e.aprobadores.length ? ` · ${e.aprobadores.map(nombre).filter(Boolean).join(', ')}` : ' · sin aprobadores'}`,
                                }))}
                            />
                        )}
                    </Field>
                </>
            ) : (
                <Field
                    label="Jefe que la libera"
                    hint={miJefe ? 'Tu jefe según Equipo. Cámbialo solo si corresponde a otra persona.' : 'Elige a tu jefe directo.'}
                >
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={f.jefeId ?? ''}
                            onChange={(jefeId) => set({ jefeId: jefeId || null })}
                            placeholder="Elige a tu jefe"
                            options={gente.map((g) => ({ value: g.id, label: `${g.nombre} · ${g.area}` }))}
                        />
                    )}
                </Field>
            )}
            <Field label="Sustento" hint="Para qué se necesita y por qué. Lo lee quien la libera.">
                {(p) => <Textarea {...p} rows={3} value={f.sustento} onChange={(e) => set({ sustento: e.target.value })} />}
            </Field>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
