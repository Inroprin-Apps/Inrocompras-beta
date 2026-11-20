import { notFound } from 'next/navigation';
import { Prueba } from './prueba.tsx';

// Solo en desarrollo (`pnpm dev`): una pantalla armada solo con lo aprobado en /dev/colores, para verlo junto.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Prueba: todo lo aprobado junto' };

export default function PruebaPage() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <Prueba />;
}
