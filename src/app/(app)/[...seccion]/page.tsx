import { notFound } from 'next/navigation';
import { Construction } from 'lucide-react';
import { FECHA_HITO, TODAS } from '../../../lib/menu.ts';
import { SectionTitle } from '../../../ui/bits.tsx';

// Las secciones que aún no se construyen dicen en qué hito llegan, en vez de un 404.
export default async function Pronto({ params }: { params: Promise<{ seccion: string[] }> }) {
    const { seccion } = await params;
    const entrada = TODAS.find((x) => x.href === '/' + seccion[0]);
    if (!entrada) notFound();
    return (
        <>
            <SectionTitle title={entrada.label} />
            <div className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-14 text-center">
                <Construction size={28} className="mb-3 text-ink-3" aria-hidden />
                <p className="text-heading font-medium">Esta sección llega en el Hito {entrada.hito}</p>
                <p className="mt-1 text-ui text-ink-2">Fecha prevista: {FECHA_HITO[entrada.hito] ?? 'por definir'}. Mientras tanto, sigue en el AppSheet.</p>
            </div>
        </>
    );
}
