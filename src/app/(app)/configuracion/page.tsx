import type { Metadata } from 'next';
import { ConfiguracionView } from './configuracion-view.tsx';

export const metadata: Metadata = { title: 'Configuración' };

// Nada que esperar en el servidor: la configuración y la cola las lee el navegador (store.ts).
export default function ConfiguracionPage() {
    return <ConfiguracionView />;
}
