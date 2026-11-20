import type { Metadata } from 'next';
import { CuadroView } from './cuadro-view.tsx';

export const metadata: Metadata = { title: 'Cuadro de aprobaciones' };

// Nada que esperar en el servidor: el cuadro lo lee el navegador (v_cuadro_aprobaciones_app; RLS: quien ve precios).
export default function CuadroPage() {
    return <CuadroView />;
}
