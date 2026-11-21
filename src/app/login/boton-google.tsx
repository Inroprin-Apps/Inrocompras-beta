'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button.tsx';
import { supabaseNavegador } from '@/shared/supabase/client.ts';

const DOMINIO = process.env.NEXT_PUBLIC_DOMINIO ?? 'inroprin.com';

// No hay correo y contraseña: solo Google. `hd` hace que Google ofrezca solo cuentas del dominio;
// la base (app.alta_usuario) rechaza igual cualquier otra.
export function BotonGoogle({ volver }: { volver: string }) {
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function entrar() {
        setCargando(true);
        setError(null);
        const { error: e } = await supabaseNavegador().auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: { hd: DOMINIO, prompt: 'select_account' },
                redirectTo: `${window.location.origin}/auth/callback?volver=${encodeURIComponent(volver)}`,
            },
        });
        if (e) {
            setError('No se pudo abrir Google. Revisa tu conexión e inténtalo otra vez.');
            setCargando(false);
        }
    }
    return (
        <>
            <Button size="lg" className="w-full" onClick={entrar} disabled={cargando}>
                {cargando ? 'Abriendo Google…' : 'Iniciar sesión con Google'}
            </Button>
            {error && (
                <p role="alert" className="mt-3 text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </>
    );
}
