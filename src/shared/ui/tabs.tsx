'use client';

// LA barra de pestañas. Viene de GRAMA (shared/ui/tabs). Los paneles llegan YA pintados (ReactNode por
// pestaña), así que cambiar de una a otra es instantáneo y solo del lado del cliente: sin pedir nada al
// servidor. QUÉ pestañas existen lo decide quien la usa; esto solo alterna cuál panel se ve.
//
// Cada pestaña tiene enlace propio: se sincroniza con el FRAGMENTO de la URL (`…/compras#pendientes`) y
// no con un `?tab=`. Un parámetro cambia la URL de la página y en el App Router eso es una navegación que
// vuelve a ejecutar el servidor; el fragmento no viaja al servidor. Se escribe con `history.replaceState`
// para que «Atrás» no recorra pestañas sino que vuelva de donde se vino.
//
// LÍMITE: UNA barra con `hash` por página (dos escribirían el mismo fragmento y se lo quitarían). Una
// segunda barra en la misma página lleva `hash={false}`.
import { useEffect, useState, type ReactNode } from 'react';

export interface TabDef {
    key: string;
    label: string;
    /** Cantidad junto a la etiqueta (un listado dice cuánto hay en cada pestaña). */
    count?: number;
}

export function Tabs({
    tabs,
    panels,
    variant = 'bar',
    hash = true,
}: {
    tabs: readonly TabDef[];
    panels: Record<string, ReactNode>;
    /**
     * `bar` = la barra subrayada. `chips` = píldoras: para cuando ya hay una barra encima, porque dos barras
     * subrayadas seguidas se leen como una jerarquía que no existe. Es el mismo componente y no una copia.
     */
    variant?: 'bar' | 'chips';
    /** Sincronizar con el fragmento de la URL. Una sola barra por página. */
    hash?: boolean;
}) {
    const [active, setActive] = useState(tabs[0]?.key ?? '');

    // El fragmento se lee DESPUÉS de montar y no durante el render: en el servidor no existe `location`, así
    // que sembrar el estado inicial con él haría que el HTML y la hidratación discreparan.
    useEffect(() => {
        if (!hash) return;
        const wanted = decodeURIComponent(window.location.hash.replace(/^#/, ''));
        // Solo una pestaña que EXISTE: un fragmento inventado no debe dejar la barra sin panel.
        if (wanted && tabs.some((t) => t.key === wanted)) setActive(wanted);
    }, [tabs, hash]);

    const select = (key: string) => {
        setActive(key);
        if (hash) window.history.replaceState(null, '', `#${key}`);
    };

    const chips = variant === 'chips';

    return (
        <div>
            <div role="tablist" className={`flex gap-1 ${chips ? 'flex-wrap' : 'no-scrollbar overflow-x-auto border-b border-control'}`}>
                {tabs.map((t) => {
                    const on = active === t.key;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => select(t.key)}
                            className={`flex items-center gap-1.5 text-body font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                chips
                                    ? // El elegido va RELLENO: una píldora con solo el borde se lee como un botón más, y aquí
                                      // lo que hay que ver de un vistazo es en cuál estás. El hover cambia el fondo, no el borde.
                                      `rounded-full border px-3.5 py-1.5 ${on ? 'border-primary bg-primary text-on-fill' : 'border-control bg-surface text-ink hover:bg-surface-3'}`
                                    : `-mb-px border-b-[3px] px-3.5 py-2 ${on ? 'border-primary text-primary-strong' : 'border-transparent text-ink hover:border-control'}`
                            }`}
                        >
                            {t.label}
                            {t.count !== undefined && (
                                <span className={`rounded-full px-1.5 text-small font-medium tabular-nums ${on && !chips ? 'bg-primary-soft text-primary-strong' : chips && on ? 'bg-primary-hover text-on-fill' : 'bg-surface-3 text-ink'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {/* El panel arranca más abajo de un simple respiro: la barra es una fila de palabras y lo que viene
                debajo suele empezar por otro encabezado; pegados se leerían como una sola lista de rótulos. */}
            <div role="tabpanel" className={chips ? 'pt-5' : 'pt-6'}>
                {panels[active]}
            </div>
        </div>
    );
}
