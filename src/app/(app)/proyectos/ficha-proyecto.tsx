'use client';

// La ficha de un proyecto: fases, «Lo que te toca» (ganado / perdido, de acciones_disponibles), los datos,
// las etapas con sus aprobadores (quien libera las solicitudes de esa etapa) y el historial.
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { proyectos } from '@/modules/proyectos/composition.ts';
import { FASES_PROYECTO, etapasSinAprobador, faseActual, tonoEstado, type Etapa, type Proyecto } from '@/modules/proyectos/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input } from '@/shared/ui/field.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { MultiChoice } from '@/shared/ui/multi-choice.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { refrescar } from '../_lib/resource.ts';
import { catalogosStore, personasStore } from '../_lib/stores.ts';
import { FormProyecto } from './form-proyecto.tsx';

/** Quién edita los datos y las etapas (comodidad: RLS «editar»/«escribir» de 0002 decide). */
function puedeEditar(p: Proyecto, perfil: ReturnType<typeof usePerfil>) {
    return perfil.es_admin || p.gerenteId === perfil.id || ['Comercial', 'Control de Gestión', 'Planeamiento'].includes(perfil.area);
}

export function FichaProyecto({ proyecto: p, onCerrar }: { proyecto: Proyecto; onCerrar: () => void }) {
    const perfil = usePerfil();
    const gente = personasStore.use().data ?? [];
    const empresas = catalogosStore.use().data?.empresas ?? [];
    const [editando, setEditando] = useState(false);
    const [etapa, setEtapa] = useState<Partial<Etapa> | null>(null);
    const nombre = (id: string | null) => gente.find((g) => g.id === id)?.nombre ?? '';
    const editable = puedeEditar(p, perfil);
    const sinAprobador = etapasSinAprobador(p);

    async function borrarEtapa(e: Etapa) {
        const r = await proyectos().borrarEtapa(e.id);
        if (r.isErr()) return toast.error(r.error.message);
        toast.success(`Etapa «${e.nombre}» quitada.`);
        refrescar(['proyecto_etapas']);
    }

    return (
        <Ficha
            titulo={p.nombre}
            subtitulo={[p.codigo, p.cliente].filter(Boolean).join(' · ') || 'Sin código'}
            estado={<Chip tone={tonoEstado(p.estado)}>{p.estado}</Chip>}
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-4 border-b border-divider px-5 py-4">
                <Fases pasos={FASES_PROYECTO} actual={faseActual(p.estado)} />
                <PanelAcciones tabla="proyectos" id={p.id} tocadas={['proyectos', 'proyecto_etapas']} />
            </div>
            <FichaSeccion
                titulo="Datos"
                accion={
                    editable && (
                        <Button variant="ghost" onClick={() => setEditando(true)}>
                            <Pencil size={15} /> Editar
                        </Button>
                    )
                }
            >
                <Datos
                    filas={[
                        ['Código', p.codigo],
                        ['Cliente', p.cliente],
                        ['Empresa', empresas.find((e) => e.id === p.empresaId)?.razonSocial ?? p.empresaId],
                        ['Gerente del proyecto', nombre(p.gerenteId)],
                        ['Fecha meta en almacén', p.fechaMeta ? dmy(p.fechaMeta) : ''],
                        ['Lugar de entrega', p.lugarEntrega],
                    ]}
                />
            </FichaSeccion>
            <FichaSeccion
                titulo="Etapas y aprobadores"
                accion={
                    editable && (
                        <Button variant="dashed" onClick={() => setEtapa({ nombre: '', orden: (p.etapas.at(-1)?.orden ?? 0) + 1, aprobadores: [] })}>
                            <Plus size={15} /> Etapa
                        </Button>
                    )
                }
            >
                {sinAprobador.length > 0 && (
                    <Notice tone="warning" cerrable={false}>
                        {sinAprobador.map((e) => e.nombre).join(', ')}: sin aprobadores. Las solicitudes de esa etapa no se pueden emitir hasta que alguien la
                        libere.
                    </Notice>
                )}
                {p.etapas.length === 0 ? (
                    <p className="text-small text-ink-3">Sin etapas. Al marcar el proyecto como ganado se crea «General» con el gerente como aprobador.</p>
                ) : (
                    <ul className="flex flex-col divide-y divide-divider">
                        {p.etapas.map((e) => (
                            <li key={e.id} className="flex items-start gap-2 py-2">
                                <div className="min-w-0 flex-1">
                                    <div className="text-ui font-medium">{e.nombre}</div>
                                    <div className="text-small text-ink-2">{e.aprobadores.map(nombre).filter(Boolean).join(', ') || 'Sin aprobadores'}</div>
                                </div>
                                {editable && (
                                    <>
                                        <Button variant="ghost" iconOnly aria-label={`Editar ${e.nombre}`} onClick={() => setEtapa(e)}>
                                            <Pencil size={15} />
                                        </Button>
                                        <Button variant="ghost" iconOnly aria-label={`Quitar ${e.nombre}`} onClick={() => void borrarEtapa(e)}>
                                            <Trash2 size={15} />
                                        </Button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </FichaSeccion>
            <FichaSeccion titulo="Historial">
                <Historial tabla="proyectos" id={p.id} />
            </FichaSeccion>
            {editando && <FormProyecto proyecto={p} onCerrar={() => setEditando(false)} onCreado={() => setEditando(false)} />}
            {etapa && <FormEtapa proyectoId={p.id} etapa={etapa} onCerrar={() => setEtapa(null)} />}
        </Ficha>
    );
}

function FormEtapa({ proyectoId, etapa, onCerrar }: { proyectoId: string; etapa: Partial<Etapa>; onCerrar: () => void }) {
    const gente = (personasStore.use().data ?? []).filter((g) => g.activo);
    const [nombre, setNombre] = useState(etapa.nombre ?? '');
    const [aprobadores, setAprobadores] = useState<string[]>(etapa.aprobadores ?? []);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    async function guardar() {
        if (!nombre.trim()) return setError('Escribe el nombre de la etapa.');
        if (!aprobadores.length) return setError('Elige al menos un aprobador: sin él nadie libera las solicitudes.');
        setGuardando(true);
        const r = await proyectos().guardarEtapa(proyectoId, { id: etapa.id, nombre, orden: etapa.orden ?? 1, aprobadores });
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success('Etapa guardada.');
        refrescar(['proyecto_etapas']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={etapa.id ? 'Editar etapa' : 'Nueva etapa'}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar etapa'}
                    </Button>
                </>
            }
        >
            <Field label="Nombre" hint="Por ejemplo: Muestras, Adquisición, Transporte.">
                {(p) => <Input {...p} value={nombre} onChange={(e) => setNombre(e.target.value)} />}
            </Field>
            <div className="flex flex-col gap-1.5">
                <span className="text-ui font-medium">Aprobadores</span>
                <MultiChoice
                    values={aprobadores}
                    onChange={setAprobadores}
                    options={gente.map((g) => ({ value: g.id, label: g.nombre, detail: g.area }))}
                    noneLabel="Nadie por ahora"
                    countLabel={(n) => `${n} aprobadores`}
                />
            </div>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
