import { Code, DocTable, Page, PageHeader, Rules, Section } from '../../../guia/doc.tsx';
import { CARD } from '../../../ui/card.tsx';

export const metadata = { title: 'Cómo usarla en una app' };

const pre = 'overflow-x-auto rounded-card bg-ink px-4 py-3.5 text-small leading-relaxed text-surface-3';

export default function Uso() {
    return (
        <Page href="/uso">
            <PageHeader
                eyebrow="Empezar"
                title="Cómo usarla en una app"
                lead="Por ahora se copia: los tokens y la carpeta de componentes. Cuando haya dos o tres apps usándola, se convierte en un paquete compartido y la copia se reemplaza por una dependencia."
            />

            <Section title="App nueva" blurb="Next.js 16 con TypeScript, Tailwind 4 y pnpm, igual que INROCONTA.">
                <pre className={pre}>
                    <code>{`pnpm create next-app@latest mi-app --ts --tailwind --app --src-dir --use-pnpm
cd mi-app
pnpm add lucide-react sonner`}</code>
                </pre>
            </Section>

            <Section title="Qué se copia">
                <DocTable
                    head={['De la guía', 'A la app', 'Qué es']}
                    rows={[
                        [
                            <Code key="a">src/app/globals.css</Code>,
                            <Code key="b">src/app/globals.css</Code>,
                            'Todos los tokens: color, escala tipográfica, radios, sombras, y la base (cursor, fuente).',
                        ],
                        [
                            <Code key="a">src/ui/</Code>,
                            <Code key="b">src/shared/ui/</Code>,
                            'Los componentes: button, card, bits, field, hueco, pager, period-picker, toaster, format.',
                        ],
                        [<Code key="a">public/IconRoland.png</Code>, <Code key="b">public/</Code>, 'El icono de la pestaña.'],
                    ]}
                />
            </Section>

            <Section title="El layout raíz" blurb="La fuente Montserrat y el Toaster montado una sola vez.">
                <pre className={pre}>
                    <code>{`// src/app/layout.tsx
import { Montserrat } from 'next/font/google';
import { Toaster } from '../../shared/ui/toaster.tsx';
import './globals.css';

const montserrat = Montserrat({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-montserrat' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={montserrat.variable}>
            <body>
                {children}
                <Toaster />
            </body>
        </html>
    );
}`}</code>
                </pre>
            </Section>

            <Section title="Al cambiar algo">
                <Rules
                    items={[
                        [
                            'Primero en la guía, luego en las apps.',
                            'La guía es la fuente: si un componente cambia en una app y no aquí, la próxima app copia el viejo.',
                        ],
                        ['Un token nuevo va con su rol y su ejemplo.', 'Si no se puede decir para qué sirve en una frase, probablemente sobra.'],
                        ['Nada de valores sueltos en las apps.', 'Un text-[13px] o un #006db1 en una app es una señal de que falta algo en la guía.'],
                    ]}
                />
                <div className={`${CARD} p-4 text-ui text-ink-2`}>
                    Los imports llevan extensión (<Code>./bits.tsx</Code>) como en INROCONTA: el <Code>tsconfig</Code> necesita{' '}
                    <Code>allowImportingTsExtensions: true</Code>.
                </div>
            </Section>
        </Page>
    );
}
