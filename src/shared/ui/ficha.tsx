'use client';

// La FICHA LATERAL del prototipo v3: al tocar una fila se abre a la derecha (en el celular, a pantalla
// completa). Arriba el título y el hilo de fases con rombos; después, el recuadro azul «Lo que te toca»
// (los botones de acciones_disponibles); abajo el detalle, los documentos y el historial.
// Es un <aside> no modal: la lista sigue viva detrás y se puede abrir otra fila sin cerrar. En laptop va encima de la
// lista; desde 1536 px la corre (globals.css: html.con-ficha) y desde 1920 px mide 640 px.
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button.tsx';

export function Ficha({
    titulo,
    subtitulo,
    estado,
    onCerrar,
    children,
}: {
    titulo: ReactNode;
    subtitulo?: ReactNode;
    estado?: ReactNode;
    onCerrar: () => void;
    children: ReactNode;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('dialog[open]') && onCerrar();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCerrar]);
    // En escritorio la lista se angosta para no quedar tapada por la ficha (globals.css: html.con-ficha).
    useEffect(() => {
        document.documentElement.classList.add('con-ficha');
        return () => document.documentElement.classList.remove('con-ficha');
    }, []);
    return (
        <aside
            aria-label="Ficha"
            className="ficha-lateral fixed inset-0 z-30 flex flex-col overflow-hidden bg-surface md:inset-y-0 md:right-0 md:left-auto md:border-l md:border-line md:shadow-float"
        >
            <header className="flex items-start gap-3 border-b border-divider px-5 py-4">
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-subtitle font-semibold">{titulo}</h2>
                    {subtitulo && <div className="mt-0.5 truncate text-small text-ink-2">{subtitulo}</div>}
                    {estado && <div className="mt-2">{estado}</div>}
                </div>
                <Button variant="ghost" iconOnly aria-label="Cerrar la ficha" onClick={onCerrar}>
                    <X size={18} />
                </Button>
            </header>
            <div className="flex-1 overflow-y-auto">{children}</div>
        </aside>
    );
}

/** Una sección de la ficha: título pequeño y contenido. */
export function FichaSeccion({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
    return (
        <section className="border-b border-divider px-5 py-4 last:border-b-0">
            <div className="mb-2.5 flex items-center gap-2">
                <h3 className="flex-1 text-ui font-semibold">{titulo}</h3>
                {accion}
            </div>
            {children}
        </section>
    );
}

/** Pares etiqueta → valor, en dos columnas desde tablet. */
export function Datos({ filas }: { filas: [string, ReactNode][] }) {
    return (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {filas
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => (
                    <div key={k} className="min-w-0">
                        <dt className="text-caption text-ink-3">{k}</dt>
                        <dd className="text-ui break-words">{v === null || v === '' ? <span className="text-ink-3">—</span> : v}</dd>
                    </div>
                ))}
        </dl>
    );
}

/**
 * El hilo de fases con rombos: los pasos hechos en azul, el actual con borde, lo que falta en gris.
 * `actual` es el índice del paso en curso; -1 = anulado/rechazado (todo en gris, el último en rojo).
 */
export function Fases({ pasos, actual }: { pasos: string[]; actual: number }) {
    return (
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-caption" aria-label="Fases">
            {pasos.map((p, i) => {
                const hecho = actual >= 0 && i < actual;
                const enCurso = i === actual;
                return (
                    <li key={p} className="flex items-center gap-1.5">
                        <span
                            aria-hidden
                            className={`inline-block size-2.5 rotate-45 ${hecho ? 'bg-primary' : enCurso ? 'border-2 border-primary bg-surface' : 'bg-surface-3'}`}
                        />
                        <span className={enCurso ? 'font-semibold text-ink' : hecho ? 'text-ink-2' : 'text-ink-3'} aria-current={enCurso ? 'step' : undefined}>
                            {p}
                        </span>
                        {i < pasos.length - 1 && <span aria-hidden className="mx-0.5 h-px w-3 bg-divider" />}
                    </li>
                );
            })}
        </ol>
    );
}
