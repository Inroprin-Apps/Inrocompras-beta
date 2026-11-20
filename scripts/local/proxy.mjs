// Supabase local mínimo para probar la app sin Docker Hub (ver scripts/local/README.md):
//   /rest/v1/*      → PostgREST (puerto 54323), con CORS
//   /storage/v1/*   → Storage (puerto 54324)
//   /auth/v1/user   → valida el JWT (HS256, clave local) y devuelve la persona: lo que @supabase/ssr pide con getUser()
// SOLO PARA PRUEBAS LOCALES: la clave es pública y no hay contraseñas.
import http from 'node:http';
import crypto from 'node:crypto';

export const SECRETO = 'local-jwt-secret-inrocompras-solo-para-pruebas-32';
const REST = 'http://127.0.0.1:54323';
const STORAGE = 'http://127.0.0.1:54324';
const PUERTO = Number(process.env.PUERTO ?? 54321);

const b64u = (b) => Buffer.from(b).toString('base64url');
export function firmar(payload) {
    const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const p = b64u(JSON.stringify(payload));
    return `${h}.${p}.${crypto.createHmac('sha256', SECRETO).update(`${h}.${p}`).digest('base64url')}`;
}
function verificar(t) {
    const [h, p, s] = (t ?? '').split('.');
    if (!s) return null;
    const ok = crypto.createHmac('sha256', SECRETO).update(`${h}.${p}`).digest('base64url') === s;
    if (!ok) return null;
    const c = JSON.parse(Buffer.from(p, 'base64url').toString());
    return c.exp && c.exp * 1000 < Date.now() ? null : c;
}

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD',
    'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile,range,x-supabase-api-version',
    'access-control-expose-headers': 'content-range,content-location',
};

if (process.argv[1] && process.argv[1].endsWith('proxy.mjs')) {
    http.createServer((req, res) => {
        if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();
        const url = new URL(req.url, 'http://x');
        if (url.pathname === '/auth/v1/user') {
            const c = verificar((req.headers.authorization ?? '').replace(/^Bearer /, ''));
            if (!c || c.role !== 'authenticated') return res.writeHead(401, { ...CORS, 'content-type': 'application/json' }).end('{"message":"invalid JWT"}');
            return res
                .writeHead(200, { ...CORS, 'content-type': 'application/json' })
                .end(JSON.stringify({ id: c.sub, aud: 'authenticated', role: 'authenticated', email: c.email, app_metadata: {}, user_metadata: { full_name: c.name }, created_at: new Date().toISOString() }));
        }
        if (url.pathname.startsWith('/auth/v1/')) return res.writeHead(200, { ...CORS, 'content-type': 'application/json' }).end('{}');
        const esStorage = url.pathname.startsWith('/storage/v1');
        if (!url.pathname.startsWith('/rest/v1') && !esStorage) return res.writeHead(404, CORS).end();
        const destino = esStorage ? STORAGE + url.pathname.replace(/^\/storage\/v1/, '') + url.search : REST + url.pathname.replace(/^\/rest\/v1/, '') + url.search;
        const headers = { ...req.headers };
        delete headers.host;
        const p = http.request(destino, { method: req.method, headers }, (r) => {
            res.writeHead(r.statusCode, { ...r.headers, ...CORS });
            r.pipe(res);
        });
        p.on('error', (e) => res.writeHead(502, CORS).end(String(e)));
        req.pipe(p);
    }).listen(PUERTO, () => console.log(`Supabase local de pruebas en http://127.0.0.1:${PUERTO}`));
}
