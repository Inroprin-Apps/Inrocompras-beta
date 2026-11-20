import type { Metadata } from 'next';
import { ProyectosView } from './proyectos-view.tsx';

export const metadata: Metadata = { title: 'Proyectos' };

// Nada que esperar en el servidor: los proyectos los lee el navegador (proyectosStore).
export default function ProyectosPage() {
    return <ProyectosView />;
}
