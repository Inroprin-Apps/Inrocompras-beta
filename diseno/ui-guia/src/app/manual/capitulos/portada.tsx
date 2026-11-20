'use client';

// Portada: al cargar, el cubo se arma pieza por pieza (de contorno) y el título entra; al bajar, el cubo se rellena de color.
import { CELDAS, HEX, rombo, type Color } from '../../../guia/marca-html.ts';
import { Rombos } from '../../../ui/marca.tsx';
import { Escena, FIJA, SUBTITULAR, TITULAR, gsap, registrarEstados, useAnimacion } from '../escena.tsx';

const COLOR_HEX: Record<Color, string> = { azul: HEX.azul, turquesa: HEX.turquesa, rojo: HEX.rojo, amarillo: HEX.amarillo };

/** El cubo de la marca, pieza por pieza (cada celda es un <g> para poder moverla), con las coordenadas de siempre. */
export function Cubo({ clase, size }: { clase: string; size: number }) {
    const h = 20;
    const r = h * 0.85;
    return (
        <svg width={size} height={size} viewBox="-62 -62 128 124" strokeWidth="1.2" strokeLinejoin="miter" aria-hidden="true" className={`block ${clase}`}>
            {CELDAS.map(([x, y, c]) => (
                <g key={`${x},${y}`} className="celda" data-cx={x * h} data-cy={y * h}>
                    <polygon points={rombo(x * h, y * h, r)} fill={COLOR_HEX[c]} stroke={COLOR_HEX[c]} fillOpacity={1} />
                </g>
            ))}
            {/* La celda suelta de la derecha: un poco más arriba y torcida, como en el logo. */}
            <g className="celda" data-cx={43.7} data-cy={-1}>
                <polygon points={rombo(43.7, -1, r)} transform={`rotate(-28 43.7 -1)`} fill={HEX.rojo} stroke={HEX.rojo} fillOpacity={1} />
            </g>
        </svg>
    );
}

export function Portada() {
    const raiz = useAnimacion((q) => {
        const celdas = q('.p-cubo .celda');
        gsap.set(celdas, { svgOrigin: (i: number, t: Element) => `${t.getAttribute('data-cx')} ${t.getAttribute('data-cy')}` });
        gsap.set(q('.p-cubo polygon'), { fillOpacity: 0 });
        gsap.from(celdas, { x: () => gsap.utils.random(-420, 420), y: () => gsap.utils.random(-380, 380), rotation: () => gsap.utils.random(-200, 200), scale: 0.3, opacity: 0, duration: 1.3, stagger: 0.1, ease: 'power3.out' });
        gsap.from(q('.p-titulo > *'), { y: 46, opacity: 0, duration: 0.8, stagger: 0.16, ease: 'power2.out', delay: 0.2 });
        gsap.from(q('.p-pista'), { opacity: 0, duration: 0.6, delay: 1.6 });
        const tl = gsap
            .timeline({ scrollTrigger: { trigger: q('#portada .escena')[0], start: 'top top', end: '+=140%', pin: true, scrub: 0.7 } })
            .to(q('.p-cubo polygon'), { fillOpacity: 1, duration: 1, stagger: 0.07, ease: 'none' })
            .to(q('.p-cubo'), { scale: 1.08, duration: 1.4, ease: 'none' }, 0)
            .to(q('.p-pista'), { opacity: 0, duration: 0.3 }, 0);
        registrarEstados(tl.scrollTrigger, tl, [0, tl.duration()]); // contorno armado · relleno de color
    });
    return (

        <div ref={raiz}>
                    <Escena id="portada">
                        <div className={FIJA}>
                            <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
                                <div className="p-titulo flex flex-col gap-5">
                                    <Rombos size={20} />
                                    <h1 className="font-semibold" style={TITULAR}>
                                        Cómo se ven y cómo se comportan las apps de INROPRIN
                                    </h1>
                                    <p className="max-w-xl text-ink-2" style={SUBTITULAR}>
                                        Un manual para diseñar y construir con el mismo criterio: la marca, el color, la forma y cada pieza, con su ejemplo vivo.
                                    </p>
                                </div>
                                <div className="flex justify-center">
                                    <Cubo clase="p-cubo" size={460} />
                                </div>
                            </div>
                            <p className="p-pista absolute bottom-8 left-1/2 -translate-x-1/2 text-small text-ink-2">Baja para recorrerlo ↓</p>
                        </div>
                    </Escena>
        </div>
    );
}
