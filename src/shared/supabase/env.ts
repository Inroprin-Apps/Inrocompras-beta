// Las dos variables públicas de Supabase. Sin ellas la app no puede arrancar: se dice qué falta.
export function supabaseEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error(
            'Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Cópialas de Supabase → Project Settings → API a .env.local (o a Vercel).',
        );
    }
    return { url, key };
}
