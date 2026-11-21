'use client';

// Configuración (administrador): los parámetros de la tabla config con su descripción y el tipo correcto, las monedas
// (tasas: también Finanzas), el tipo de cambio de costeo, los conceptos, los conceptos de gasto de importación y el
// estado de la cola de trabajos (pendientes y errores con su mensaje; reintentar o descartar). Pestañas en el #fragmento.
import { Notice, SectionTitle } from '@/shared/ui/bits.tsx';
import { Tabs, type TabDef } from '@/shared/ui/tabs.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { agregaTc, editaGastos, editaParametros, editaTasas, veCola } from './permisos.ts';
import { SeccionCola } from './seccion-cola.tsx';
import { SeccionConceptos, SeccionGastos } from './seccion-conceptos.tsx';
import { SeccionMonedas } from './seccion-monedas.tsx';
import { SeccionParametros } from './seccion-parametros.tsx';

export function ConfiguracionView() {
    const perfil = usePerfil();
    const tabs: (TabDef & { panel: React.ReactNode })[] = [];
    if (editaParametros(perfil)) tabs.push({ key: 'parametros', label: 'Parámetros', panel: <SeccionParametros /> });
    if (editaTasas(perfil) || agregaTc(perfil))
        tabs.push({ key: 'monedas', label: 'Monedas y TC', panel: <SeccionMonedas tasas={editaTasas(perfil)} tc={agregaTc(perfil)} /> });
    if (editaParametros(perfil)) tabs.push({ key: 'conceptos', label: 'Conceptos', panel: <SeccionConceptos /> });
    if (editaGastos(perfil)) tabs.push({ key: 'gastos', label: 'Gastos de importación', panel: <SeccionGastos /> });
    if (veCola(perfil)) tabs.push({ key: 'cola', label: 'Cola de trabajos', panel: <SeccionCola /> });

    return (
        <>
            <SectionTitle title="Configuración" />
            {tabs.length === 0 ? (
                <Notice tone="info" cerrable={false}>
                    La configuración la cambia el administrador (las tasas de cambio, también Finanzas). Si necesitas un cambio, pídeselo.
                </Notice>
            ) : (
                <Tabs
                    tabs={tabs.map(({ key, label }) => ({ key, label }))}
                    panels={Object.fromEntries(
                        tabs.map((t) => [
                            t.key,
                            <div key={t.key} className="pt-4">
                                {t.panel}
                            </div>,
                        ]),
                    )}
                />
            )}
        </>
    );
}
