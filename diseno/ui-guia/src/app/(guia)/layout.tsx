import { Sidebar } from '../../guia/sidebar.tsx';

// Las páginas de la guía: menú lateral y columna de lectura. /dev queda fuera, a pantalla completa.
export default function GuideLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col lg:flex-row">
            <Sidebar />
            <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
                <div className="mx-auto max-w-4xl">{children}</div>
            </main>
        </div>
    );
}
