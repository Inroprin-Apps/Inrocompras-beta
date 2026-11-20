import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { ColorReview } from './review.tsx';
import { parseColorTokens } from '../../../guia/tokens.ts';

// Solo en desarrollo (`pnpm dev`): la hoja para revisar y aprobar la paleta, sin el menú de la guía.
// Lee globals.css en cada petición: los grupos, los tokens y su estado salen de ahí, no de una
// lista aparte. Fuera del prerender, o el cierre de producción se dispararía durante `pnpm build`.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Para aprobar (colores y piezas)' };

export default async function ColorsPage() {
    if (process.env.NODE_ENV === 'production') notFound();
    const css = await readFile(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
    return <ColorReview groups={parseColorTokens(css)} />;
}
