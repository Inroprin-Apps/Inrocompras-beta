import type { Metadata } from 'next';
import { TeTocaView } from './te-toca-view.tsx';

export const metadata: Metadata = { title: 'Te toca' };

// Nada que esperar en el servidor: la bandeja la lee el navegador (teTocaStore, una vez por pestaña).
export default function TeTocaPage() {
    return <TeTocaView />;
}
