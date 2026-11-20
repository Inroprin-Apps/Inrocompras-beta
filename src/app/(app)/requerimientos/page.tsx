import type { Metadata } from 'next';
import { RequerimientosView } from './requerimientos-view.tsx';

export const metadata: Metadata = { title: 'Requerimientos' };

// Nada que esperar en el servidor: los requerimientos los lee el navegador (requerimientosStore).
export default function RequerimientosPage() {
    return <RequerimientosView />;
}
