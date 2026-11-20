'use client';

// Descargas: la papelería de la marca, cada pieza con su vista previa y su PDF y Word, y el .zip con todo. Y el cierre, con adónde
// seguir: las páginas de referencia de la guía. Los archivos salen de `pnpm descargas` (public/descargas/<pieza>/).
import Link from 'next/link';
import { useMemo } from 'react';
import { FileDown } from 'lucide-react';
import { piezas } from '../../../guia/papeleria.ts';
import { buttonClass } from '../../../ui/button.tsx';
import { Rombos } from '../../../ui/marca.tsx';
import { Escena, MARGEN, Rotulo, SUBTITULAR, TITULAR, TITULAR_M, gsap, useAnimacion } from '../escena.tsx';

/** Adónde seguir: las páginas de referencia, con el detalle de cada tema. */
const REFERENCIA = [
    { href: '/uso', titulo: 'Cómo usarla en una app', texto: 'Copiar los tokens, los componentes y la fuente.' },
    { href: '/fundamentos/color', titulo: 'Color', texto: 'Cada rol y cada derivado, con su contraste.' },
    { href: '/componentes/botones', titulo: 'Componentes', texto: 'Cada pieza con su ejemplo y su código.' },
    { href: '/patrones/listado', titulo: 'Patrones', texto: 'Las pantallas completas, paso a paso.' },
] as const;

export function Descargas() {
    const lista = useMemo(() => piezas('/IconRoland.png'), []);
    const raiz = useAnimacion((q) => {
        gsap.from(q('.dl-cabeza > *'), { y: 40, opacity: 0, stagger: 0.14, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: q('#descargas')[0], start: 'top 70%', toggleActions: 'play none none reverse' } });
        gsap.from(q('.dl-pieza'), { y: 70, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: q('.dl-rejilla')[0], start: 'top 80%', toggleActions: 'play none none reverse' } });
        gsap.from(q('.ci-bloque > *'), { y: 36, opacity: 0, stagger: 0.14, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: q('.ci-bloque')[0], start: 'top 80%', toggleActions: 'play none none reverse' } });
    });

    return (
        <div ref={raiz}>
            <Escena id="descargas">
                <div className={`py-28 ${MARGEN}`}>
                    <div className="mx-auto flex max-w-6xl flex-col gap-10">
                        <div className="dl-cabeza flex max-w-3xl flex-col gap-4">
                            <Rotulo>08 · Descargas</Rotulo>
                            <h2 className="font-semibold" style={TITULAR_M}>
                                La papelería, lista para usar
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                Cada pieza en PDF, a tamaño real y lista para una papelería, y en Word, para escribir nombre y cargo encima. O todo junto en un solo archivo.
                            </p>
                            <div>
                                <a href="/descargas/papeleria-roland-print.zip" download className={buttonClass('primary')}>
                                    <FileDown size={16} /> Descargar todo (.zip)
                                </a>
                            </div>
                        </div>
                        <div className="dl-rejilla grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {lista.map((p) => (
                                <article key={p.id} className="dl-pieza flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/descargas/${p.slug}/vista-previa.png`} alt={`Vista previa: ${p.titulo}`} width={1200} height={630} loading="lazy" className="block h-auto w-full border-b border-divider bg-surface-2" />
                                    <div className="flex flex-1 flex-col gap-3 p-4">
                                        <div>
                                            <h3 className="text-heading font-semibold">{p.titulo}</h3>
                                            <p className="text-small text-ink-3">{p.medida}</p>
                                            <p className="mt-1.5 text-small text-ink-2">{p.nota}</p>
                                        </div>
                                        <div className="mt-auto flex flex-wrap gap-2.5">
                                            <a href={`/descargas/${p.slug}/${p.slug}.pdf`} download className={buttonClass('primary')}>
                                                <FileDown size={16} /> PDF
                                            </a>
                                            <a href={`/descargas/${p.slug}/${p.slug}.docx`} download className={buttonClass('secondary')}>
                                                <FileDown size={16} /> Word
                                            </a>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </Escena>

            {/* Cierre */}
            <section className={`py-32 ${MARGEN}`}>
                <div className="ci-bloque mx-auto flex max-w-6xl flex-col gap-6">
                    <Rombos size={20} />
                    <h2 className="font-semibold" style={TITULAR}>
                        Para ir al detalle
                    </h2>
                    <p className="max-w-2xl text-ink-2" style={SUBTITULAR}>
                        El manual se recorre; la guía se consulta. Cada tema tiene su página con todas las piezas, sus reglas y el código para copiar.
                    </p>
                    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {REFERENCIA.map((r) => (
                            <li key={r.href}>
                                <Link href={r.href} className="flex h-full flex-col gap-1 rounded-card border border-line bg-surface p-5 no-underline transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
                                    <b className="text-heading font-semibold text-ink">{r.titulo} →</b>
                                    <span className="text-small text-ink-2">{r.texto}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}
