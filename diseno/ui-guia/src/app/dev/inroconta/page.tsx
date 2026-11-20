import { notFound } from 'next/navigation';
import { Inroconta } from './inroconta.tsx';

// Solo en desarrollo (`pnpm dev`): cómo se vería INROCONTA con el diseño aprobado en /dev/colores. Con datos inventados.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'INROCONTA con el diseño nuevo' };

export default function InrocontaPage() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <Inroconta />;
}
