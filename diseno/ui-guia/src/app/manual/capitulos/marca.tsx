'use client';

// Marca: los colores, los rombos, el cubo en sus variantes y la tipografía.
import { HEX, rombo } from '../../../guia/marca-html.ts';
import { Escena, FIJA, MARGEN, SUBTITULAR, TITULAR, anunciarPaso, gsap, registrarEstados, useAnimacion } from '../escena.tsx';
import { Cubo } from './portada.tsx';

export function Marca() {
    const raiz = useAnimacion((q) => {
        // --- Colores: las tarjetas suben una tras otra ---
        const colores = gsap
            .timeline({ scrollTrigger: { trigger: q('#colores .escena')[0], start: 'top top', end: '+=120%', pin: true, scrub: 0.6 } })
            .from(q('.c-color'), { y: 140, opacity: 0, scale: 0.92, stagger: 0.22, duration: 0.8, ease: 'power3.out' });
        registrarEstados(colores.scrollTrigger, colores, [0, colores.duration()]); // solo el título · las cinco tarjetas

        // --- Rombos: se dibujan uno por uno ---
        const lados = q('.r-rombo');
        lados.forEach((p: Element) => {
            const len = (p as SVGGeometryElement).getTotalLength();
            gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        });
        const rombos = gsap
            .timeline({ scrollTrigger: { trigger: q('#rombos .escena')[0], start: 'top top', end: '+=110%', pin: true, scrub: 0.6 } })
            .to(lados, { strokeDashoffset: 0, duration: 1, stagger: 0.4, ease: 'power1.inOut' });
        registrarEstados(rombos.scrollTrigger, rombos, [0, rombos.duration()]); // contornos tenues · los cuatro dibujados

        // --- Cubo: contorno → relleno → gris → azul → blanco sobre azul ---
        const cubo = q('.k-cubo polygon');
        const leyendas = q('.k-leyenda');
        gsap.set(cubo, { fillOpacity: 0 });
        gsap.set(leyendas, { opacity: 0 });
        gsap.set(leyendas[0], { opacity: 1 });
        gsap.set(q('.k-panel'), { opacity: 0, scale: 0.9 });
        const k = gsap.timeline({ scrollTrigger: { trigger: q('#cubo .escena')[0], start: 'top top', end: '+=300%', pin: true, scrub: 0.6 } });
        // Cada paso cambia el texto y, a la vez, lo que se ve: 0 contorno · 1 relleno · 2 gris · 3 azul · 4 blanco sobre azul.
        const paso = (n: number) => {
            k.to(leyendas[n - 1], { opacity: 0, y: -16, duration: 0.3 }, '>+0.35').fromTo(
                leyendas[n],
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.3 },
                '<',
            );
        };
        const estados = [0]; // contorno · y, tras cada paso, el cubo ya terminó de cambiar
        paso(1);
        k.to(cubo, { fillOpacity: 1, duration: 1, stagger: 0.05, ease: 'none' }, '<');
        estados.push(k.duration());
        paso(2);
        k.to(cubo, { attr: { fill: HEX.gris, stroke: HEX.gris }, duration: 1, ease: 'none' }, '<');
        estados.push(k.duration());
        paso(3);
        k.to(cubo, { attr: { fill: HEX.azul, stroke: HEX.azul }, duration: 1, ease: 'none' }, '<');
        estados.push(k.duration());
        paso(4);
        k.to(q('.k-panel'), { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, '<').to(
            cubo,
            { attr: { fill: HEX.blanco, stroke: HEX.blanco }, duration: 0.8, ease: 'none' },
            '<',
        );
        estados.push(k.duration());
        registrarEstados(k.scrollTrigger, k, estados);
        const NOMBRES_CUBO = ['De contorno', 'De relleno', 'En gris', 'En un solo color', 'En blanco sobre color'];
        k.eventCallback('onUpdate', () => {
            const t = k.time();
            const i = estados.reduce((m, e, j) => (Math.abs(e - t) < Math.abs(estados[m] - t) ? j : m), 0);
            anunciarPaso('cubo', `${i + 1} de ${NOMBRES_CUBO.length} · ${NOMBRES_CUBO[i]}`);
        });

        // --- Tipografía: las líneas entran al llegar ---
        gsap.from(q('.t-linea'), {
            y: 44,
            opacity: 0,
            duration: 0.8,
            stagger: 0.18,
            ease: 'power2.out',
            scrollTrigger: { trigger: q('#tipografia')[0], start: 'top 65%', toggleActions: 'play none none reverse' },
        });
    });
    return (
        <div ref={raiz}>
            <Escena id="colores">
                <div className={FIJA}>
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
                        <div className="c-intro flex max-w-2xl flex-col gap-4">
                            <p className="text-ui font-semibold text-primary">01 · Marca</p>
                            <h2 className="font-semibold" style={TITULAR}>
                                Cuatro colores y un negro
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                Los del logo de Roland Print. Todo lo demás se deriva de ellos: nunca se inventa un color nuevo.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                            {[
                                ['Azul', 'primary', HEX.azul, 'Acciones y selección'],
                                ['Turquesa', 'secondary', HEX.turquesa, 'Segunda serie y acentos'],
                                ['Rojo', 'brand-red', HEX.rojo, 'Error y riesgo'],
                                ['Amarillo', 'brand-yellow', HEX.amarillo, 'Aviso (sin texto encima)'],
                                ['Negro', 'texto', HEX.texto, 'Texto principal'],
                            ].map(([nombre, rol, hex, uso]) => (
                                <div key={nombre} className="c-color overflow-hidden rounded-card border border-line bg-surface">
                                    <div className="h-32 md:h-44" style={{ background: hex }} />
                                    <div className="flex flex-col gap-0.5 px-4 py-3">
                                        <b className="text-heading font-semibold">{nombre}</b>
                                        <code className="text-small text-ink-2">{hex}</code>
                                        <span className="text-small text-ink-2">{uso}</span>
                                        <code className="text-caption text-ink-3">{rol}</code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Escena>

            <Escena id="rombos">
                <div className={FIJA}>
                    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 text-center">
                        <svg viewBox="0 0 88 24" fill="none" strokeWidth="0.45" className="w-full max-w-3xl" aria-hidden="true">
                            {/* Los cuatro contornos, muy tenues, para que la escena no empiece vacía; encima se dibujan de verdad. */}
                            {[HEX.azul, HEX.turquesa, HEX.rojo, HEX.amarillo].map((c, i) => (
                                <polygon key={`f${c}`} points={rombo(11 + i * 22, 12, 10)} stroke={c} strokeOpacity={0.16} />
                            ))}
                            {[HEX.azul, HEX.turquesa, HEX.rojo, HEX.amarillo].map((c, i) => (
                                <polygon key={c} className="r-rombo" points={rombo(11 + i * 22, 12, 10)} stroke={c} />
                            ))}
                        </svg>
                        <div className="r-texto flex max-w-2xl flex-col gap-4">
                            <h2 className="font-semibold" style={TITULAR}>
                                Los cuatro rombos
                            </h2>
                            <p className="text-ink-2" style={SUBTITULAR}>
                                Un sello pequeño sobre un título, una tarjeta o una firma de correo. Siempre en este orden: azul, turquesa, rojo y amarillo.
                            </p>
                        </div>
                    </div>
                </div>
            </Escena>

            <Escena id="cubo">
                <div className={FIJA}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
                        <div className="relative h-56 md:h-72">
                            {[
                                [
                                    'El cubo de rombos',
                                    'La cuadrícula de 3 × 3 girada 45° del logo. Primero, de contorno: es la decoración de la hoja membretada, el sobre y la firma.',
                                ],
                                ['De relleno es el logo', 'Los mismos rombos, rellenos con los colores de la marca.'],
                                ['En gris, discreto', 'De un solo color gris, para fondos que no deben competir con el contenido.'],
                                ['En un solo color', 'Azul, turquesa, rojo o amarillo, cuando la pieza lleva un solo color de la marca.'],
                                ['Y en blanco sobre color', 'Sobre un fondo de color, el cubo va en blanco: así se ve en la tarjeta de presentación.'],
                            ].map(([t, d]) => (
                                <div key={t} className="k-leyenda absolute inset-0 flex flex-col justify-center gap-4">
                                    <h2 className="font-semibold" style={TITULAR}>
                                        {t}
                                    </h2>
                                    <p className="text-ink-2" style={SUBTITULAR}>
                                        {d}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="relative flex justify-center">
                            <div className="k-panel absolute inset-4 rounded-card bg-primary" />
                            <Cubo clase="k-cubo relative" size={420} />
                        </div>
                    </div>
                </div>
            </Escena>

            <Escena id="tipografia">
                <div className={`flex min-h-screen items-center py-24 ${MARGEN}`}>
                    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
                        <div className="flex flex-col gap-4">
                            <p className="t-linea text-ui font-semibold text-primary">01 · Marca</p>
                            <h2 className="t-linea font-semibold" style={TITULAR}>
                                Montserrat, en tres pesos
                            </h2>
                            <p className="t-linea text-ink-2" style={SUBTITULAR}>
                                La letra de la empresa. Regular para el texto, medio para etiquetas y botones, seminegrita para títulos y cifras.
                            </p>
                        </div>
                        <div className="flex flex-col gap-6">
                            {[
                                ['400', 'Regular', 'Las facturas de proveedores se revisan antes de pagar.'],
                                ['500', 'Medio', 'Etiquetas, botones y chips'],
                                ['600', 'Seminegrita', 'S/ 952,851.25'],
                            ].map(([peso, nombre, ejemplo]) => (
                                <div key={peso} className="t-linea flex flex-col gap-1 border-b border-divider pb-4">
                                    <span className="text-small text-ink-2">
                                        {nombre} · {peso}
                                    </span>
                                    <span style={{ fontWeight: Number(peso), fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', lineHeight: 1.15 }}>{ejemplo}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Escena>
        </div>
    );
}
