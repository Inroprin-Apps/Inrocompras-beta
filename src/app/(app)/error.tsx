'use client';

import { Button } from '@/shared/ui/button.tsx';

// El error de una pantalla: qué pasó y un botón para reintentar.
export default function ErrorPantalla({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div role="alert" className="mt-12 max-w-lg rounded-card border border-line bg-surface p-6">
            <h1 className="mb-1 text-heading font-semibold">No se pudo cargar esta pantalla</h1>
            <p className="mb-4 text-ui text-ink-2">{error.message || 'Revisa tu conexión e inténtalo otra vez.'}</p>
            <Button onClick={reset}>Reintentar</Button>
        </div>
    );
}
