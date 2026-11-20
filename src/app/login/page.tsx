import type { Metadata } from 'next';
import { CuboRombos } from '@/shared/ui/marca.tsx';
import { BotonGoogle } from './boton-google.tsx';

export const metadata: Metadata = { title: 'Iniciar sesión' };

// Los errores que pueden volver del callback, dichos de forma que la persona sepa qué hacer.
function mensaje(error?: string, detalle?: string) {
    if (!error) return null;
    if (error === 'dominio' || /saving new user|Solo cuentas/i.test(detalle ?? '')) {
        return 'Solo puedes entrar con tu cuenta de la empresa (@inroprin.com). Elige esa cuenta en Google.';
    }
    if (error === 'access_denied') return 'Cancelaste el inicio de sesión. Vuelve a intentarlo cuando quieras.';
    if (error === 'inactivo') return 'Tu usuario está desactivado. Pide al administrador que lo reactive.';
    return 'No se pudo iniciar sesión. Inténtalo otra vez; si se repite, avisa al administrador.';
}

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const q = await searchParams;
    const error = mensaje(q.error, q.error_description);
    const volver = q.volver && q.volver.startsWith('/') && !q.volver.startsWith('//') ? q.volver : '/';
    return (
        <main className="flex min-h-dvh items-center justify-center bg-surface-2 px-4">
            <div className="w-full max-w-sm rounded-card border border-line bg-surface p-8 shadow-card">
                <div className="mb-6 flex items-center gap-3">
                    <CuboRombos size={40} variante="relleno" />
                    <div>
                        <h1 className="text-subtitle leading-tight font-semibold">INROCOMPRAS</h1>
                        <p className="text-small text-ink-2">Compras e Importaciones</p>
                    </div>
                </div>
                <p className="mb-5 text-body text-ink-2">Entra con tu cuenta de Google de la empresa.</p>
                {error && (
                    <p role="alert" className="mb-4 rounded-control bg-danger-soft px-3 py-2.5 text-ui text-danger-strong">
                        {error}
                    </p>
                )}
                <BotonGoogle volver={volver} />
            </div>
        </main>
    );
}
