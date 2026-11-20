import type { Metadata } from 'next';
import { ProveedoresView } from './proveedores-view.tsx';

export const metadata: Metadata = { title: 'Proveedores' };

// Nada que esperar en el servidor: los proveedores los lee el navegador (proveedoresStore).
export default function ProveedoresPage() {
    return <ProveedoresView />;
}
