import type { Metadata } from 'next';
import { EquipoView } from './equipo-view.tsx';

export const metadata: Metadata = { title: 'Equipo' };

// Nada que esperar en el servidor: el equipo lo lee el navegador (equipoStore). Solo el administrador lo edita
// (la vista lo dice; la base lo exige en ac_equipo_guardar).
export default function EquipoPage() {
    return <EquipoView />;
}
