'use client';

// Los cinco estados de una lista (docs/06): cargando (huecos con la forma de la tabla), vacía (con qué
// hacer), error (con reintentar), parcial (llegó algo y sigue revisándose) y completa (la tabla).
import type { ReactNode } from 'react';
import { CircleAlert, Inbox } from 'lucide-react';
import { Button } from './button.tsx';
import { Hueco } from './hueco.tsx';

export function ListaCargando({ filas = 5 }: { filas?: number }) {
    return (
        <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
            {Array.from({ length: filas }, (_, i) => (
                <Hueco key={i} className="h-9 w-full" />
            ))}
        </div>
    );
}

export function ListaVacia({ titulo, children, icono }: { titulo: string; children?: ReactNode; icono?: ReactNode }) {
    return (
        <div className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-12 text-center">
            <span className="mb-3 text-ink-3">{icono ?? <Inbox size={28} aria-hidden />}</span>
            <p className="text-heading font-medium">{titulo}</p>
            {children && <div className="mt-1 max-w-md text-ui text-ink-2">{children}</div>}
        </div>
    );
}

export function ListaError({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
    return (
        <div role="alert" className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-12 text-center">
            <CircleAlert size={28} className="mb-3 text-danger" aria-hidden />
            <p className="text-heading font-medium">No se pudo cargar</p>
            <p className="mt-1 max-w-md text-ui text-ink-2">{mensaje}</p>
            {onReintentar && (
                <Button className="mt-4" variant="secondary" onClick={onReintentar}>
                    Reintentar
                </Button>
            )}
        </div>
    );
}

/** Decide cuál de los estados pintar. `vacia` se muestra si `items` está vacío; si no, `children`. */
export function Lista<T>({
    estado,
    onReintentar,
    vacia,
    children,
}: {
    estado: { data: T[] | null; error: string | null };
    onReintentar?: () => void;
    vacia: ReactNode;
    children: (items: T[]) => ReactNode;
}) {
    if (estado.error && !estado.data) return <ListaError mensaje={estado.error} onReintentar={onReintentar} />;
    if (!estado.data) return <ListaCargando />;
    if (!estado.data.length) return <>{vacia}</>;
    return <>{children(estado.data)}</>;
}
