import { Page, PageHeader, Rules, Section } from '../../../guia/doc.tsx';

export const metadata = { title: 'Principios' };

export default function Principios() {
    return (
        <Page href="/principios">
            <PageHeader
                eyebrow="Empezar"
                title="Principios"
                lead="Las apps de INROPRIN son herramientas de trabajo diario: contabilidad, compras, producción. Quien las usa las abre muchas veces al día y quiere terminar rápido. Todo lo demás sale de ahí."
            />

            <Section title="Los cinco">
                <Rules
                    items={[
                        [
                            'El dato primero',
                            'Las cifras, los nombres y los estados son lo que se mira. El adorno (sombras, degradados, colores de marca de relleno) se quita hasta que el dato se lea solo.',
                        ],
                        [
                            'Un rol, un color',
                            'El rojo dice «hay un problema», el azul «haz esto» o «esto está elegido», el turquesa «está bien» o «la otra serie». Si un color no dice nada, va en gris.',
                        ],
                        [
                            'Lo mismo se ve y se comporta igual',
                            'Un filtro de período, un botón de exportar o una tabla funcionan igual en todas las pantallas y todas las apps. Se aprende una vez.',
                        ],
                        [
                            'Nada se mueve cuando llegan los datos',
                            'La pantalla de carga ES la pantalla final con huecos en lugar de valores. Nada salta, nada parpadea.',
                        ],
                        [
                            'Decir qué pasó y qué hacer',
                            'Cada acción confirma lo que hizo (con nombres concretos), y cada error dice qué hacer a continuación. Nunca «Error» a secas.',
                        ],
                    ]}
                />
            </Section>

            <Section title="Reglas de pintura" blurb="Las que más se rompen sin darse cuenta.">
                <Rules
                    items={[
                        ['Se pinta con un rol: bg-primary, text-ink-2, border-line.', 'Nunca un hex, un valor de marca (bg-brand-red) ni la paleta de Tailwind (gray-500, text-white).'],
                        ['Se escribe con un paso de la escala: text-ui, text-small.', 'Nunca text-[13px]. Si ningún paso sirve, se discute la escala, no se inventa un tamaño.'],
                        ['Deshabilitado es gris, nunca opacidad.', 'Una opacidad sobre azul da un azul lavado que se lee como otro estado, y sigue pareciendo clicable.'],
                        ['Una acción principal (botón azul) por pantalla.', 'Si hay dos azules, ninguno es el principal.'],
                        ['El foco de teclado siempre se ve.', 'Anillo azul afuera con focus-visible: aparece con Tab, no con el clic del mouse.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
