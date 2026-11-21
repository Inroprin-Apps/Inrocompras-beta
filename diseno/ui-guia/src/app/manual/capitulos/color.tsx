'use client';

// Color: un color por rol y el resto derivado (escena 1), y qué texto se lee sobre blanco, medido con los colores reales de la
// página (escena 2).
import { useEffect, useState } from 'react';
import { Chip } from '../../../ui/card.tsx';
import { Escena, FIJA, Rotulo, SUBTITULAR, TITULAR_M, gsap, registrarEstados, useAnimacion } from '../escena.tsx';

/** Los derivados de `primary`: cada uno con su regla (la misma de globals.css) y su clase. */
const DERIVADOS = [
    { clase: 'bg-primary-hover', nombre: 'Encima', regla: '92 % con negro', uso: 'El botón con el cursor encima' },
    { clase: 'bg-primary-active', nombre: 'Pulsado', regla: '84 % con negro', uso: 'El botón o el enlace al pulsar' },
    { clase: 'bg-primary-strong', nombre: 'Fuerte', regla: '88 % con negro', uso: 'Texto sobre el azul suave' },
    { clase: 'bg-primary-soft', nombre: 'Suave', regla: '12 % con blanco', uso: 'Fondo de un chip o un filtro elegido' },
    { clase: 'bg-primary-line', nombre: 'Línea', regla: '22 % con blanco', uso: 'El botón punteado al pulsar' },
] as const;

/** Los textos que se miden contra el blanco: la clase de color que usa la guía y cómo se llama. */
const TEXTOS = [
    { clase: 'text-ink', nombre: 'Texto principal' },
    { clase: 'text-ink-2', nombre: 'Secundario' },
    { clase: 'text-ink-3', nombre: 'Tenue' },
    { clase: 'text-primary', nombre: 'Azul de la marca' },
    { clase: 'text-danger', nombre: 'Rojo de error' },
    { clase: 'text-secondary', nombre: 'Turquesa' },
    { clase: 'text-warning', nombre: 'Amarillo' },
] as const;

const MAXIMO = 21; // el contraste más alto posible (negro sobre blanco)

/** El color que el navegador pinta de verdad (resuelve variables y mezclas en oklab) como [r, g, b]. */
function rgbDe(css: string): [number, number, number] {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    ctx.canvas.width = ctx.canvas.height = 1;
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
}

const luz = ([r, g, b]: number[]) => {
    const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/** Contraste WCAG de un color de texto contra el blanco. */
const contrasteConBlanco = (css: string) => 1.05 / (luz(rgbDe(css)) + 0.05);

function veredicto(r: number): { texto: string; tono: 'ok' | 'warn' | 'danger' } {
    if (r >= 4.5) return { texto: 'Se lee', tono: 'ok' };
    if (r >= 3) return { texto: 'Solo texto grande', tono: 'warn' };
    return { texto: 'Nunca va de texto', tono: 'danger' };
}

export function Color() {
    // Los contrastes se miden con el color que de verdad pinta la página, no con una cifra copiada.
    const [ratios, setRatios] = useState<number[]>([]);
    useEffect(() => {
        const medidos = TEXTOS.map((_, i) => {
            const muestra = document.querySelector<HTMLElement>(`#contraste [data-muestra="${i}"]`);
            return muestra ? contrasteConBlanco(getComputedStyle(muestra).color) : 0;
        });
        setRatios(medidos);
    }, []);

    const raiz = useAnimacion((q) => {
        // --- Derivados: del color base salen los cinco estados ---
        const derivados = gsap
            .timeline({ scrollTrigger: { trigger: q('#color .escena')[0], start: 'top top', end: '+=170%', pin: true, scrub: 0.6 } })
            .from(q('.d-base'), { scale: 0.7, opacity: 0, duration: 0.7, ease: 'back.out(1.6)' })
            .from(q('.d-derivado'), { x: -160, opacity: 0, scale: 0.7, stagger: 0.28, duration: 0.8, ease: 'power3.out' }, '>-0.1')
            .from(q('.d-boton'), { y: 30, opacity: 0, stagger: 0.2, duration: 0.5 }, '>-0.2');
        registrarEstados(derivados.scrollTrigger, derivados, [0, derivados.duration()]); // solo el título · el color y todos sus estados

        // --- Contraste: cada barra crece hasta su valor ---
        gsap.set(q('.ct-barra'), { transformOrigin: 'left center' });
        const contraste = gsap
            .timeline({ scrollTrigger: { trigger: q('#contraste .escena')[0], start: 'top top', end: '+=170%', pin: true, scrub: 0.6 } })
            .from(q('.ct-fila'), { x: 60, opacity: 0, stagger: 0.12, duration: 0.5 })
            .from(q('.ct-barra'), { scaleX: 0, stagger: 0.18, duration: 0.8, ease: 'power2.out' }, '>-0.3');
        registrarEstados(contraste.scrollTrigger, contraste, [0, contraste.duration()]); // solo el título · las siete barras medidas
    });

    return (
        <div ref={raiz}>
            <Escena id="color">
                <div className={FIJA}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.5fr]">
                        <div className="d-intro flex flex-col gap-4">
                            <Rotulo>02 · Color</Rotulo>
                            <h2 className="font-semibold" style={TITULAR_M}>
                                Un color por rol; el resto, derivado
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                Del azul salen sus estados con una regla fija: se mezcla con negro para oscurecer y con blanco para aclarar. Nunca se escribe un
                                hex nuevo para un hover.
                            </p>
                        </div>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-wrap items-stretch gap-3">
                                <div className="d-base flex w-36 flex-col justify-end gap-0.5 rounded-card bg-primary p-4 text-on-fill">
                                    <b className="text-heading font-semibold">Base</b>
                                    <code className="text-small">primary</code>
                                </div>
                                {DERIVADOS.map((d) => (
                                    <div key={d.nombre} className="d-derivado flex w-32 flex-col overflow-hidden rounded-card border border-line bg-surface">
                                        <div className={`h-20 ${d.clase}`} />
                                        <div className="flex flex-col gap-0.5 p-3">
                                            <b className="text-ui font-semibold">{d.nombre}</b>
                                            <span className="text-small text-ink-2">{d.regla}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="d-boton rounded-control bg-primary px-4 py-2 text-ui font-medium text-on-fill">Guardar</span>
                                <span className="d-boton rounded-control bg-primary-hover px-4 py-2 text-ui font-medium text-on-fill">Encima</span>
                                <span className="d-boton rounded-control bg-primary-active px-4 py-2 text-ui font-medium text-on-fill">Pulsado</span>
                                <span className="d-boton rounded-control bg-primary-soft px-4 py-2 text-ui font-medium text-primary-strong">Suave</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Escena>

            <Escena id="contraste">
                <div className={FIJA}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.5fr]">
                        <div className="ct-intro flex flex-col gap-4">
                            <Rotulo>02 · Color</Rotulo>
                            <h2 className="font-semibold" style={TITULAR_M}>
                                Un texto se lee sobre su fondo
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                El texto pide 4.5 a 1 contra su fondo. Un color claro de la marca no sirve de texto: para eso están sus versiones «fuertes». El
                                amarillo nunca lleva texto.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            {TEXTOS.map((t, i) => {
                                const r = ratios[i] ?? 0;
                                const v = veredicto(r);
                                return (
                                    <div key={t.nombre} className="ct-fila grid grid-cols-[2.5rem_1fr_auto] items-center gap-4">
                                        <span data-muestra={i} className={`text-title font-semibold ${t.clase}`}>
                                            Aa
                                        </span>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="text-ui font-medium">{t.nombre}</span>
                                                <Chip tone={v.tono}>{v.texto}</Chip>
                                            </span>
                                            <div className="relative h-2.5 rounded-full bg-surface-3">
                                                <div
                                                    className={`ct-barra h-full rounded-full ${r >= 4.5 ? 'bg-success' : r >= 3 ? 'bg-warning' : 'bg-danger'}`}
                                                    style={{ width: `${Math.min(100, (r / MAXIMO) * 100)}%` }}
                                                />
                                                {/* La raya del mínimo: 4.5 a 1 */}
                                                <span
                                                    aria-hidden
                                                    className="absolute top-[-4px] bottom-[-4px] w-px bg-ink"
                                                    style={{ left: `${(4.5 / MAXIMO) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <b className="w-16 text-right text-ui font-semibold tabular-nums">{r ? r.toFixed(1) : '…'}:1</b>
                                    </div>
                                );
                            })}
                            <p className="mt-1 text-small text-ink-2">La raya negra marca el mínimo: 4.5 a 1.</p>
                        </div>
                    </div>
                </div>
            </Escena>
        </div>
    );
}
