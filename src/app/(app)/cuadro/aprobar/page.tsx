import type { Metadata } from 'next';
import { AprobarView } from './aprobar-view.tsx';

export const metadata: Metadata = { title: 'Aprobar órdenes' };

// La bandeja compacta de CG, GOP y GAF para aprobar desde el celular (criterio D: «3 toques»).
export default function AprobarPage() {
    return <AprobarView />;
}
