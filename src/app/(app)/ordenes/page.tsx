import type { Metadata } from 'next';
import { OrdenesView } from './ordenes-view.tsx';

export const metadata: Metadata = { title: 'Órdenes' };

// Nada que esperar en el servidor: las órdenes las lee el navegador (RLS: solo quien ve precios).
export default function OrdenesPage() {
    return <OrdenesView />;
}
