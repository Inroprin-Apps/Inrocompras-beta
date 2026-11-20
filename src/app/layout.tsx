import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import { Toaster } from '../ui/toaster.tsx';
import './globals.css';

// La fuente de la empresa: Montserrat, en los pesos de la escala (400, 500 y 600).
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-montserrat' });

export const metadata: Metadata = {
    title: { default: 'INROCOMPRAS', template: '%s · INROCOMPRAS' },
    description: 'Compras e Importaciones de INROPRIN.',
    icons: { icon: '/IconRoland.png' },
    robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={montserrat.variable}>
            <body>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
