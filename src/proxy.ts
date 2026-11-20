import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Renueva la sesión de Supabase en cada visita y manda al login a quien no la tiene.
// Es comodidad: la seguridad real la ponen RLS y las funciones de la base.
const PUBLICAS = ['/login', '/auth/callback'];

export default async function proxy(request: NextRequest) {
    let respuesta = NextResponse.next({ request });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return respuesta;

    const supabase = createServerClient(url, key, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (lista) => {
                for (const { name, value } of lista) request.cookies.set(name, value);
                respuesta = NextResponse.next({ request });
                for (const { name, value, options } of lista) respuesta.cookies.set(name, value, options);
            },
        },
    });
    // getUser valida el token con Supabase (getSession solo lee la cookie).
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const ruta = request.nextUrl.pathname;
    const publica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'));
    if (!user && !publica && !ruta.startsWith('/api/')) {
        const destino = request.nextUrl.clone();
        destino.pathname = '/login';
        destino.search = ruta === '/' ? '' : `?volver=${encodeURIComponent(ruta)}`;
        return NextResponse.redirect(destino);
    }
    return respuesta;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|IconRoland.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
