'use client';

// La ficha de un desaduanaje: fases, «Lo que te toca» (acciones_disponibles: avanzar con N° de DAM y fecha, calcular,
// cerrar costeo, reabrir con motivo), checklist, datos editables, tipo de cambio (se congela al numerar la DAM),
// costeo con sus versiones, productos, gastos, documentos e historial.
import { useState } from 'react';
import { ExternalLink, Pencil } from 'lucide-react';
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import { TIPOS_DESADUANAJE } from '@/modules/documentos/application/views.ts';
import { FASES_DES, faseDes, nombreDes, tc, tonoEstadoDes, type DesaduanajeDetalle, type GastoDes } from '@/modules/desaduanaje/application/views.ts';
import { Button, LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime, dmy } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { Documentos } from '../_documentos/documentos.tsx';
import { useBorrarConDeshacer } from '../_lib/deshacer.ts';
import { personasStore } from '../_lib/stores.ts';
import { ChecklistDes } from './checklist.tsx';
import { Costeo } from './costeo.tsx';
import { FormDatos } from './form-datos.tsx';
import { Gastos } from './gastos.tsx';
import { Productos } from './productos.tsx';
import { desaduanajeStore } from './store.ts';

const TOCADAS = ['desaduanajes', 'des_productos', 'des_gastos', 'des_costeo_hist'] as const;

export function FichaDesaduanaje({ id, onCerrar }: { id: string; onCerrar: () => void }) {
    const { data: d, error } = desaduanajeStore.use(id);
    if (!d)
        return (
            <Ficha titulo={error ? 'No se pudo abrir el desaduanaje' : 'Cargando el desaduanaje…'} onCerrar={onCerrar}>
                <div className="flex flex-col gap-3 px-5 py-4">
                    {error ? <p className="text-ui text-danger-strong">{error}</p> : [1, 2, 3].map((i) => <Hueco key={i} className="h-16 w-full" />)}
                </div>
            </Ficha>
        );
    return <FichaCargada d={d} onCerrar={onCerrar} />;
}

function FichaCargada({ d: leido, onCerrar }: { d: DesaduanajeDetalle; onCerrar: () => void }) {
    const perfil = usePerfil();
    const gente = personasStore.use().data;
    const [editando, setEditando] = useState(false);
    // Borrar un gasto no pregunta: se oculta (en la lista, el conteo y el costeo) y el aviso ofrece «Deshacer» unos
    // segundos antes de borrarlo en la base.
    const { ocultos, borrar } = useBorrarConDeshacer();
    const d = ocultos.size ? { ...leido, gastos: leido.gastos.filter((g) => !ocultos.has(g.id)) } : leido;
    const borrarGasto = (g: GastoDes) =>
        borrar(g.id, {
            aviso: `Gasto de ${g.concepto} borrado. Vuelve a calcular el costeo.`,
            ejecutar: () => desaduanajes().borrarGasto(g.id),
            tocadas: ['des_gastos', 'desaduanajes'],
        });
    const nombre = (u: string | null) => (u ? (gente?.find((g) => g.id === u)?.nombre ?? 'Otra persona') : '');
    const cerrado = d.estado === 'Costeo cerrado';
    // Comodidad: lo decide RLS (0002 «editar» de desaduanajes y des_productos; 0050 para des_gastos).
    const edita = perfil.es_compras && !cerrado;
    const registraGastos = (perfil.es_compras || perfil.area === 'Contabilidad') && !cerrado;
    const subeDocs = perfil.es_compras || perfil.area === 'Contabilidad';

    return (
        <Ficha
            titulo={nombreDes(d)}
            subtitulo={[d.ordenNumero, d.proveedor || 'Sin proveedor', d.proyecto].filter(Boolean).join(' · ')}
            estado={
                <div className="flex flex-wrap gap-1.5">
                    <Chip tone={tonoEstadoDes(d.estado)}>{d.estado}</Chip>
                    <Chip tone="muted">
                        {d.tipo} · {d.alcance}
                    </Chip>
                    {d.versionCosteo > 0 && <Chip tone="muted">Costeo v{d.versionCosteo}</Chip>}
                </div>
            }
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-3 border-b border-divider px-5 py-4">
                <Fases pasos={FASES_DES} actual={faseDes(d.estado)} />
                {d.estado === 'En almacén' && d.motivoReapertura && d.versionCosteo > 0 && (
                    <p className="text-small text-warning-strong">
                        Costeo reabierto: «{d.motivoReapertura}». El próximo cierre será la versión {d.versionCosteo + 1}.
                    </p>
                )}
                <PanelAcciones tabla="desaduanajes" id={d.id} nombre={nombreDes(d)} tocadas={TOCADAS} />
            </div>

            {d.estado === 'Borrador' && (
                <FichaSeccion titulo="Checklist de documentos">
                    <ChecklistDes d={d} edita={edita} />
                </FichaSeccion>
            )}

            <FichaSeccion titulo="Costeo">
                <Costeo d={d} nombre={nombre} />
            </FichaSeccion>

            <FichaSeccion
                titulo="Datos del embarque"
                accion={
                    edita && (
                        <Button variant="ghost" onClick={() => setEditando(true)}>
                            <Pencil size={15} aria-hidden /> Editar datos
                        </Button>
                    )
                }
            >
                <Datos
                    filas={[
                        ['Orden dueña', d.ordenNumero],
                        ['Proveedor', d.proveedor],
                        ['Agente de aduanas', d.agente],
                        ['BL / AWB', d.blAwb],
                        ['Embarque', d.fechaEmbarque ? dmy(d.fechaEmbarque) : ''],
                        ['Llegada estimada', d.fechaLlegadaEst ? dmy(d.fechaLlegadaEst) : ''],
                        ['N° de DAM', d.nDam],
                        ['Moneda de la DAM', d.monedaDam],
                        ['Numeración', d.fechaNumeracion ? dmy(d.fechaNumeracion) : ''],
                        ['Llegada', d.fechaLlegada ? dmy(d.fechaLlegada) : ''],
                        ['Levante', d.fechaLevante ? dmy(d.fechaLevante) : ''],
                        ['Ingreso a almacén', d.fechaAlmacen ? dmy(d.fechaAlmacen) : ''],
                        ['Permiso', d.requierePermiso ? d.tipoPermiso || 'Sí, sin tipo' : 'No requiere'],
                        ['Creado por', `${nombre(d.creadoPor)}${d.creado ? ` · ${dayTime(d.creado)}` : ''}`],
                    ]}
                />
                {d.comentario && (
                    <div className="mt-2.5">
                        <div className="text-caption text-ink-3">Comentario</div>
                        <p className="text-ui whitespace-pre-line">{d.comentario}</p>
                    </div>
                )}
                {d.carpetaDriveUrl && (
                    <a href={d.carpetaDriveUrl} target="_blank" rel="noopener" className={`${LINK_CLASS} mt-2.5 inline-flex items-center gap-1 text-ui`}>
                        Carpeta en Drive <ExternalLink size={12} aria-hidden />
                    </a>
                )}
            </FichaSeccion>

            <FichaSeccion titulo="Tipo de cambio de costeo">
                <dl className="grid grid-cols-3 gap-3">
                    {(['USD', 'EUR', 'GBP'] as const).map((m) => (
                        <div key={m}>
                            <dt className="text-caption text-ink-3">{m}</dt>
                            <dd className="text-ui tabular-nums">{tc(m === 'USD' ? d.tcUsd : m === 'EUR' ? d.tcEur : d.tcGbp)}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-2 text-small text-ink-2">
                    {d.fechaNumeracion
                        ? `Congelado al numerar la DAM el ${dmy(d.fechaNumeracion)}: el costeo usa estos valores.`
                        : 'Referencial. Se congela con el TC de costeo vigente al numerar la DAM.'}
                </p>
            </FichaSeccion>

            {d.estado !== 'Borrador' && (
                <FichaSeccion titulo="Checklist de documentos">
                    <ChecklistDes d={d} edita={false} />
                </FichaSeccion>
            )}

            <FichaSeccion titulo={`Productos (${d.productos.length})`}>
                <Productos d={d} edita={edita} />
            </FichaSeccion>

            <FichaSeccion titulo={`Gastos (${d.gastos.length})`}>
                <Gastos d={d} registra={registraGastos} nombre={nombre} onBorrar={borrarGasto} />
            </FichaSeccion>

            <FichaSeccion titulo="Documentos">
                <Documentos
                    dueno={{ desaduanajeId: d.id }}
                    tipos={TIPOS_DESADUANAJE}
                    puedeSubir={subeDocs}
                    tocadas={['desaduanajes', 'acciones']}
                    moneda={d.monedaDam}
                />
            </FichaSeccion>

            <FichaSeccion titulo="Historial">
                <Historial tabla="desaduanajes" id={d.id} />
            </FichaSeccion>
            {editando && <FormDatos d={d} onCerrar={() => setEditando(false)} />}
        </Ficha>
    );
}
