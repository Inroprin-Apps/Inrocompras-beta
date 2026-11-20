import type { Metadata } from 'next';
import { PagosView } from './pagos-view.tsx';

export const metadata: Metadata = { title: 'Pagos' };

// Nada que esperar en el servidor: las cuotas las lee el navegador (RLS: solo quien ve precios).
export default function PagosPage() {
    return <PagosView />;
}
