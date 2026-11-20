import type { Metadata } from 'next';
import { ValidacionesView } from './validaciones-view.tsx';

export const metadata: Metadata = { title: 'Validaciones técnicas' };

// Nada que esperar en el servidor: los ítems los lee el navegador (tecnicaStore).
export default function ValidacionesPage() {
    return <ValidacionesView />;
}
