import { DocTable, DoDont, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Button } from '../../../../ui/button.tsx';

export const metadata = { title: 'Accesibilidad y teclado' };

export default function Accesibilidad() {
    return (
        <Page href="/ux/accesibilidad">
            <PageHeader
                eyebrow="Experiencia"
                title="Accesibilidad y teclado"
                lead="En la oficina hay quien trabaja todo el día con el teclado, quien usa la pantalla con zoom y quien la mira con poca luz. Lo que es accesible es, casi siempre, más rápido para todos."
            />

            <Section title="Teclado">
                <Rules
                    items={[
                        ['Todo lo que se hace con el mouse se hace con Tab, Enter, Espacio y Esc.', 'Prueba cada pantalla nueva sin tocar el mouse.'],
                        ['El foco siempre se ve: anillo azul afuera con focus-visible.', 'Nunca outline-none sin poner otro foco en su lugar.'],
                        ['Enter envía el formulario; Esc cierra el diálogo o el menú abierto.', ''],
                        ['Al abrir un diálogo el foco entra en él; al cerrarlo vuelve a donde estaba.', ''],
                    ]}
                />
                <DoDont
                    good={<Button className="outline-2 outline-offset-2 outline-primary">Guardar</Button>}
                    goodNote="Con Tab, un anillo afuera: se ve dónde está el foco."
                    bad={<Button className="outline-none">Guardar</Button>}
                    badNote="outline-none sin reemplazo: con el teclado no se sabe dónde se está."
                />
            </Section>

            <Section title="Contraste" blurb="Los pares de tokens ya cumplen; romperlos es lo que baja el contraste.">
                <DocTable
                    head={['Par', 'Para', 'Contraste']}
                    rows={[
                        ['ink sobre surface', 'Texto principal', '16.9:1'],
                        ['ink-2 sobre surface · sobre surface-3', 'Texto secundario', '7.6:1 · 6.5:1'],
                        ['ink-3 sobre surface · sobre surface-3', 'Etiquetas y metadatos', '5.4:1 · 4.7:1 (pasa AA en los dos)'],
                        ['on-fill sobre primary', 'Botón principal', '5.5:1'],
                        ['danger-strong sobre danger-soft', 'Chip y aviso de error', '≥5:1 (calculado)'],
                        ['control sobre surface', 'Borde de input, select y botón secundario', '3.2:1 (mínimo 3:1, WCAG 1.4.11)'],
                        ['warning-strong sobre warning-soft', 'Chip y aviso de advertencia', '≥5:1 (el amarillo sólido da 1.3:1: nunca lleva texto)'],
                    ]}
                />
            </Section>

            <Section title="Lectores de pantalla">
                <Rules
                    items={[
                        ['Cada campo tiene etiqueta (Field ya la conecta); cada botón de solo icono, aria-label.', ''],
                        ['El estado nunca se dice solo con color.', 'El chip lleva texto («Sin OC»), el KPI con riesgo lleva aria-label en su punto.'],
                        ['Un título h1 por pantalla, y los niveles en orden.', 'Es el índice con que se navega una página.'],
                        ['Las imágenes decorativas llevan alt="".', ''],
                    ]}
                />
            </Section>

            <Section title="Tamaño y zoom">
                <Rules
                    items={[
                        [
                            'Las pantallas funcionan al 200 % de zoom y a 360 px de ancho.',
                            'Sin desplazamiento horizontal de la página; las tablas se desplazan dentro de su tarjeta.',
                        ],
                        ['Lo que se toca en móvil mide al menos 36 px de alto.', 'Los botones md ya miden eso.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
