import type { Metadata } from 'next';
import { SolicitudesView } from './solicitudes-view.tsx';

export const metadata: Metadata = { title: 'Solicitudes' };

// Nada que esperar en el servidor: las solicitudes las lee el navegador (solicitudesStore).
export default function SolicitudesPage() {
    return <SolicitudesView />;
}
