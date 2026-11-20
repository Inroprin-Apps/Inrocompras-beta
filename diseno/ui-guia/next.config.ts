import type { NextConfig } from 'next';

// La guía UI/UX de INROPRIN: solo páginas estáticas con ejemplos vivos.
const nextConfig: NextConfig = {
    agentRules: false,
    experimental: {
        // Sin caché en disco para `pnpm dev`: con ella, un cambio en globals.css a veces no llegaba
        // hasta borrar .next. Arrancar en frío cuesta unos segundos; ver los colores al día no.
        turbopackFileSystemCacheForDev: false,
    },
};

export default nextConfig;
