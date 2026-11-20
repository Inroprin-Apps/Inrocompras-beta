import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    agentRules: false,
    // Dos compilaciones a la vez en la misma copia (p. ej. dos agentes) necesitan carpetas distintas.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    experimental: {
        // El router guarda una página visitada este tiempo (s): volver a ella es instantáneo (valores de INROCONTA/GRAMA).
        staleTimes: { dynamic: 30, static: 300 },
    },
};

export default nextConfig;
