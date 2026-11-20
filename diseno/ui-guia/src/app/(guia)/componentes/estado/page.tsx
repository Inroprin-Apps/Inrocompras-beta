'use client';

import { Code, DocTable, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { Empty, Notice } from '../../../../ui/bits.tsx';
import { Button } from '../../../../ui/button.tsx';
import { Chip } from '../../../../ui/card.tsx';
import { toast } from '../../../../ui/toaster.tsx';

export default function Estado() {
    return (
        <Page href="/componentes/estado">
            <PageHeader
                eyebrow="Componentes"
                title="Chips, avisos y toasts"
                lead="Tres formas de decir cómo está algo, de la más pequeña a la que más interrumpe: el chip marca un estado en una fila, el aviso habla de toda la pantalla y el toast confirma lo que se acaba de hacer."
            />

            <Section title="Chips" blurb="La pareja suave + fuerte de cada rol. Para el estado de una fila o una etiqueta corta.">
                <Example
                    code={`<Chip tone="ok">Pagado</Chip>
<Chip tone="warn">Por revisar</Chip>
<Chip tone="danger">Sin OC</Chip>
<Chip tone="info">Nuevo</Chip>
<Chip tone="muted">Anulado</Chip>`}
                >
                    <div className="flex flex-wrap gap-2">
                        <Chip tone="ok">Pagado</Chip>
                        <Chip tone="warn">Por revisar</Chip>
                        <Chip tone="danger">Sin OC</Chip>
                        <Chip tone="info">Nuevo</Chip>
                        <Chip tone="muted">Anulado</Chip>
                    </div>
                </Example>
            </Section>

            <Section title="Avisos" blurb="Arriba de lo que afectan. Dicen qué pasa y, si hay algo que hacer, qué.">
                <Example
                    code={`<Notice tone="danger">3 facturas de proveedores en la lista SSCO. Revísalas antes de pagar.</Notice>
<Notice tone="warning">El robot no corrió hoy: los datos son de ayer a las 07:00.</Notice>
<Notice tone="info">Los datos se actualizan cada día a las 07:00.</Notice>`}
                >
                    <Notice tone="danger">
                        <b>3 facturas</b> de proveedores en la lista SSCO. Revísalas antes de pagar.
                    </Notice>
                    <Notice tone="warning">El robot no corrió hoy: los datos son de ayer a las 07:00.</Notice>
                    <Notice tone="info">Los datos se actualizan cada día a las 07:00.</Notice>
                </Example>
            </Section>

            <Section title="Toasts" blurb="La confirmación de lo que se acaba de hacer: abajo a la derecha, 4 segundos. El color va solo en el icono. Cada botón lanza uno de verdad.">
                <Example
                    code={`import { toast } from '@/shared/ui/toaster.tsx';

toast.success('Orden OC-2026-0142 guardada.');
toast.success('nombre@inroprin.com ya no puede entrar.', {
    action: { label: 'Deshacer', onClick: restore },
});
toast.error('No se pudo guardar: SUNAT no respondió. Vuelve a intentar en un minuto.');
toast.info('Los datos se actualizaron a las 07:00.');`}
                >
                    <div className="flex flex-wrap gap-2.5">
                        <Button onClick={() => toast.success('Orden OC-2026-0142 guardada.')}>Éxito</Button>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                toast.success('nombre@inroprin.com ya no puede entrar.', {
                                    action: { label: 'Deshacer', onClick: () => toast.success('nombre@inroprin.com puede entrar otra vez.') },
                                })
                            }
                        >
                            Con «Deshacer»
                        </Button>
                        <Button variant="danger" onClick={() => toast.error('No se pudo guardar: SUNAT no respondió. Vuelve a intentar en un minuto.')}>
                            Error
                        </Button>
                        <Button variant="secondary" onClick={() => toast.info('Los datos se actualizaron a las 07:00.')}>
                            Información
                        </Button>
                        <Button variant="ghost" onClick={() => toast.success('Guardado.', { description: 'El cambio ya se ve en todas las pantallas.' })}>
                            Con descripción
                        </Button>
                    </div>
                </Example>
            </Section>

            <Section title="Vacío" blurb="Cuando un filtro no deja nada. Más en «Vacío, carga y error».">
                <Example code={`<Empty>No hay comprobantes en noviembre 2026.</Empty>`}>
                    <Empty>No hay comprobantes en noviembre 2026.</Empty>
                </Example>
            </Section>

            <Section title="Cuál usar">
                <DocTable
                    head={['Pieza', 'Para', 'Se va sola']}
                    rows={[
                        [<Code key="a">Chip</Code>, 'El estado de una fila o un dato', 'No'],
                        [<Code key="a">Notice</Code>, 'Algo que afecta a toda la pantalla y sigue siendo cierto', 'No: se va cuando deja de ser cierto'],
                        [<Code key="a">toast</Code>, 'Confirmar lo que el usuario acaba de hacer', 'Sí, a los 4 s'],
                    ]}
                />
                <Rules
                    items={[
                        ['El toast nombra lo que pasó: «Orden OC-2026-0142 guardada», no «Guardado con éxito».', 'Con el nombre, el usuario sabe que fue lo que quería.'],
                        ['Lo que se borra lleva «Deshacer» en el toast en lugar de un «¿Estás seguro?».', 'Preguntar antes se responde sin leer; deshacer después arregla el error de verdad.'],
                        ['Un error nunca va solo en un toast si el usuario tiene que corregir algo.', 'El toast se va; el error se queda junto al campo o en un aviso.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
