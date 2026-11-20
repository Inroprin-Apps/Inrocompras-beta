import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    agentRules: false,
    experimental: {
        // El router guarda una página visitada este tiempo (s): volver a ella es instantáneo (valores de INROCONTA/GRAMA).
        staleTimes: { dynamic: 30, static: 300 },
    },
};

export default nextConfig;
