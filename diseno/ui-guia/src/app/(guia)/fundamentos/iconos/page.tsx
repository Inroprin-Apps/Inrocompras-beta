import { AlertTriangle, ArrowRight, Calendar, Check, ChevronDown, Download, ExternalLink, FileText, Filter, Info, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { Code, DocTable, DoDont, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { buttonClass } from '../../../../ui/button.tsx';
import { CARD } from '../../../../ui/card.tsx';

export const metadata = { title: 'Iconos' };

const COMMON = [
    { icon: Search, name: 'Search', use: 'Buscar' },
    { icon: Filter, name: 'Filter', use: 'Filtros' },
    { icon: Calendar, name: 'Calendar', use: 'Período, fecha' },
    { icon: Download, name: 'Download', use: 'Exportar, descargar' },
    { icon: Upload, name: 'Upload', use: 'Subir archivo' },
    { icon: Plus, name: 'Plus', use: 'Nuevo' },
    { icon: Trash2, name: 'Trash2', use: 'Eliminar' },
    { icon: RefreshCw, name: 'RefreshCw', use: 'Actualizar' },
    { icon: ExternalLink, name: 'ExternalLink', use: 'Abre en otra pestaña (Drive, SUNAT)' },
    { icon: FileText, name: 'FileText', use: 'Documento, comprobante' },
    { icon: Check, name: 'Check', use: 'Hecho, correcto' },
    { icon: X, name: 'X', use: 'Cerrar, quitar' },
    { icon: AlertTriangle, name: 'AlertTriangle', use: 'Advertencia' },
    { icon: Info, name: 'Info', use: 'Información' },
    { icon: ChevronDown, name: 'ChevronDown', use: 'Desplegar' },
    { icon: ArrowRight, name: 'ArrowRight', use: 'Ir a, siguiente' },
];

export default function Iconos() {
    return (
        <Page href="/fundamentos/iconos">
            <PageHeader
                eyebrow="Fundamentos"
                title="Iconos"
                lead={
                    <>
                        Un solo juego: <Code>lucide-react</Code>, trazo de 2 px, y siempre del color del texto que acompaña (<Code>currentColor</Code>). El
                        icono ayuda a reconocer; el texto es el que explica.
                    </>
                }
            />

            <Section title="Tamaños">
                <DocTable
                    head={['size', 'Junto a', 'Ejemplo']}
                    rows={[
                        [<Code key="a">14</Code>, 'text-small: chip, acción de texto, botón pequeño', <Download key="i" size={14} />],
                        [<Code key="a">16</Code>, 'text-ui: botón, menú, aviso', <Download key="i" size={16} />],
                        [<Code key="a">18–20</Code>, 'Botón de solo icono, cabecera', <Download key="i" size={20} />],
                    ]}
                />
            </Section>

            <Section title="Los de todos los días" blurb="Para la misma acción, el mismo icono en todas las apps.">
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {COMMON.map(({ icon: Icon, name, use }) => (
                        <li key={name} className={`flex items-center gap-3 ${CARD} px-3 py-2.5`}>
                            <Icon size={18} className="flex-none text-ink-2" />
                            <span className="flex min-w-0 flex-col">
                                <code className="truncate text-small font-medium">{name}</code>
                                <span className="truncate text-caption text-ink-3">{use}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="En un botón">
                <Example
                    code={`import { Download, Trash2 } from 'lucide-react';

<button className={buttonClass('secondary')}><Download size={16} /> Exportar Excel</button>
<button className={buttonClass('ghost', 'md', 'px-2')} aria-label="Eliminar fila"><Trash2 size={16} /></button>`}
                >
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button type="button" className={buttonClass('secondary')}>
                            <Download size={16} /> Exportar Excel
                        </button>
                        <button type="button" className={buttonClass('ghost', 'md', 'px-2')} aria-label="Eliminar fila" title="Eliminar fila">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </Example>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['Un botón de solo icono lleva aria-label y title.', 'El lector de pantalla necesita el nombre, y el mouse lo muestra al pasar.'],
                        ['El icono no lleva color propio.', 'Toma el del texto; el color lo da el rol del contenedor (aviso, chip).'],
                        ['Solo icono únicamente para acciones muy conocidas (cerrar, eliminar en una fila, menú).', 'Todo lo demás lleva texto.'],
                    ]}
                />
                <DoDont
                    good={
                        <button type="button" className={buttonClass('secondary')}>
                            <Download size={16} /> Exportar
                        </button>
                    }
                    goodNote="Icono del color del texto, al tamaño del texto."
                    bad={
                        <button type="button" className={buttonClass('secondary')}>
                            <Download size={22} className="text-secondary" /> Exportar
                        </button>
                    }
                    badNote="Icono más grande que el texto y con color propio: compite con la palabra."
                />
            </Section>
        </Page>
    );
}
