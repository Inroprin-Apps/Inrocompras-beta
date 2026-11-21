'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/ui/button.tsx';

// El error de una pantalla: qué pasó, en palabras de la persona, y un botón para reintentar. El mensaje técnico
// no se muestra (guía, «Vacío, carga y error»): queda en la consola y en el digest del servidor para soporte.
export default function ErrorPantalla({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error('Error de pantalla', error.digest ?? '', error), [error]);
    return (
        <div role="alert" className="mt-12 max-w-lg rounded-card border border-line bg-surface p-6">
            <h1 className="mb-1 text-heading font-semibold">No se pudo cargar esta pantalla</h1>
            <p className="mb-4 text-ui text-ink-2">
                Puede ser la conexión. Inténtalo otra vez; si sigue fallando, avisa a Sistemas{error.digest ? ` con este código: ${error.digest}` : ''}.
            </p>
            <Button onClick={reset}>Reintentar</Button>
        </div>
    );
}
