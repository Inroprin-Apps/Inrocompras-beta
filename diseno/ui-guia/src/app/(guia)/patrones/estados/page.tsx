'use client';

import { useState } from 'react';
import { FileSearch, Lock, RefreshCw, SearchX, WifiOff } from 'lucide-react';
import { DocTable, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { Empty, T } from '../../../../ui/bits.tsx';
import { Button } from '../../../../ui/button.tsx';
import { Card } from '../../../../ui/card.tsx';
import { Hueco } from '../../../../ui/hueco.tsx';
import type { ReactNode } from 'react';

type State = 'cargando' | 'vacio' | 'sin-resultados' | 'error' | 'sin-permiso';

/** El bloque grande que ocupa el lugar de una lista: icono, qué pasa y qué hacer. */
function BigState({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-surface-3 text-ink-2">{icon}</span>
            <p className="text-heading font-semibold">{title}</p>
            <p className="max-w-sm text-ui text-ink-2">{children}</p>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

export default function Estados() {
    const [state, setState] = useState<State>('cargando');

    const body: Record<State, ReactNode> = {
        cargando: (
            <table className={T.table}>
                <thead>
                    <tr className={T.headRow}>
                        <th className={T.th}>Proveedor</th>
                        <th className={T.thNum}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {[0, 1, 2, 3].map((i) => (
                        <tr key={i} className={T.row}>
                            <td className={T.td}>
                                <Hueco className="h-3.5 w-48" />
                                <div className="mt-1.5">
                                    <Hueco className="h-3 w-24" />
                                </div>
                            </td>
                            <td className={T.tdNum}>
                                <Hueco className="h-3.5 w-20" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ),
        vacio: (
            <BigState icon={<FileSearch size={22} />} title="Todavía no hay órdenes de compra" action={<Button>Crear la primera orden</Button>}>
                Las órdenes que crees aparecerán aquí, con su estado y sus comprobantes.
            </BigState>
        ),
        'sin-resultados': (
            <BigState icon={<SearchX size={22} />} title="Nada coincide con «papeles lima»" action={<Button variant="secondary">Quitar filtros</Button>}>
                Prueba con menos palabras o con el RUC. El filtro de estado «Pagados» también está puesto.
            </BigState>
        ),
        error: (
            <BigState
                icon={<WifiOff size={22} />}
                title="No se pudieron traer los comprobantes"
                action={
                    <Button variant="secondary">
                        <RefreshCw size={16} /> Reintentar
                    </Button>
                }
            >
                SUNAT no respondió a tiempo. Suele arreglarse solo en unos minutos; si sigue, avisa a sistemas.
            </BigState>
        ),
        'sin-permiso': (
            <BigState icon={<Lock size={22} />} title="Esta sección es solo para contabilidad">
                Si la necesitas, pide acceso al área de sistemas indicando para qué.
            </BigState>
        ),
    };

    return (
        <Page href="/patrones/estados">
            <PageHeader
                eyebrow="Patrones"
                title="Vacío, carga y error"
                lead="Cada lista tiene cinco estados además del normal, y los cinco se diseñan. El vacío y el error son, muchas veces, la primera impresión de una pantalla."
            />

            <Section title="Los cinco estados" blurb="Cambia de estado: la tarjeta y su título se quedan, solo cambia el contenido.">
                <Example>
                    <div className="mb-4 flex flex-wrap gap-1.5">
                        {(['cargando', 'vacio', 'sin-resultados', 'error', 'sin-permiso'] as State[]).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setState(s)}
                                className={`rounded-full px-3 py-1 text-small font-medium ${s === state ? 'bg-primary text-on-fill' : 'bg-surface text-ink-2 hover:bg-surface-2'}`}
                            >
                                {s.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                    <Card title="Órdenes de compra">{body[state]}</Card>
                </Example>
            </Section>

            <Section title="Cuál es cuál">
                <DocTable
                    head={['Estado', 'Qué dice', 'Qué ofrece']}
                    rows={[
                        ['Cargando', 'Nada: huecos con la forma final', '—'],
                        ['Vacío (no hay nada todavía)', 'Qué aparecerá aquí', 'Crear el primero'],
                        ['Sin resultados (filtros)', 'Qué se buscó y qué filtros hay', 'Quitar filtros'],
                        ['Error', 'Qué falló, en palabras del usuario, y si es pasajero', 'Reintentar, o a quién avisar'],
                        ['Sin permiso', 'Para quién es', 'Cómo pedir acceso'],
                    ]}
                />
                <Empty>El vacío pequeño (una línea) basta dentro de una tarjeta de tablero; el grande es para la lista principal de una pantalla.</Empty>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['El error nunca muestra el mensaje técnico al usuario.', '«ECONNRESET» va al registro; al usuario, «SUNAT no respondió a tiempo».'],
                        ['Sin culpar: «No se pudo guardar», no «Ingresaste mal los datos».', ''],
                        ['Si una parte de la pantalla falla, solo esa parte muestra el error.', 'Un KPI que falla no tumba el tablero entero.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
