'use client';

// EL MANUAL: una sola página larga que se arma mientras se baja (GSAP + ScrollTrigger, con Lenis para suavizar el scroll).
// Aquí vive lo común: el scroll suave, la barra de progreso y el índice fijo. Cada capítulo es un archivo de `capitulos/` y
// se anima solo (ver escena.tsx para las reglas del movimiento).
import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Rombos } from '../../ui/marca.tsx';
import { estadoMasCercano, gsap, ScrollTrigger, usePaso } from './escena.tsx';
import { INDICE } from './indice.ts';
import { Color } from './capitulos/color.tsx';
import { Componentes } from './capitulos/componentes.tsx';
import { Forma } from './capitulos/forma.tsx';
import { Descargas } from './capitulos/descargas.tsx';
import { Experiencia } from './capitulos/experiencia.tsx';
import { Marca } from './capitulos/marca.tsx';
import { Pantalla } from './capitulos/pantalla.tsx';
import { Patrones } from './capitulos/patrones.tsx';
import { Portada } from './capitulos/portada.tsx';

export function Manual() {
    const raiz = useRef<HTMLDivElement>(null);
    const lenis = useRef<Lenis | null>(null);
    const [activo, setActivo] = useState('portada');

    useEffect(() => {
        const el = raiz.current;
        if (!el) return;
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
            // --- Scroll suave: Lenis mueve la página y le avisa a ScrollTrigger; el reloj es el de GSAP (un solo bucle) ---
            const suave = new Lenis({ duration: 1.15, easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)) });
            lenis.current = suave;
            // Cuando la persona deja de desplazarse dentro de una escena fija, se acomoda al estado completo más cercano: nunca se
            // queda a medio camino de una animación.
            let espera = 0;
            const acomoda = () => {
                if (suave.isScrolling) {
                    espera = window.setTimeout(acomoda, 120);
                    return;
                }
                const objetivo = estadoMasCercano(suave.scroll);
                if (objetivo !== null && Math.abs(objetivo - suave.scroll) > 4) suave.scrollTo(objetivo, { duration: 0.7 });
            };
            suave.on('scroll', () => {
                ScrollTrigger.update();
                window.clearTimeout(espera);
                espera = window.setTimeout(acomoda, 220);
            });
            const cada = (tiempo: number) => suave.raf(tiempo * 1000);
            gsap.ticker.add(cada);
            gsap.ticker.lagSmoothing(0);

            // --- Barra de progreso de todo el manual ---
            gsap.to(el.querySelector('.barra'), {
                scaleX: 1,
                ease: 'none',
                scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'max', scrub: 0.3 },
            });

            // La altura de las escenas depende de la fuente: se recalcula cuando carga.
            document.fonts?.ready.then(() => ScrollTrigger.refresh());

            return () => {
                window.clearTimeout(espera);
                gsap.ticker.remove(cada);
                suave.destroy();
            };
        });

        return () => {
            mm.revert();
            lenis.current = null;
        };
    }, []);

    // Índice: la escena activa es la última cuyo borde de arriba ya pasó el 55 % de la pantalla. Se lee en cada scroll (no con
    // marcadores de GSAP, que se calculan antes de que existan las escenas fijadas y quedan corridos).
    useEffect(() => {
        const el = raiz.current;
        if (!el) return;
        const calcula = () => {
            let actual = INDICE[0].id;
            for (const { id } of INDICE) {
                const escena = el.querySelector(`#${id}`);
                if (escena && escena.getBoundingClientRect().top <= window.innerHeight * 0.55) actual = id;
            }
            setActivo(actual);
        };
        // Leer unas pocas posiciones en cada scroll es barato: no hace falta aplazarlo a otro cuadro.
        window.addEventListener('scroll', calcula, { passive: true });
        window.addEventListener('resize', calcula);
        calcula();
        return () => {
            window.removeEventListener('scroll', calcula);
            window.removeEventListener('resize', calcula);
        };
    }, []);

    const paso = usePaso();
    // Si la escena activa es una subescena (nivel 1), su capítulo (el de nivel 0 de arriba) se marca también, más suave.
    const padre = (() => {
        const i = INDICE.findIndex((e) => e.id === activo);
        if (i < 0 || INDICE[i].nivel === 0) return null;
        for (let j = i - 1; j >= 0; j--) if (INDICE[j].nivel === 0) return INDICE[j].id;
        return null;
    })();

    // Ir a una escena no recorre la página hasta allá: un fundido tapa la pantalla, se salta de golpe al principio de la escena y se
    // destapa, así la animación de esa escena empieza desde su inicio. Sin movimiento (o sin Lenis) salta sin fundido.
    const ir = (id: string) => {
        const escena = raiz.current?.querySelector<HTMLElement>(`#${id}`);
        if (!escena) return;
        const velo = raiz.current?.querySelector('.salto');
        const saltar = () => {
            if (lenis.current) lenis.current.scrollTo(escena, { immediate: true, force: true });
            else escena.scrollIntoView({ block: 'start' });
            ScrollTrigger.update();
        };
        if (!lenis.current || !velo) {
            saltar();
            return;
        }
        gsap.timeline()
            .to(velo, { opacity: 1, duration: 0.45, ease: 'power1.inOut' })
            .call(saltar)
            .to(velo, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, '>+0.25');
    };

    return (
        <div ref={raiz} className="relative bg-surface text-ink">
            {/* Progreso */}
            <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-1 bg-surface-3">
                <div className="barra h-full origin-left bg-primary" style={{ transform: 'scaleX(0)' }} />
            </div>

            {/* El fundido con que se salta a otra escena */}
            <div aria-hidden className="salto pointer-events-none fixed inset-0 z-[60] bg-surface opacity-0" />

            {/* Índice */}
            <nav aria-label="Capítulos del manual" className="fixed top-1/2 left-5 z-30 hidden -translate-y-1/2 flex-col gap-1 xl:flex">
                <Rombos size={12} className="mb-3 ml-1" />
                {INDICE.map((i) => (
                    <div key={i.id} className="flex flex-col">
                        <button
                            type="button"
                            onClick={() => ir(i.id)}
                            aria-current={activo === i.id ? 'step' : undefined}
                            className={`flex cursor-pointer items-center gap-2 rounded-inner py-1 pr-2 text-left text-small whitespace-nowrap transition-colors ${i.nivel ? 'pl-6' : 'pl-1'} ${
                                activo === i.id ? 'font-semibold text-primary' : padre === i.id ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink'
                            }`}
                        >
                            <span
                                aria-hidden
                                className={`size-1.5 flex-none rounded-full ${activo === i.id ? 'bg-primary' : padre === i.id ? 'bg-ink-3' : 'bg-control'}`}
                            />
                            {i.titulo}
                        </button>
                        {/* El paso exacto en que se está, bajo la escena activa */}
                        {activo === i.id && paso?.id === i.id && (
                            <span className={`pb-1 text-caption text-ink-3 ${i.nivel ? 'pl-[2.6rem]' : 'pl-[1.4rem]'}`}>{paso.texto}</span>
                        )}
                    </div>
                ))}
            </nav>

            {/* Créditos: siempre a la vista, abajo a la izquierda */}
            <p className="fixed right-5 bottom-4 z-30 flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-small text-ink-2">
                {/* La marca de GitHub (lucide ya no trae los logos de marcas). */}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden className="flex-none">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                <span>
                    Desarrollado por{' '}
                    <a
                        href="https://github.com/FaureGalliard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-ink hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                        Angel Gabriel Crispin Valdivia
                    </a>
                </span>
            </p>

            <main>
                <Portada />
                <Marca />
                <Color />
                <Forma />
                <Componentes />
                <Pantalla />
                <Patrones />
                <Experiencia />

                <Descargas />
            </main>
        </div>
    );
}
