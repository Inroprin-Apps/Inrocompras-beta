import type { Metadata } from 'next';
import { DesaduanajeView } from './desaduanaje-view.tsx';

export const metadata: Metadata = { title: 'Desaduanaje' };

// Nada que esperar en el servidor: los desaduanajes los lee el navegador (desaduanajesStore).
export default function DesaduanajePage() {
    return <DesaduanajeView />;
}
