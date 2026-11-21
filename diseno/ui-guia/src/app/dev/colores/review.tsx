'use client';

// La paleta en una sola pantalla, para decidir. Todo sale de globals.css (page.tsx lo lee y lo
// pasa aquí): cada grupo con sus tokens, su valor real, su contraste y sus ejemplos de uso, y al
// final una pantalla pequeña con todo junto. Al guardar globals.css la página se actualiza sola.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../ui/button.tsx';
import { CARD, Chip, Kpi, KpiNote } from '../../../ui/card.tsx';
import { BarRow, Notice } from '../../../ui/bits.tsx';
import type { ColorGroup, ColorToken, GroupStatus } from '../../../guia/tokens.ts';
import { Entry, NotPorted } from './componentes.tsx';
import { COMPONENTS } from '../../../guia/componentes.ts';
import { USAGE } from './usage.tsx';

type RGB = [number, number, number];

// --- Color real y contraste -------------------------------------------------------------------

/** El color de un token tal como lo pinta el navegador. */
function resolve(probe: HTMLElement, token: string): RGB | null {
    probe.style.color = '';
    probe.style.color = `var(${token})`;
    const c = getComputedStyle(probe).color;
    const rgb = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c);
    if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
    // Una mezcla en oklab vuelve como `oklab(...)` o `color(...)`: se pinta en un canvas de 1 px y se lee el píxel.
    const ctx = (canvas ??= document.createElement('canvas')).getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    canvas.width = canvas.height = 1;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
}

let canvas: HTMLCanvasElement | undefined;

const hex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function luminance([r, g, b]: RGB) {
    const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: RGB, b: RGB) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/** Los valores de las variables tal como los tiene la página ahora mismo. */
const varsSignature = (names: string[]) => {
    const s = getComputedStyle(document.documentElement);
    return names.map((n) => s.getPropertyValue(n)).join('|');
};

const POLL_MS = 1500;

/**
 * Los colores resueltos de `tokens`, al día con globals.css. Turbopack cambia la hoja de estilos
 * sin cambiarle la URL, así que no hay un evento fiable que escuchar: mientras la pestaña está a
 * la vista, cada 1.5 s se comparan los valores de las variables (si cambiaron, se vuelven a leer los
 * colores) y se le pide al servidor que relea globals.css (grupos, usos y estado, que son
 * comentarios y no cambian el CSS). Es una página de desarrollo: el costo da igual.
 */
function useLiveColors(tokens: string[]) {
    const probe = useRef<HTMLSpanElement>(null);
    const router = useRouter();
    const [colors, setColors] = useState<Record<string, RGB>>({});
    const [tick, setTick] = useState(0);
    const key = tokens.join('|');

    useEffect(() => {
        const names = key.split('|');
        let last = varsSignature(names);
        const id = setInterval(() => {
            if (document.hidden) return;
            const now = varsSignature(names);
            if (now !== last) {
                last = now;
                setTick((t) => t + 1);
            }
            router.refresh();
        }, POLL_MS);
        return () => clearInterval(id);
    }, [key, router]);

    useEffect(() => {
        // Un cuadro después: la hoja nueva ya está aplicada.
        const id = requestAnimationFrame(() => {
            if (!probe.current) return;
            const out: Record<string, RGB> = {};
            for (const t of key.split('|')) {
                const c = resolve(probe.current, t);
                if (c) out[t] = c;
            }
            setColors(out);
        });
        return () => cancelAnimationFrame(id);
    }, [key, tick]);

    return { probe, colors };
}

// --- Piezas ---------------------------------------------------------------------------------

function StatusChip({ status }: { status: GroupStatus }) {
    return status === 'aprobado' ? <Chip tone="ok">Aprobado</Chip> : <Chip tone="warn">Por aprobar</Chip>;
}

function Ratio({ value, border = false }: { value: number; border?: boolean }) {
    if (border) {
        // Un borde de control pide 3:1 (WCAG 1.4.11), no 4.5.
        return (
            <span className={`text-caption font-medium tabular-nums ${value >= 3 ? 'text-success-strong' : 'text-danger-strong'}`} title="Contraste de borde (WCAG 1.4.11)">
                {value.toFixed(1)}:1 · {value >= 3 ? 'borde OK' : 'borde no'}
            </span>
        );
    }
    // WCAG AA: 4.5 para texto normal; 3 basta para texto grande o en negrita.
    const tone = value >= 4.5 ? 'text-success-strong' : value >= 3 ? 'text-warning-strong' : 'text-danger-strong';
    const label = value >= 4.5 ? 'AA' : value >= 3 ? 'solo grande' : 'no';
    return (
        <span className={`text-caption font-medium tabular-nums ${tone}`} title="Contraste como texto (WCAG)">
            {value.toFixed(1)}:1 · {label}
        </span>
    );
}

function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-heading font-semibold">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

const short = (name: string) => name.replace('--color-', '');

/** De dónde sale el valor: otro token, una mezcla o un valor propio. */
function Origin({ t }: { t: ColorToken }) {
    if (t.alias) return <span className="text-caption text-ink-2">= {t.alias}</span>;
    if (t.mix) return <span className="text-caption text-ink-2">mezcla</span>;
    return null;
}

function TokenRow({ t, colors }: { t: ColorToken; colors: Record<string, RGB> }) {
    const c = colors[t.name];
    const bg = t.on ? colors[t.on] : undefined;
    return (
        <li className="flex items-center gap-3 px-3 py-2">
            <span className="size-8 flex-none rounded-inner border border-line" style={{ background: `var(${t.name})` }} />
            <span className="flex min-w-0 flex-1 flex-col">
                <code className="truncate text-small font-medium">{short(t.name)}</code>
                <span className="truncate text-caption text-ink-2">{t.use}</span>
            </span>
            {t.on && (
                <span
                    className="hidden rounded-inner border border-line px-2 py-1 text-small font-medium sm:inline"
                    style={{ color: `var(${t.name})`, background: `var(${t.on})` }}
                    title={`Texto sobre ${short(t.on)}`}
                >
                    Aa
                </span>
            )}
            <span className="flex flex-col items-end">
                <code className="text-caption text-ink select-all">{c ? hex(c) : '…'}</code>
                {c && bg ? <Ratio value={contrast(c, bg)} border={t.border} /> : <Origin t={t} />}
            </span>
        </li>
    );
}

/** La línea que divide lo aprobado de lo que falta. Una sola para toda la UI: colores, piezas y lo que venga. */
function Divider({ label, count, tone }: { label: string; count: number; tone: 'ok' | 'warn' }) {
    const line = tone === 'ok' ? 'bg-success' : 'bg-warning';
    return (
        <div className="flex items-center gap-4 py-2" role="separator" aria-label={label}>
            <span className={`h-0.5 flex-1 ${line}`} />
            <span className="text-ui font-semibold">
                {label} <span className="font-normal text-ink-2">· {count}</span>
            </span>
            <span className={`h-0.5 flex-1 ${line}`} />
        </div>
    );
}

/** Los colores que van sí o sí, en tarjetas grandes con su valor. */
function SwatchBlock({ g, colors }: { g: ColorGroup; colors: Record<string, RGB> }) {
    return (
        <Block title={g.title} aside={<Kind kind="Color" status={g.status} />}>
            <p className="-mt-2 text-small text-ink-2">{g.note}</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {g.tokens.map((t) => (
                    <li key={t.name} className={`overflow-hidden ${CARD}`}>
                        <div className="h-20 border-b border-divider" style={{ background: `var(${t.name})` }} />
                        <div className="flex flex-col gap-0.5 px-3 py-2">
                            <code className="text-small font-medium">{short(t.name)}</code>
                            <code className="text-caption text-ink select-all">{colors[t.name] ? hex(colors[t.name]) : '…'}</code>
                            <span className="text-caption text-ink-2">{t.use}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </Block>
    );
}

/** Qué clase de cosa es (Color, Pieza…) y si está aprobada. */
function Kind({ kind, status }: { kind: string; status: GroupStatus }) {
    return (
        <span className="flex items-center gap-2">
            <Chip tone="muted">{kind}</Chip>
            <StatusChip status={status} />
        </span>
    );
}

function RoleBlock({ g, colors }: { g: ColorGroup; colors: Record<string, RGB> }) {
    return (
        <Block title={g.title} aside={<Kind kind="Color" status={g.status} />}>
            {g.note && <p className="-mt-2 max-w-3xl text-small text-ink-2">{g.note}</p>}
            <div className={`grid grid-cols-[minmax(0,1fr)] items-start gap-4 ${USAGE[g.id] ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''}`}>
                <ul className={`flex flex-col divide-y divide-divider ${CARD}`}>
                    {g.tokens.map((t) => (
                        <TokenRow key={t.name} t={t} colors={colors} />
                    ))}
                </ul>
                {USAGE[g.id] && (
                    <div className="flex flex-col gap-2">
                        <p className="text-caption font-medium tracking-[.06em] text-ink-2 uppercase">Ejemplos de uso</p>
                        {USAGE[g.id]}
                    </div>
                )}
            </div>
        </Block>
    );
}

export function ColorReview({ groups }: { groups: ColorGroup[] }) {
    const names = groups.flatMap((g) => g.tokens.flatMap((t) => [t.name, ...(t.on ? [t.on] : [])]));
    const { probe, colors } = useLiveColors([...new Set(names)]);
    const approvedColors = groups.filter((g) => g.status === 'aprobado');
    const pendingColors = groups.filter((g) => g.status !== 'aprobado');
    const approvedParts = COMPONENTS.filter((c) => c.status === 'aprobado');
    const pendingParts = COMPONENTS.filter((c) => c.status !== 'aprobado');

    return (
        <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-8">
            <span ref={probe} className="hidden" aria-hidden="true" />

            <header className="flex flex-col gap-1.5">
                <p className="text-caption font-medium tracking-[.06em] text-ink-2 uppercase">/dev/colores · solo en desarrollo</p>
                <h1 className="text-title font-semibold">Para aprobar</h1>
                <p className="max-w-2xl text-ui text-ink-2">
                    Todo es UI: colores, piezas y lo que venga, en una sola hoja antes de armar la guía real. Una sola línea divide lo aprobado de lo que falta,
                    y algo sube sobre ella solo cuando dices «aprobado». Los colores salen de <code>src/app/globals.css</code> y las piezas de{' '}
                    <code>src/guia/componentes.ts</code>; guarda cualquiera de los dos y la página se actualiza sola.
                </p>
            </header>

            <Divider label="Aprobados" count={approvedColors.length + approvedParts.length} tone="ok" />

            {approvedColors.length + approvedParts.length === 0 && (
                <p className={`${CARD} px-5 py-4 text-ui text-ink-2`}>Todavía nada. Lo que apruebes sube aquí.</p>
            )}
            {approvedColors.map((g) => (g.id === 'aprobados' ? <SwatchBlock key={g.id} g={g} colors={colors} /> : <RoleBlock key={g.id} g={g} colors={colors} />))}
            {approvedParts.map((c) => (
                <Entry key={c.id} c={c} />
            ))}

            <Divider label="Por aprobar" count={pendingColors.length + pendingParts.length} tone="warn" />

            {pendingColors.map((g) => (
                <RoleBlock key={g.id} g={g} colors={colors} />
            ))}
            {pendingParts.map((c) => (
                <Entry key={c.id} c={c} />
            ))}

            <Block title="Todos juntos" aside={<span className="text-small text-ink-2">Una pantalla típica, solo para juzgar el color</span>}>
                <div className="flex flex-col gap-3 rounded-card bg-surface p-3 ring-1 ring-line sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-title font-semibold">Compras de noviembre</h3>
                        <div className="flex gap-2">
                            <Button variant="secondary">Exportar</Button>
                            <Button>Nueva orden</Button>
                        </div>
                    </div>
                    <Notice tone="warning">El robot no corrió hoy: los datos son de ayer a las 07:00.</Notice>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Kpi label="Ventas" value="S/ 952,851.25">
                            <KpiNote>132 comprobantes</KpiNote>
                        </Kpi>
                        <Kpi label="Compras" value="S/ 722,261.20">
                            <KpiNote>98 comprobantes</KpiNote>
                        </Kpi>
                        <Kpi label="Sin OC" value="27" risk>
                            <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
                        </Kpi>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[3fr_2fr]">
                        <div className={`${CARD} px-5 py-4`}>
                            {[
                                ['Papeles del Pacífico EIRL', 'S/ 12,480.00', 'ok', 'Pagado'],
                                ['Tintas Lima Norte SAC', 'S/ 8,210.50', 'warn', 'Pendiente'],
                                ['Transportes Rímac SRL', 'S/ 3,900.00', 'danger', 'Sin OC'],
                                ['Cartones Huallaga SA', 'S/ 1,150.00', 'muted', 'Anulado'],
                            ].map(([n, m, tone, label], i) => (
                                <div
                                    key={n}
                                    className={`-mx-2 flex items-center justify-between gap-3 rounded-lg border-b border-divider px-2 py-2.5 last:border-0 ${i === 1 ? 'ring-1 ring-inset ring-primary' : 'hover:bg-surface-2'}`}
                                >
                                    <span className="flex min-w-0 flex-col">
                                        <a href="#" className="truncate text-ui font-medium text-ink hover:text-primary hover:underline">
                                            {n}
                                        </a>
                                        <span className="text-caption text-ink-2">20512345678 · 14/11/2026</span>
                                    </span>
                                    <span className="flex flex-none flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                                        <Chip tone={tone as 'ok' | 'warn' | 'danger' | 'muted'}>{label}</Chip>
                                        <span className="text-right text-ui tabular-nums sm:w-24">{m}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className={`${CARD} px-5 py-4`}>
                            <BarRow label="Ventas" figures="S/ 953 mil" pct={100} color="primary" />
                            <BarRow label="Compras" figures="S/ 722 mil" pct={76} color="teal" />
                            <BarRow label="Por cobrar" figures="S/ 318 mil" pct={33} color="warning" />
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button variant="danger">Eliminar</Button>
                                <Button disabled>Deshabilitado</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Block>

            <NotPorted />
        </main>
    );
}
