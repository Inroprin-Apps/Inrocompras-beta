import type { Metadata } from 'next';
import { SeguimientoView } from './seguimiento-view.tsx';

export const metadata: Metadata = { title: 'Seguimiento' };

// Nada que esperar en el servidor: el avance lo lee el navegador (seguimientoStore), sin montos.
export default function SeguimientoPage() {
    return <SeguimientoView />;
}
