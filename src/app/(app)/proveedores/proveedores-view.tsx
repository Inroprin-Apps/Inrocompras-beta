'use client';

// Proveedores: la lista (filtros, orden y página en la URL: ?origen=&eval=&verif=&texto=&orden=&pag=&ver=) y la
// ficha lateral con «Lo que te toca» (evaluar, verificar retención, pedir evaluación), los datos y las cuentas.
// La bandeja «Te toca» y las notificaciones abren la ficha con ?ver=<id>.
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
    EVALUACIONES,
    FILTROS_PROVEEDOR,
    columnasExcelProveedores,
    ORIGENES,
    etiquetaEvaluacion,
    filtrarProveedores,
    identificacion,
    ordenarProveedores,
    retencion,
    tonoEvaluacion,
    type OrdenProveedor,
} from '@/modules/proveedores/application/views.ts';
import { FilterRow, SearchBox, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Encabezado } from '@/shared/ui/encabezado.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { BotonExportar } from '../_components/exportar.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { urlState } from '../_lib/url-state.ts';
import { FichaProveedor } from './ficha-proveedor.tsx';
import { FormProveedor } from './form-proveedor.tsx';
import { puedeEditarProveedores } from './permisos.ts';
import { proveedoresStore } from './store.ts';

const ORDENES: { value: OrdenProveedor; label: string }[] = [
    { value: 'nombre', label: 'Razón social' },
    { value: 'recientes', label: 'Más recientes' },
];

const COLUMNAS_EXCEL = columnasExcelProveedores();

const vista$ = urlState(
    { ...FILTROS_PROVEEDOR, orden: 'nombre' as OrdenProveedor, page: '1', ver: '' },
    { origen: 'origen', evaluacion: 'eval', verificado: 'verif', texto: 'texto', orden: 'orden', page: 'pag', ver: 'ver' },
    { origen: ['', ...ORIGENES], evaluacion: ['', ...EVALUACIONES], verificado: ['', 'si', 'no'], orden: ORDENES.map((o) => o.value) },
);

export function ProveedoresView() {
    const perfil = usePerfil();
    const estado = proveedoresStore.use();
    const v = vista$.use();
    const [creando, setCreando] = useState(false);

    const lista = useMemo(() => ordenarProveedores(filtrarProveedores(estado.data ?? [], v), v.orden), [estado.data, v]);
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const abierto = estado.data?.find((p) => p.id === v.ver) ?? null;
    const filtrando = Boolean(v.origen || v.evaluacion || v.verificado || v.texto);

    return (
        <>
            <Encabezado
                titulo="Proveedores"
                actualizado={estado.actualizado}
                accion={
                    puedeEditarProveedores(perfil) && (
                        <Button onClick={() => setCreando(true)}>
                            <Plus size={16} aria-hidden /> Nuevo proveedor
                        </Button>
                    )
                }
            />
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por razón social, RUC, país o contacto" />
                <SelectMenu
                    label="Origen"
                    className="w-40"
                    value={v.origen}
                    onChange={(o) => vista$.set({ origen: o as typeof v.origen })}
                    options={[{ value: '', label: 'Todo origen' }, ...ORIGENES.map((o) => ({ value: o, label: o }))]}
                />
                <SelectMenu
                    label="Evaluación financiera"
                    className="w-60"
                    value={v.evaluacion}
                    onChange={(e) => vista$.set({ evaluacion: e as typeof v.evaluacion })}
                    options={[{ value: '', label: 'Toda evaluación' }, ...EVALUACIONES.map((e) => ({ value: e, label: etiquetaEvaluacion(e) }))]}
                />
                <SelectMenu
                    label="Retención verificada por Contabilidad"
                    className="w-44"
                    value={v.verificado}
                    onChange={(x) => vista$.set({ verificado: x as typeof v.verificado })}
                    options={[
                        { value: '', label: 'Toda retención' },
                        { value: 'si', label: 'Verificada' },
                        { value: 'no', label: 'Por verificar' },
                    ]}
                />
                <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                    <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
                    <BotonExportar nombre="Proveedores" columnas={COLUMNAS_EXCEL} filas={lista} />
                </div>
            </FilterRow>
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void proveedoresStore.retry()}
                vacia={
                    <ListaVacia titulo={filtrando ? 'Ningún proveedor coincide' : 'Aún no hay proveedores'}>
                        {filtrando ? (
                            <>
                                <p>Prueba con otra búsqueda o quita los filtros.</p>
                                <Button className="mt-4" variant="secondary" onClick={() => vista$.set({ ...FILTROS_PROVEEDOR })}>
                                    Quitar filtros
                                </Button>
                            </>
                        ) : (
                            'Compras, Importaciones o Finanzas los dan de alta con «Nuevo proveedor».'
                        )}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Proveedor</th>
                                        <th className={T.th}>Origen</th>
                                        <th className={T.th}>Evaluación financiera</th>
                                        <th className={T.th}>Retención</th>
                                        <th className={T.th}>Contacto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((p) => {
                                        const r = retencion(p);
                                        return (
                                            <tr
                                                key={p.id}
                                                tabIndex={0}
                                                className={`${T.row} cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${v.ver === p.id ? 'bg-primary-soft' : ''}`}
                                                onClick={() => vista$.set({ ver: p.id })}
                                                onKeyDown={(e) => e.key === 'Enter' && vista$.set({ ver: p.id })}
                                            >
                                                <td className={T.td}>
                                                    <div className="font-medium">{p.razonSocial}</div>
                                                    <div className={`${T.sub} whitespace-nowrap`}>{identificacion(p) || '—'}</div>
                                                </td>
                                                <td className={T.td}>{p.origen}</td>
                                                <td className={T.td}>
                                                    <Chip tone={tonoEvaluacion(p.evaluacion)}>{etiquetaEvaluacion(p.evaluacion)}</Chip>
                                                </td>
                                                <td className={T.td}>
                                                    <Chip tone={r.tono}>{r.texto}</Chip>
                                                </td>
                                                <td className={T.td}>
                                                    {p.contacto || p.correo ? (
                                                        <>
                                                            <div>{p.contacto || p.correo}</div>
                                                            {p.contacto && p.correo && <div className={T.sub}>{p.correo}</div>}
                                                        </>
                                                    ) : (
                                                        <span className="text-ink-3">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {abierto && <FichaProveedor proveedor={abierto} onCerrar={() => vista$.set({ ver: '' })} />}
            {v.ver && estado.data && !abierto && (
                <p role="status" className="mt-3 text-small text-ink-2">
                    No se encontró ese proveedor. Puede que lo hayan borrado: búscalo en la lista.
                </p>
            )}
            {creando && (
                <FormProveedor
                    existentes={estado.data ?? []}
                    onCerrar={() => setCreando(false)}
                    onGuardado={(id) => (setCreando(false), vista$.set({ ver: id }))}
                    onVer={(id) => (setCreando(false), vista$.set({ ver: id }))}
                />
            )}
        </>
    );
}
