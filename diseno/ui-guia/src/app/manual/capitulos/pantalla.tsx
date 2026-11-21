'use client';

// Estructura de pantalla: un esquema de la pantalla de una app (la de INROCONTA) donde, al bajar, se ilumina cada zona y se explica
// qué va ahí. En la primera, el menú se contrae a solo iconos. Sin animación se ve el esquema entero y las seis zonas explicadas.
import { useEffect, useState } from 'react';
import { HEX } from '../../../guia/marca-html.ts';
import { Escena, FIJA, MARGEN, Rotulo, SUBTITULAR, TITULAR_M, anunciarPaso, gsap, registrarEstados, ScrollTrigger, useAnimacion } from '../escena.tsx';

const ZONAS = [
    { titulo: 'Menú lateral', texto: 'Las secciones en grupos, a la izquierda. Mide 252 px y se contrae a 62, solo con los iconos; recuerda cómo lo dejaste.' },
    {
        titulo: 'Quién entró',
        texto: 'Arriba a la derecha, un círculo con su inicial; al pulsarlo salen su nombre, su correo y la salida. No ocupa sitio en el menú.',
    },
    { titulo: 'Título y filtros', texto: 'El título de la sección y, debajo, los filtros que valen para toda la pantalla: período, estado y buscador.' },
    { titulo: 'Avisos', texto: 'Lo que afecta a toda la pantalla y sigue siendo cierto va antes del contenido, con su equis para cerrarlo.' },
    { titulo: 'KPI', texto: 'De dos a cuatro por fila, solo los que se miran todos los días. Cada uno dice su cifra, su estado y adónde lleva.' },
    { titulo: 'Contenido', texto: 'Tarjetas con 12 px entre ellas: barras para comparar, tablas con paginador para el detalle.' },
] as const;

const REGION = 'rounded-control';

export function Pantalla() {
    const [animado, setAnimado] = useState(false);
    const [activa, setActiva] = useState(-1);

    const raiz = useAnimacion((q) => {
        setAnimado(true);
        const anillo = (el: Element, t: number, dura = 0.9) => {
            tl.to(el, { boxShadow: `inset 0 0 0 3px ${HEX.azul}`, duration: 0.25 }, t).to(
                el,
                { boxShadow: `inset 0 0 0 0px ${HEX.azul}`, duration: 0.25 },
                t + dura,
            );
        };
        const inicios = [0.5, 2.4, 3.4, 4.4, 5.4, 6.4]; // dónde empieza cada zona en la línea de tiempo
        const tl = gsap.timeline({
            defaults: { ease: 'power2.out' },
            onUpdate: () => {
                const t = tl.time();
                let a = -1;
                inicios.forEach((ini, i) => {
                    if (t >= ini - 0.1) a = i;
                });
                setActiva(a);
                anunciarPaso('pantalla', a >= 0 ? `${a + 1} de ${ZONAS.length} · ${ZONAS[a].titulo}` : null);
            },
        });
        const zonas = q('.pm-zona');
        gsap.set(zonas, { boxShadow: `inset 0 0 0 0px ${HEX.azul}` });
        // 1 · el menú se ilumina y se contrae a solo iconos, y vuelve a abrirse
        anillo(zonas[0], inicios[0], 1.7);
        tl.to(q('.pm-menu'), { width: 40, duration: 0.6 }, inicios[0] + 0.4)
            .to(q('.pm-etiqueta'), { opacity: 0, duration: 0.3 }, inicios[0] + 0.4)
            .to(q('.pm-menu'), { width: 120, duration: 0.6 }, inicios[0] + 1.3)
            .to(q('.pm-etiqueta'), { opacity: 1, duration: 0.3 }, inicios[0] + 1.5);
        // 2 a 6 · cada zona se ilumina por turno
        for (let i = 1; i < 6; i++) anillo(zonas[i], inicios[i]);
        tl.to({}, { duration: 0.6 }, '>');
        const st = ScrollTrigger.create({ trigger: q('#pantalla .escena')[0], start: 'top top', end: '+=420%', pin: true, animation: tl, scrub: 0.6 });
        // Estados completos: el esquema entero · el menú iluminado · el menú contraído · y cada una de las otras cinco zonas iluminada.
        registrarEstados(st, tl, [0, inicios[0] + 0.4, inicios[0] + 1.15, ...inicios.slice(1).map((t) => t + 0.4)]);
        return () => setAnimado(false);
    });

    useEffect(() => {
        if (animado) ScrollTrigger.refresh();
    }, [animado]);

    const fila = (c: string) => `rounded-inner bg-surface-3 ${c}`;
    return (
        <div ref={raiz}>
            <Escena id="pantalla">
                <div className={animado ? FIJA : `escena flex flex-col gap-10 py-24 ${MARGEN}`}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-3">
                                <Rotulo>05 · Estructura de pantalla</Rotulo>
                                <h2 className="font-semibold" style={TITULAR_M}>
                                    Cada cosa en su sitio, en todas las apps
                                </h2>
                                <p className="max-w-xl text-ink-2" style={SUBTITULAR}>
                                    La misma pantalla en cada app: el menú a un lado, quién entró arriba, y el contenido siempre en el mismo orden.
                                </p>
                            </div>
                            {/* El esquema */}
                            <div className="pm-ventana relative aspect-[16/10] w-full max-w-2xl overflow-hidden rounded-card border border-line bg-surface">
                                <div className="flex h-full">
                                    <aside
                                        className={`pm-menu pm-zona flex w-[120px] flex-none flex-col gap-3 overflow-hidden border-r border-line bg-surface p-2.5 ${REGION}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="size-5 flex-none rounded-inner bg-primary" />
                                            <span className={`pm-etiqueta ${fila('h-2.5 w-14')}`} />
                                        </div>
                                        {[0, 1].map((g) => (
                                            <div key={g} className="flex flex-col gap-1.5">
                                                <span className={`pm-etiqueta ${fila('h-1.5 w-10')}`} />
                                                {[0, 1, 2].map((r) => (
                                                    <div
                                                        key={r}
                                                        className={`flex items-center gap-1.5 rounded-inner p-1 ${g === 0 && r === 1 ? 'bg-primary' : ''}`}
                                                    >
                                                        <span className={`size-3 flex-none rounded-sm ${g === 0 && r === 1 ? 'bg-on-fill' : 'bg-surface-3'}`} />
                                                        <span
                                                            className={`pm-etiqueta h-2 w-14 rounded-inner ${g === 0 && r === 1 ? 'bg-primary-line' : 'bg-surface-3'}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </aside>
                                    <div className="relative flex min-w-0 flex-1 flex-col gap-3 p-4">
                                        <span className={`pm-zona absolute top-2.5 right-3 size-6 rounded-full bg-primary-soft ${REGION}`} />
                                        <div className={`pm-zona flex flex-col gap-2 p-1 ${REGION}`}>
                                            <span className="h-4 w-28 rounded-inner bg-control" />
                                            <div className="flex gap-1.5">
                                                {['w-12', 'w-14', 'w-20'].map((w) => (
                                                    <span key={w} className={`h-5 rounded-control border border-line ${w}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`pm-zona flex w-3/4 items-center gap-2 border border-line p-1.5 ${REGION}`}>
                                            <span className="size-3 flex-none rounded-full bg-danger" />
                                            <span className={fila('h-2 flex-1')} />
                                        </div>
                                        <div className={`pm-zona grid grid-cols-3 gap-2 p-1 ${REGION}`}>
                                            {[0, 1, 2].map((k) => (
                                                <div key={k} className="flex flex-col gap-1.5 rounded-card border border-line p-2">
                                                    <span className={fila('h-1.5 w-8')} />
                                                    <span className="h-3 w-14 rounded-inner bg-primary-line" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`pm-zona grid flex-1 grid-cols-[1.5fr_1fr] gap-2 p-1 ${REGION}`}>
                                            <div className="flex items-end gap-1.5 rounded-card border border-line p-2">
                                                {[40, 55, 48, 62, 70, 85].map((h, i) => (
                                                    <span key={i} className="flex-1 rounded-t-sm bg-chart-ink" style={{ height: `${h}%` }} />
                                                ))}
                                            </div>
                                            <div className="flex flex-col justify-center gap-2 rounded-card border border-line p-2">
                                                <span className="h-2 w-full rounded-full bg-primary" />
                                                <span className="h-2 w-3/4 rounded-full bg-secondary" />
                                                <span className="h-2 w-1/3 rounded-full bg-secondary" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ol className="flex flex-col gap-1">
                            {ZONAS.map((z, i) => {
                                const sel = !animado || activa === i;
                                return (
                                    <li
                                        key={z.titulo}
                                        className={`pm-zona-item flex gap-3 rounded-control border px-4 py-2.5 transition-colors ${sel ? 'border-line bg-surface' : 'border-transparent'}`}
                                    >
                                        <span
                                            className={`mt-0.5 grid size-6 flex-none place-items-center rounded-full text-small font-semibold ${sel ? 'bg-primary text-on-fill' : 'bg-surface-3 text-ink-2'}`}
                                        >
                                            {i + 1}
                                        </span>
                                        <div>
                                            <b className={`text-ui font-semibold ${sel ? 'text-ink' : 'text-ink-3'}`}>{z.titulo}</b>
                                            {sel && <p className="mt-0.5 text-small text-ink-2">{z.texto}</p>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>
            </Escena>
        </div>
    );
}
