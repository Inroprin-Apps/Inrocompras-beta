'use client';

// Una escena fija con un escenario que cambia de panel al bajar, y a la izquierda la lista de lo que se está viendo. La usan los
// capítulos de Componentes, Patrones y Experiencia. Cada panel dura una unidad de la línea de tiempo: sale el anterior y entra el
// siguiente; la lista sigue a la animación misma (no al scroll), así también se asienta cuando el suavizado termina.
// Sin animación (reducir movimiento) los paneles se muestran uno debajo del otro, cada uno con su título.
import { useEffect, useState, type ComponentType } from 'react';
import { MousePointerClick } from 'lucide-react';
import { Escena, FIJA, MARGEN, Rotulo, SUBTITULAR, TITULAR_M, anunciarPaso, gsap, registrarEstados, ScrollTrigger, useAnimacion } from './escena.tsx';

export interface GrupoPanel {
    titulo: string;
    texto: string;
    /** Qué puede hacer la persona en este panel (pulsar, escribir, abrir…): sin esto no sabría que se puede tocar. */
    pista: string;
}

/** La pista de qué tocar: una pastilla con un icono de clic que late un poco, arriba de cada panel. */
function Pista({ texto }: { texto: string }) {
    return (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-small font-medium text-primary-strong">
            <MousePointerClick size={14} aria-hidden className="flex-none motion-safe:animate-pulse" />
            {texto}
        </p>
    );
}

export function EscenaConPaneles({
    id,
    rotulo,
    titulo,
    texto,
    grupos,
    paneles,
    recorrido = '+=420%',
}: {
    id: string;
    rotulo: string;
    titulo: string;
    texto: string;
    grupos: readonly GrupoPanel[];
    paneles: ComponentType[];
    recorrido?: string;
}) {
    const [animado, setAnimado] = useState(false);
    const [activo, setActivo] = useState(0);
    // El alto de la tarjeta en cada panel: se ajusta a su contenido, no a un alto fijo.
    const [altos, setAltos] = useState<number[]>([]);

    const raiz = useAnimacion((q) => {
        setAnimado(true);
        const hojas = q('.cp-panel');
        gsap.set(hojas, { autoAlpha: 0 });
        gsap.set(hojas[0], { autoAlpha: 1 });
        const tl = gsap.timeline({
            defaults: { ease: 'power2.out' },
            onUpdate: () => {
                const i = Math.min(hojas.length - 1, Math.max(0, Math.round(tl.time())));
                setActivo(i);
                anunciarPaso(id, `${i + 1} de ${hojas.length} · ${grupos[i].titulo}`);
            },
        });
        for (let i = 1; i < hojas.length; i++) {
            tl.to(hojas[i - 1], { autoAlpha: 0, y: -24, duration: 0.35 }, i - 0.35).fromTo(hojas[i], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35 }, '<');
        }
        tl.to({}, { duration: 0.5 }); // un respiro al final
        const st = ScrollTrigger.create({ trigger: q(`#${id} .escena`)[0], start: 'top top', end: recorrido, pin: true, animation: tl, scrub: 0.6 });
        // El panel i se ve entero en el segundo i de la línea de tiempo.
        registrarEstados(st, tl, hojas.map((_, i) => i));
        return () => setAnimado(false);
    });

    // Si la ventana es baja y un panel no cabe, su contenido se reduce (hasta el 70 %) en vez de abrir una barra de desplazamiento.
    useEffect(() => {
        if (!animado) return;
        const caja = raiz.current;
        if (!caja) return;
        const ajusta = () => {
            const tope = Math.min(37 * 16, window.innerHeight * 0.84);
            const medidos: number[] = [];
            caja.querySelectorAll<HTMLElement>('.cp-panel').forEach((panel) => {
                const cuerpo = panel.querySelector<HTMLElement>('.cp-cuerpo');
                const pista = panel.querySelector<HTMLElement>('p');
                if (!cuerpo) return;
                // Se mide el contenido a su tamaño natural; si no cabe en el alto máximo se reduce (hasta el 70 %) en vez de abrir una
                // barra de desplazamiento. Al cambiar el ancho el texto se reacomoda, por eso se repite. La tarjeta mide lo que mide
                // su contenido (más el relleno y el borde de la tarjeta: 50 px).
                cuerpo.style.cssText = '';
                const arriba = pista ? pista.offsetHeight + 16 : 0;
                const libre = tope - 50 - arriba;
                let e = Math.min(1, Math.max(0.7, libre / cuerpo.offsetHeight));
                for (let k = 0; k < 4 && e < 1; k++) {
                    cuerpo.style.width = `${100 / e}%`;
                    const usa = cuerpo.offsetHeight * e;
                    if (usa <= libre + 1 || e <= 0.7) break;
                    e = Math.max(0.7, (e * libre) / usa);
                }
                if (e < 1) {
                    cuerpo.style.transformOrigin = 'top left';
                    cuerpo.style.transform = `scale(${e})`;
                    // Una transformación no cambia el espacio que ocupa: se corrige la diferencia.
                    cuerpo.style.marginBottom = `${-cuerpo.offsetHeight * (1 - e)}px`;
                }
                medidos.push(Math.ceil(arriba + cuerpo.offsetHeight * e + 50));
            });
            setAltos(medidos);
            ScrollTrigger.refresh();
        };
        ajusta();
        window.addEventListener('resize', ajusta);
        return () => window.removeEventListener('resize', ajusta);
    }, [animado, raiz]);

    // Al pasar a la versión animada la escena cambia de alto (ocupa la pantalla): hay que recalcular dónde se fija.
    useEffect(() => {
        if (animado) ScrollTrigger.refresh();
    }, [animado]);

    return (
        <div ref={raiz}>
            <Escena id={id}>
                {/* La clase `escena` va siempre: el gancho busca por ella antes de que React cambie el diseño. */}
                <div className={animado ? FIJA : `escena flex flex-col gap-10 py-24 ${MARGEN}`}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_1.6fr]">
                        <div className="flex flex-col gap-5">
                            <Rotulo>{rotulo}</Rotulo>
                            <h2 className="font-semibold" style={TITULAR_M}>
                                {titulo}
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                {texto}
                            </p>
                            <ol className="flex flex-col gap-1">
                                {grupos.map((g, i) => (
                                    <li key={g.titulo} className={`rounded-control border px-4 py-2.5 transition-colors ${animado && activo !== i ? 'border-transparent' : 'border-line bg-surface'}`}>
                                        <b className={`text-ui font-semibold ${animado && activo !== i ? 'text-ink-3' : 'text-ink'}`}>
                                            {String(i + 1).padStart(2, '0')} · {g.titulo}
                                        </b>
                                        {(!animado || activo === i) && <p className="mt-0.5 text-small text-ink-2">{g.texto}</p>}
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className={animado ? 'relative h-[min(37rem,84vh)] rounded-card border border-line bg-surface p-6 transition-[height] duration-500 ease-out' : 'flex flex-col gap-8'}
                            style={animado && altos[activo] ? { height: altos[activo] } : undefined}>
                            {paneles.map((Panel, i) => (
                                <div key={grupos[i].titulo} className={`cp-panel ${animado ? 'no-scrollbar absolute inset-6 overflow-hidden' : 'rounded-card border border-line bg-surface p-6'}`}>
                                    {!animado && <h3 className="mb-4 text-heading font-semibold">{grupos[i].titulo}</h3>}
                                    <Pista texto={grupos[i].pista} />
                                    {/* El relleno de 8 px deja sitio a las filas con margen negativo (barra con cifra), que si no abrirían una barra horizontal. */}
                                    <div className="cp-cuerpo px-2">
                                        <Panel />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Escena>
        </div>
    );
}
