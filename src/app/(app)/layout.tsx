import { LogOut } from 'lucide-react';
import { miPerfil } from '@/shared/auth/sesion.ts';
import { rolLabel } from '@/shared/tipos.ts';
import { menuPara } from './_lib/menu.ts';
import { Campana } from './_components/campana.tsx';
import { MenuLateral } from './_components/menu-lateral.tsx';
import { PerfilProvider } from './_components/perfil.tsx';

// Toda pantalla con sesión pasa por aquí. El marco (menú) es un layout persistente: se monta una vez y
// navegar solo cambia la página. Lo único que espera al servidor es el perfil (área y roles); los datos
// los lee cada pantalla en el navegador, una vez por pestaña (_lib/resource.ts). Por persona: nunca estático.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const perfil = await miPerfil();
    if (!perfil || !perfil.activo) {
        return (
            <main className="flex min-h-dvh items-center justify-center bg-surface-2 px-4">
                <div className="max-w-md rounded-card border border-line bg-surface p-8">
                    <h1 className="mb-2 text-subtitle font-semibold">{perfil ? 'Tu usuario está desactivado' : 'Tu usuario aún no está registrado'}</h1>
                    <p className="mb-5 text-body text-ink-2">Pide al administrador de INROCOMPRAS que {perfil ? 'lo reactive' : 'revise tu alta'}. Luego vuelve a entrar.</p>
                    <SalirBoton />
                </div>
            </main>
        );
    }
    const detalle = [perfil.area, ...perfil.roles.map(rolLabel)].join(' · ');
    return (
        <PerfilProvider perfil={perfil}>
            <div className="flex min-h-dvh flex-col bg-surface-2 md:flex-row">
                <MenuLateral grupos={menuPara(perfil)} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex items-center justify-end gap-2 px-4 pt-4 md:px-8">
                        <Campana />
                        <div className="min-w-0 text-right">
                            <div className="truncate text-ui font-medium">{perfil.nombre}</div>
                            <div className="truncate text-small text-ink-2" title={detalle}>
                                {detalle}
                            </div>
                        </div>
                        <SalirBoton icono />
                    </header>
                    <main className="min-w-0 flex-1 px-4 pt-2 pb-10 md:px-8">{children}</main>
                </div>
            </div>
        </PerfilProvider>
    );
}

function SalirBoton({ icono = false }: { icono?: boolean }) {
    return (
        <form action="/auth/salir" method="post">
            {icono ? (
                <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-control p-2 text-ink-2 hover:bg-surface-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
                    <LogOut size={18} />
                </button>
            ) : (
                <button type="submit" className="rounded-control border border-control bg-surface px-3.5 py-2 text-ui font-medium hover:bg-surface-2">
                    Cerrar sesión
                </button>
            )}
        </form>
    );
}
