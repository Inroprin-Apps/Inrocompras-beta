import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { Toaster } from '../ui/toaster.tsx';
import './globals.css';

// La fuente de la empresa: Montserrat, en los pesos que usa la escala (400, 500 y 600).
const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-montserrat' });

export const metadata: Metadata = {
    title: { default: 'Guía UI/UX · INROPRIN', template: '%s · Guía UI/UX INROPRIN' },
    description: 'Colores, tipografía, componentes, patrones y reglas de las apps de INROPRIN, con ejemplos vivos.',
    icons: { icon: '/IconRoland.png' },
    robots: { index: false, follow: false },
};

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
