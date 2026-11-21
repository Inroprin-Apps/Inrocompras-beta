'use client';

// Cuadro de aprobaciones: la hoja OC del AppSheet con sus 35 columnas (v_cuadro_aprobaciones, 0040), ancha y con
// desplazamiento horizontal; la orden queda fija a la izquierda. Filtros en la URL
// (?estatus=&aprob=&proc=&empresa=&desde=&hasta=&texto=&pag=) y descarga a Excel o CSV con los encabezados exactos
// y en su orden (lo filtrado). Un clic en una fila abre la orden (/ordenes?ver=<id>).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileDown, FileSpreadsheet, Smartphone } from 'lucide-react';
import { exportarCuadro } from '@/modules/cuadro/composition.ts';
import {
    COLUMNAS_CUADRO,
    FILTROS_CUADRO,
    filtrarCuadro,
    nombreArchivo,
    ordenarCuadro,
    textoCelda,
    type FilaCuadro,
} from '@/modules/cuadro/application/views.ts';
import { ESTADOS_APROBACION, ESTATUS, PROCEDENCIAS } from '@/modules/ordenes/application/views.ts';
import { hoyLima } from '@/modules/pagos/application/views.ts';
import { CONTROL, FilterRow, SearchBox } from '@/shared/ui/bits.tsx';
import { Button, LINK_CLASS, buttonClass } from '@/shared/ui/button.tsx';
import { Encabezado } from '@/shared/ui/encabezado.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { catalogosStore } from '../_lib/stores.ts';
import { urlState } from '../_lib/url-state.ts';
import { PorFirmar } from './por-firmar.tsx';
import { cuadroStore } from './store.ts';

const vista$ = urlState(
    { ...FILTROS_CUADRO, page: '1' },
    { estatus: 'estatus', aprobacion: 'aprob', procedencia: 'proc', empresa: 'empresa', desde: 'desde', hasta: 'hasta', texto: 'texto', page: 'pag' },
    { procedencia: ['', ...PROCEDENCIAS] },
);

// La orden va fija a la izquierda; el resto, en el orden de la hoja.
const RESTO = COLUMNAS_CUADRO.filter((c) => c.titulo !== 'OC');
const OC = COLUMNAS_CUADRO.find((c) => c.titulo === 'OC')!;

export function CuadroView() {
    const perfil = usePerfil();
    const router = useRouter();
    const estado = cuadroStore.use();
    const empresas = catalogosStore.use().data?.empresas;
    const v = vista$.use();
    const [bajando, setBajando] = useState<'excel' | 'csv' | null>(null);

    const lista = useMemo(() => ordenarCuadro(filtrarCuadro(estado.data ?? [], v)), [estado.data, v]);
    const pag = usePaged(lista, lista, 50, vista$.usePage());
    const aprobador = perfil.roles.some((r) => r === 'CONTROL_GESTION' || r === 'GOP' || r === 'GAF');

    if (!perfil.ve_precios) {
        return (
            <>
                <Encabezado titulo="Cuadro de aprobaciones" />
                <ListaVacia titulo="El cuadro lleva montos">Tu perfil no ve precios. El avance de cada ítem está en Seguimiento.</ListaVacia>
            </>
        );
    }

    async function bajar(tipo: 'excel' | 'csv') {
        setBajando(tipo);
        const archivo = nombreArchivo(hoyLima());
        const r = tipo === 'excel' ? await exportarCuadro().excel(lista, archivo) : exportarCuadro().csv(lista, archivo);
        setBajando(null);
        if (r.isErr()) toast.error(r.error.message);
        else
            toast.success(
                `Cuadro de aprobaciones descargado en ${tipo === 'excel' ? 'Excel' : 'CSV'}: ${lista.length === 1 ? '1 orden' : `${lista.length} órdenes`}.`,
            );
    }

    const conFiltros = Object.entries(FILTROS_CUADRO).some(([k, d]) => v[k as keyof typeof FILTROS_CUADRO] !== d);
    const abrir = (f: FilaCuadro) => router.push(`/ordenes?ver=${f.id}`);

    return (
        <>
            <Encabezado
                titulo="Cuadro de aprobaciones"
                actualizado={estado.actualizado}
                accion={
                    aprobador && (
                        <Link href="/cuadro/aprobar" className={`${buttonClass('primary')} max-md:hidden`}>
                            <Smartphone size={16} aria-hidden /> Ver órdenes por firmar
                        </Link>
                    )
                }
            />
            {aprobador && (
                // En el celular, lo primero es lo que espera tu firma (criterio D: aprobar en 3 toques).
                <section className="mb-6 md:hidden">
                    <PorFirmar />
                </section>
            )}
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por OC, proveedor, proyecto, comprador o RC" />
                <SelectMenu
                    label="Estatus"
                    className="w-60"
                    value={v.estatus}
                    onChange={(estatus) => vista$.set({ estatus })}
                    options={[{ value: '', label: 'Todos los estatus' }, ...ESTATUS.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Estado de aprobación"
                    className="w-52"
                    value={v.aprobacion}
                    onChange={(aprobacion) => vista$.set({ aprobacion })}
                    options={[{ value: '', label: 'Toda aprobación' }, ...ESTADOS_APROBACION.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Procedencia"
                    className="w-48"
                    value={v.procedencia}
                    onChange={(procedencia) => vista$.set({ procedencia })}
                    options={[{ value: '', label: 'Toda procedencia' }, ...PROCEDENCIAS.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Empresa"
                    className="w-48"
                    value={v.empresa}
                    onChange={(empresa) => vista$.set({ empresa })}
                    options={[{ value: '', label: 'Todas las empresas' }, ...(empresas ?? []).map((e) => ({ value: e.id, label: e.razonSocial }))]}
                />
                <label className="flex items-center gap-1.5 text-small text-ink-2">
                    Desde
                    <input
                        type="date"
                        aria-label="Desde"
                        value={v.desde}
                        onChange={(e) => vista$.set({ desde: e.target.value })}
                        className={`${CONTROL} w-40`}
                    />
                </label>
                <label className="flex items-center gap-1.5 text-small text-ink-2">
                    Hasta
                    <input
                        type="date"
                        aria-label="Hasta"
                        value={v.hasta}
                        onChange={(e) => vista$.set({ hasta: e.target.value })}
                        className={`${CONTROL} w-40`}
                    />
                </label>
                {conFiltros && (
                    <Button variant="ghost" onClick={() => vista$.reset()}>
                        Quitar filtros
                    </Button>
                )}
                <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                    <Button variant="secondary" disabled={!estado.data || !lista.length || !!bajando} onClick={() => void bajar('excel')}>
                        <FileSpreadsheet size={16} aria-hidden /> {bajando === 'excel' ? 'Descargando…' : 'Descargar Excel'}
                    </Button>
                    <Button variant="secondary" disabled={!estado.data || !lista.length || !!bajando} onClick={() => void bajar('csv')}>
                        <FileDown size={16} aria-hidden /> {bajando === 'csv' ? 'Descargando…' : 'Descargar CSV'}
                    </Button>
                </div>
            </FilterRow>
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void cuadroStore.retry()}
                vacia={
                    <ListaVacia titulo={conFiltros ? 'Ninguna orden coincide' : 'Aún no hay órdenes'}>
                        {conFiltros ? (
                            <>
                                <p>Prueba con otra búsqueda, otras fechas o quita los filtros.</p>
                                <Button className="mt-4" variant="secondary" onClick={() => vista$.set({ ...FILTROS_CUADRO })}>
                                    Quitar filtros
                                </Button>
                            </>
                        ) : (
                            'Cuando Compras arme una orden, aparecerá aquí.'
                        )}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <p className="mb-2 text-small text-ink-3">
                            {lista.length === 1 ? '1 orden' : `${lista.length} órdenes`} · desliza a los lados para ver las {COLUMNAS_CUADRO.length} columnas
                        </p>
                        <div className="max-h-[70dvh] overflow-auto rounded-card border border-line">
                            <table className="w-max border-separate border-spacing-0 text-small">
                                <thead>
                                    <tr className="text-left">
                                        <th className="sticky top-0 left-0 z-20 border-r border-b border-divider-strong bg-surface-2 px-3 py-2.5 font-medium text-ink-2">
                                            {OC.titulo}
                                        </th>
                                        {RESTO.map((c) => (
                                            <th
                                                key={c.titulo}
                                                className={`sticky top-0 z-10 border-b border-divider-strong bg-surface-2 px-3 py-2.5 font-medium whitespace-nowrap text-ink-2 ${c.tipo === 'moneda' || c.tipo === 'pct' || c.tipo === 'entero' ? 'text-right' : ''}`}
                                            >
                                                {c.titulo}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((f) => (
                                        <tr
                                            key={f.id}
                                            tabIndex={0}
                                            className="group cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                                            onClick={() => abrir(f)}
                                            onKeyDown={(e) => e.key === 'Enter' && abrir(f)}
                                        >
                                            <td className="sticky left-0 z-[5] border-r border-b border-divider bg-surface px-3 py-2.5 font-medium whitespace-nowrap group-hover:bg-surface-2">
                                                <Link href={`/ordenes?ver=${f.id}`} onClick={(e) => e.stopPropagation()} className={LINK_CLASS}>
                                                    {textoCelda(OC, f.valores.OC) || 'Borrador'}
                                                </Link>
                                            </td>
                                            {RESTO.map((c) => {
                                                const t = textoCelda(c, f.valores[c.titulo], f.valores);
                                                const num = c.tipo === 'moneda' || c.tipo === 'pct' || c.tipo === 'entero';
                                                return (
                                                    <td
                                                        key={c.titulo}
                                                        className={`border-b border-divider px-3 py-2.5 align-top group-hover:bg-surface-2 ${num ? 'text-right whitespace-nowrap tabular-nums' : ''}`}
                                                        style={{ maxWidth: `${Math.max(c.ancho, 8)}ch` }}
                                                    >
                                                        {c.tipo === 'url' && t ? (
                                                            <a
                                                                href={t}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className={LINK_CLASS}
                                                            >
                                                                Abrir carpeta
                                                            </a>
                                                        ) : t ? (
                                                            <span className={`block ${num || c.ancho <= 14 ? 'whitespace-nowrap' : 'line-clamp-2'}`} title={t}>
                                                                {t}
                                                            </span>
                                                        ) : (
                                                            <span className="text-ink-3">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
        </>
    );
}
