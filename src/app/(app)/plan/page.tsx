import type { Metadata } from 'next';
import { PlanView } from './plan-view.tsx';

export const metadata: Metadata = { title: 'Plan de compras' };

// Nada que esperar en el servidor: el plan lo lee el navegador (plan_compras, sin montos).
export default function PlanPage() {
    return <PlanView />;
}
