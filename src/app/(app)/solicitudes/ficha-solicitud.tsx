'use client';

// La ficha de una solicitud: fases, «Lo que te toca» (emitir, liberar, rechazar, reenviar, cancelar, rehacer: de
// acciones_disponibles), los datos, los ítems (se editan en Borrador u Observada), la última carga desde Excel con
// sus filas en error, el requerimiento generado y el historial. «Rehacer» abre la solicitud nueva.
import { useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Pencil, Plus, Trash2 } from 'lucide-react';
import { solicitudes } from '@/modules/solicitudes/composition.ts';
import {
    FASES_SOLICITUD,
    aNuevoItem,
    esEditable,
    faseActual,
    tonoEstado,
    type ItemSolicitud,
    type NuevoItem,
    type Solicitud,
    type SolicitudDetalle,
} from '@/modules/solicitudes/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button, LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime, dmy } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { useBorrarConDeshacer } from '../_lib/deshacer.ts';
import { personasStore } from '../_lib/stores.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { CargaExcel } from './carga-excel.tsx';
import { FormItem } from './form-item.tsx';
import { FormSolicitud } from './form-solicitud.tsx';
import { solicitudStore } from './store.ts';
import { ListaItems, SeccionCarga } from './items-solicitud.tsx';

export function FichaSolicitud({
    id,
    onCerrar,
    onAbrir,
    onEliminarBorrador,
}: {
    id: string;
    onCerrar: () => void;
    onAbrir: (id: string) => void;
    /** Elimina el borrador con «Deshacer»: la lista lo oculta y la ficha se cierra al momento. */
    onEliminarBorrador: (s: Solicitud) => void;
}) {
    const { data, error } = solicitudStore.use(id);
    if (error)
        return (
            <Ficha titulo="Solicitud" onCerrar={onCerrar}>
                <div className="px-5 py-4">
                    <Notice tone="danger" cerrable={false}>
                        {error}
                    </Notice>
                </div>
            </Ficha>
        );
    if (!data)
        return (
            <Ficha titulo={<Hueco className="h-6 w-48" />} onCerrar={onCerrar}>
                <div className="flex flex-col gap-3 px-5 py-4">
                    <Hueco className="h-5 w-full" />
                    <Hueco className="h-16 w-full" />
                    <Hueco className="h-32 w-full" />
                </div>
            </Ficha>
        );
    return <FichaCargada key={data.solicitud.id} d={data} onCerrar={onCerrar} onAbrir={onAbrir} onEliminarBorrador={onEliminarBorrador} />;
}

function FichaCargada({
    d,
    onCerrar,
    onAbrir,
    onEliminarBorrador,
}: {
    d: SolicitudDetalle;
    onCerrar: () => void;
    onAbrir: (id: string) => void;
    onEliminarBorrador: (s: Solicitud) => void;
}) {
    const { solicitud: s, carga } = d;
    const { ocultos, borrar } = useBorrarConDeshacer();
    const items = d.items.filter((i) => !ocultos.has(i.id));
    const perfil = usePerfil();
    const gente = personasStore.use().data ?? [];
    const proyectos = proyectosStore.use().data ?? [];
    const [editando, setEditando] = useState(false);
    const [item, setItem] = useState<NuevoItem | 'nuevo' | null>(null);
    const [cargando, setCargando] = useState(false);
    const nombre = (x: string | null) => (x ? (gente.find((g) => g.id === x)?.nombre ?? '') : '');
    const proyecto = proyectos.find((p) => p.id === s.proyectoId) ?? null;
    const etapa = proyecto?.etapas.find((e) => e.id === s.etapaId) ?? null;
    const editable = esEditable(s, perfil.id);

    const quitarItem = (i: ItemSolicitud) =>
        borrar(i.id, {
            aviso: `Ítem «${i.descripcion}» quitado de ${s.numero || 'el borrador'}.`,
            ejecutar: () => solicitudes().borrarItem(i.id),
            tocadas: ['solicitud_items'],
        });

    return (
        <Ficha
            titulo={s.numero || 'Borrador de solicitud'}
            subtitulo={
                s.tipo === 'Proyecto'
                    ? [proyecto?.nombre, etapa?.nombre].filter(Boolean).join(' · ') || 'Proyecto'
                    : `Administrativa · libera ${nombre(s.jefeId) || 'su jefe'}`
            }
            estado={<Chip tone={tonoEstado(s.estado)}>{s.estado}</Chip>}
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-4 border-b border-divider px-5 py-4">
                <Fases pasos={FASES_SOLICITUD} actual={faseActual(s.estado)} />
                {s.estado === 'Observada' && s.motivoObservacion && (
                    <Notice tone="warning" cerrable={false}>
                        Observada: «{s.motivoObservacion}». Corrige los ítems y pulsa «Corregir y reenviar».
                    </Notice>
                )}
                {s.estado === 'Rechazada' && s.motivoRechazo && (
                    <Notice tone="danger" cerrable={false}>
                        Rechazada: «{s.motivoRechazo}».
                    </Notice>
                )}
                {s.estado === 'Cancelada' && s.motivoCancelacion && (
                    <Notice tone="info" cerrable={false}>
                        Cancelada: «{s.motivoCancelacion}».
                    </Notice>
                )}
                {s.nuevaSolicitudId && (
                    <p className="text-small text-ink-2">
                        Se rehízo en otra solicitud.{' '}
                        <button type="button" className={LINK_CLASS} onClick={() => onAbrir(s.nuevaSolicitudId!)}>
                            Abrir la nueva
                        </button>
                    </p>
                )}
                <PanelAcciones
                    tabla="solicitudes"
                    id={s.id}
                    nombre={s.numero}
                    tocadas={['solicitudes', 'solicitud_items', 'requerimientos', 'requerimiento_items']}
                    onHecho={(a, r) => {
                        if (a.accion === 'rehacer' && typeof r.id === 'string') onAbrir(r.id);
                    }}
                    vacio={editable ? 'Agrega los ítems y el sustento; el botón para emitir aparece cuando esté lista.' : 'Por ahora no te toca nada aquí.'}
                />
            </div>
            <FichaSeccion
                titulo="Datos"
                accion={
                    editable && (
                        <Button variant="ghost" onClick={() => setEditando(true)}>
                            <Pencil size={15} /> Editar solicitud
                        </Button>
                    )
                }
            >
                <Datos
                    filas={[
                        ['Tipo', s.tipo],
                        ...(s.tipo === 'Proyecto'
                            ? ([
                                  ['Proyecto', proyecto ? [proyecto.codigo, proyecto.nombre].filter(Boolean).join(' · ') : ''],
                                  [
                                      'Etapa',
                                      etapa
                                          ? `${etapa.nombre}${etapa.aprobadores.length ? ` (libera ${etapa.aprobadores.map(nombre).filter(Boolean).join(', ')})` : ' (sin aprobadores)'}`
                                          : '',
                                  ],
                              ] as [string, string][])
                            : ([['Jefe que la libera', nombre(s.jefeId)]] as [string, string][])),
                        ['Solicitante', nombre(s.solicitanteId)],
                        ['Creada', dmy(s.creado)],
                        ['Sustento', s.sustento],
                        ...(s.liberadoPor ? ([['Liberada por', `${nombre(s.liberadoPor)} · ${dayTime(s.fechaLiberacion)}`]] as [string, string][]) : []),
                    ]}
                />
                {s.estado === 'Borrador' && s.solicitanteId === perfil.id && (
                    <div className="mt-3">
                        <Button variant="ghost" className="text-danger-strong" onClick={() => onEliminarBorrador(s)}>
                            <Trash2 size={15} /> Eliminar borrador
                        </Button>
                    </div>
                )}
            </FichaSeccion>
            <FichaSeccion
                titulo={`Ítems (${items.length})`}
                accion={
                    editable && (
                        <div className="flex gap-1.5">
                            <Button variant="ghost" onClick={() => setCargando(true)}>
                                <FileSpreadsheet size={15} /> Cargar Excel
                            </Button>
                            <Button variant="dashed" onClick={() => setItem('nuevo')}>
                                <Plus size={15} /> Agregar ítem
                            </Button>
                        </div>
                    )
                }
            >
                <ListaItems items={items} editable={editable} verMontos={perfil.ve_precios} onEditar={(i) => setItem(aNuevoItem(i))} onQuitar={quitarItem} />
            </FichaSeccion>
            {carga.length > 0 && <SeccionCarga filas={carga} editable={editable} />}
            {s.requerimientoId && (
                <FichaSeccion titulo="Requerimiento">
                    <Link href={`/requerimientos?ver=${s.requerimientoId}`} className={`${LINK_CLASS} text-ui`}>
                        {d.requerimientoNumero ?? 'Requerimiento en proceso'}
                    </Link>
                    {d.requerimientoEstado && <span className="ml-2 text-small text-ink-2">{d.requerimientoEstado}</span>}
                </FichaSeccion>
            )}
            <FichaSeccion titulo="Historial">
                <Historial tabla="solicitudes" id={s.id} />
            </FichaSeccion>
            {editando && <FormSolicitud solicitud={s} onCerrar={() => setEditando(false)} onCreado={() => setEditando(false)} />}
            {item && <FormItem solicitudId={s.id} item={item === 'nuevo' ? undefined : item} items={items} onCerrar={() => setItem(null)} />}
            {cargando && <CargaExcel solicitudId={s.id} items={items} onCerrar={() => setCargando(false)} />}
        </Ficha>
    );
}
