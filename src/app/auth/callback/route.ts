import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '../../../lib/supabase/server.ts';

// Google vuelve aquí con un código; se cambia por la sesión (cookies). Si la base rechazó la cuenta
// (otro dominio), Supabase vuelve con ?error=…: se pasa al login para que lo explique.
export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams;
    const volverCrudo = q.get('volver') ?? '/';
    const volver = volverCrudo.startsWith('/') && !volverCrudo.startsWith('//') ? volverCrudo : '/';
    const login = new URL('/login', request.url);

    const error = q.get('error');
    if (error) {
        login.searchParams.set('error', error);
        const detalle = q.get('error_description');
        if (detalle) login.searchParams.set('error_description', detalle);
        return NextResponse.redirect(login);
    }
    const code = q.get('code');
    if (!code) return NextResponse.redirect(login);

    const supabase = await supabaseServidor();
    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
    if (e) {
        login.searchParams.set('error', 'sesion');
        return NextResponse.redirect(login);
    }
    return NextResponse.redirect(new URL(volver, request.url));
}
