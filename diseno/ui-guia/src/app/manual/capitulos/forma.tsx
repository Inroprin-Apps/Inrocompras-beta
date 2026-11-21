'use client';

// Forma: las esquinas de dentro hacia fuera (escena 1), el borde único, la sombra de lo que flota y el divisor (escena 2), y el
// ritmo del espaciado (escena 3).
import { Escena, FIJA, MARGEN, Rotulo, SUBTITULAR, TITULAR_M, gsap, registrarEstados, useAnimacion } from '../escena.tsx';

/** Los pasos de espacio que se repiten en la guía (la escala de 4 px de Tailwind) y para qué. */
const ESPACIO = [
    { n: '1.5', px: 6, uso: 'Etiqueta → control, icono → texto' },
    { n: '2.5', px: 10, uso: 'Entre botones y controles de una barra' },
    { n: '3', px: 12, uso: 'Entre tarjetas de una rejilla' },
    { n: '4', px: 16, uso: 'Relleno de un aviso; entre bloques de un formulario' },
    { n: '5', px: 20, uso: 'Relleno vertical de una tarjeta' },
    { n: '6', px: 24, uso: 'Entre secciones de una pantalla' },
] as const;

// La sombra de lo que flota, la misma de `--shadow-float` en globals.css: GSAP no puede animar una variable CSS.
const SOMBRA_FLOTA = '0 4px 8px rgba(29, 29, 27, 0.06), 0 12px 32px rgba(29, 29, 27, 0.1)';

export function Forma() {
    const raiz = useAnimacion((q) => {
        // --- Esquinas: cada pieza entra dentro de la anterior ---
        const esquinas = gsap
            .timeline({ scrollTrigger: { trigger: q('#forma .escena')[0], start: 'top top', end: '+=150%', pin: true, scrub: 0.6 } })
            .from(q('.f-card'), { scale: 0.85, opacity: 0, duration: 0.7, ease: 'power3.out' })
            .from(q('.f-control'), { scale: 0.85, opacity: 0, duration: 0.7, ease: 'power3.out' }, '>-0.1')
            .from(q('.f-inner'), { scale: 0.85, opacity: 0, duration: 0.7, ease: 'power3.out' }, '>-0.1')
            .from(q('.f-otro'), { y: 24, opacity: 0, stagger: 0.15, duration: 0.5 }, '>-0.1');
        registrarEstados(esquinas.scrollTrigger, esquinas, [0, esquinas.duration()]); // solo el título · las tres esquinas anidadas

        // --- Bordes: tres columnas; la del medio gana su sombra ---
        gsap.set(q('.b-flota'), { boxShadow: '0 0 0 rgba(29, 29, 27, 0)' });
        const bordes = gsap
            .timeline({ scrollTrigger: { trigger: q('#bordes .escena')[0], start: 'top top', end: '+=150%', pin: true, scrub: 0.6 } })
            .from(q('.b-col'), { y: 80, opacity: 0, stagger: 0.25, duration: 0.8, ease: 'power3.out' })
            .to(q('.b-flota'), { boxShadow: SOMBRA_FLOTA, y: -10, duration: 0.8, ease: 'power2.out' }, '>-0.1');
        registrarEstados(bordes.scrollTrigger, bordes, [0, bordes.duration()]); // solo el título · las tres columnas, la del medio con su sombra

        // --- Espaciado: cada barra mide lo que dice su paso ---
        gsap.set(q('.e-barra'), { transformOrigin: 'left center' });
        gsap.from(q('.e-fila'), { x: -30, opacity: 0, stagger: 0.12, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: q('#espaciado')[0], start: 'top 65%', toggleActions: 'play none none reverse' } });
        gsap.from(q('.e-barra'), { scaleX: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: q('#espaciado')[0], start: 'top 65%', toggleActions: 'play none none reverse' } });
    });

    return (
        <div ref={raiz}>
            <Escena id="forma">
                <div className={FIJA}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
                        <div className="f-intro flex flex-col gap-4">
                            <Rotulo>03 · Forma</Rotulo>
                            <h2 className="font-semibold" style={TITULAR_M}>
                                Esquinas moderadas, de dentro hacia fuera
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                Cuanto más grande la pieza, más redonda; y lo que va dentro de otra lleva menos radio que ella. Tres radios tienen nombre propio.
                            </p>
                        </div>
                        <div className="flex flex-col gap-5">
                            <div className="f-card w-full max-w-md rounded-card border border-line bg-surface p-6">
                                <p className="text-ui font-semibold">
                                    Tarjeta <code className="ml-1 text-small font-normal text-ink-2">rounded-card · 12 px</code>
                                </p>
                                <div className="f-control mt-4 rounded-control border border-line bg-surface p-5">
                                    <p className="text-ui font-semibold">
                                        Control <code className="ml-1 text-small font-normal text-ink-2">rounded-control · 9 px</code>
                                    </p>
                                    <div className="f-inner mt-3 rounded-inner border border-line bg-surface-2 p-4">
                                        <p className="text-ui font-semibold">
                                            Interior <code className="ml-1 text-small font-normal text-ink-2">rounded-inner · 7 px</code>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-small text-ink-2">
                                <span className="f-otro rounded-full border border-line bg-surface px-3 py-1">Chip · rounded-full</span>
                                <span className="f-otro rounded-lg border border-line bg-surface px-3 py-1">Fila clicable · rounded-lg · 8 px</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Escena>

            <Escena id="bordes">
                <div className={FIJA}>
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
                        <div className="b-intro flex max-w-3xl flex-col gap-4">
                            <Rotulo>03 · Forma</Rotulo>
                            <h2 className="font-semibold" style={TITULAR_M}>
                                Un solo borde; la sombra, solo para lo que flota
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                Las tarjetas y los controles comparten el mismo gris fino y no llevan sombra: viven en la página. Lo que se abre encima, como un panel o un aviso que sale, sí la lleva.
                            </p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                            <div className="b-col flex flex-col gap-3">
                                <div className="rounded-card border border-line bg-surface p-5">
                                    <p className="text-ui font-semibold">En la página</p>
                                    <p className="mt-1 text-small text-ink-2">Borde fino, sin sombra.</p>
                                    <div className="mt-4 rounded-control border border-control bg-surface px-3 py-2 text-ui text-ink-3">Un campo, el mismo borde</div>
                                </div>
                                <code className="text-small text-ink-2">line · texto al 20 % · #cccccc</code>
                            </div>
                            <div className="b-col flex flex-col gap-3">
                                <div className="b-flota rounded-card border border-line bg-surface p-5">
                                    <p className="text-ui font-semibold">Flota</p>
                                    <p className="mt-1 text-small text-ink-2">Un panel, un menú, un toast: lleva sombra para separarse de lo de abajo.</p>
                                </div>
                                <code className="text-small text-ink-2">shadow-float</code>
                            </div>
                            <div className="b-col flex flex-col gap-3">
                                <ul className="flex flex-col divide-y divide-divider rounded-card border border-line bg-surface">
                                    {['Papeles del Pacífico', 'Tintas Lima Norte', 'Transportes Rímac'].map((n) => (
                                        <li key={n} className="px-5 py-3 text-ui">
                                            {n}
                                        </li>
                                    ))}
                                </ul>
                                <code className="text-small text-ink-2">divider · texto al 18 %, dentro de una tarjeta</code>
                            </div>
                        </div>
                    </div>
                </div>
            </Escena>

            <Escena id="espaciado">
                <div className={`flex min-h-screen items-center py-24 ${MARGEN}`}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
                        <div className="flex flex-col gap-4">
                            <Rotulo>03 · Forma</Rotulo>
                            <h2 className="font-semibold" style={TITULAR_M}>
                                El ritmo del espacio
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                La escala de 4 px de Tailwind. Estos son los pasos que se repiten y para qué sirve cada uno.
                            </p>
                        </div>
                        <ul className="flex flex-col gap-4">
                            {ESPACIO.map((e) => (
                                <li key={e.n} className="e-fila grid grid-cols-[4.5rem_1fr] items-center gap-4">
                                    <code className="text-small font-medium">gap-{e.n}</code>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="e-barra h-3 rounded-inner bg-primary" style={{ width: `${e.px * 7}px`, maxWidth: '100%' }} />
                                        <span className="text-small text-ink-2">
                                            {e.px} px · {e.uso}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Escena>
        </div>
    );
}
