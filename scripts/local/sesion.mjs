// La cookie de sesión de @supabase/ssr para una persona de prueba (para Playwright o el navegador).
//   node scripts/local/sesion.mjs <uuid> <email> [nombre]
import { firmar } from './proxy.mjs';

export function cookieSesion(id, email, nombre = email) {
    const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
    const access_token = firmar({ sub: id, email, name: nombre, role: 'authenticated', aud: 'authenticated', exp });
    const session = {
        access_token,
        token_type: 'bearer',
        expires_in: 12 * 3600,
        expires_at: exp,
        refresh_token: 'local',
        user: { id, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { full_name: nombre } },
    };
    // Nombre de @supabase/ssr: sb-<primera parte del host>-auth-token  (127.0.0.1 → sb-127-auth-token)
    return { name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url') };
}
export const ANON = firmar({ role: 'anon', iss: 'supabase', exp: 2000000000 });

if (process.argv[1]?.endsWith('sesion.mjs')) {
    const [id, email, nombre] = process.argv.slice(2);
    console.log(id ? JSON.stringify(cookieSesion(id, email, nombre)) : ANON);
}
