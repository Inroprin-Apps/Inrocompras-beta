'use client';

// «ARRASTRA AQUÍ O HAZ CLIC PARA ELEGIR»: LA forma de pedir un archivo. Viene de GRAMA (shared/ui/drop-zone).
// Una caja punteada que recibe un archivo soltado encima, o abre el selector al hacer clic, o con
// Enter/Espacio desde el teclado.
//
// Aquí vive solo el GESTO. Qué se hace con el archivo (validarlo, subirlo, el progreso) es de quien la usa
// (`onFiles`), y mientras eso corre se muestra en `busy`, que ocupa el lugar de la etiqueta y evita que
// la caja reciba otro archivo.
//
// Un arrastre NO se detecta solo con `onDragOver`: el navegador manda `dragleave` cada vez que el puntero
// cruza a un hijo, así que un contador de entradas y salidas es lo único que evita el parpadeo.
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Upload } from 'lucide-react';

export function DropZone({
    onFiles,
    onLink,
    accept,
    multiple = false,
    label = 'Arrastra un archivo aquí o haz clic para elegirlo',
    hint,
    busy = null,
    disabled = false,
    compact = false,
}: {
    onFiles: (files: File[]) => void;
    /** Una imagen arrastrada desde otra pestaña llega como su DIRECCIÓN, no como archivo. */
    onLink?: (address: string) => void;
    accept?: string;
    multiple?: boolean;
    label?: string;
    hint?: string;
    /** Lo que muestra la caja mientras se atiende su archivo (una barra de progreso, «Subiendo…»). */
    busy?: ReactNode;
    disabled?: boolean;
    /** Una línea, para vivir bajo un campo sin comerse el formulario. */
    compact?: boolean;
}) {
    const [dragging, setDragging] = useState(false);
    const depth = useRef(0);
    const input = useRef<HTMLInputElement>(null);
    const blocked = disabled || busy !== null;

    const choose = () => {
        if (!blocked) input.current?.click();
    };

    function onDrop(event: DragEvent<HTMLDivElement>): void {
        event.preventDefault();
        event.stopPropagation();
        depth.current = 0;
        setDragging(false);
        if (blocked) return;
        const files = [...event.dataTransfer.files];
        if (files.length > 0) {
            onFiles(multiple ? files : files.slice(0, 1));
            return;
        }
        const address = event.dataTransfer
            .getData('text/uri-list')
            .split('\n')
            .find((line) => line.startsWith('http'));
        if (address !== undefined) onLink?.(address.trim());
    }

    // Azul solo mientras un archivo está encima (el «suelta aquí» que se lee sin pensar); fuera de ese
    // momento no compite con la acción principal de la pantalla. Deshabilitado = gris, nunca opacidad.
    const look = disabled
        ? 'cursor-not-allowed border-disabled bg-disabled text-disabled-ink'
        : blocked
          ? 'cursor-default border-control bg-surface text-ink-2'
          : dragging
            ? 'cursor-pointer border-primary bg-primary-soft text-ink'
            : 'cursor-pointer border-control bg-surface text-ink hover:border-primary';

    return (
        <>
            <div
                onDragEnter={(event) => {
                    event.preventDefault();
                    depth.current += 1;
                    if (!blocked) setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => {
                    depth.current -= 1;
                    if (depth.current <= 0) setDragging(false);
                }}
                onDrop={onDrop}
                onClick={choose}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={blocked}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        choose();
                    }
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-control border border-dashed text-center outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${compact ? 'px-3 py-2.5' : 'px-4 py-6'} ${look}`}
            >
                {busy ?? (
                    <>
                        <Upload className={disabled ? '' : 'text-ink-2'} size={compact ? 16 : 24} aria-hidden="true" />
                        <span className={`font-medium ${compact ? 'text-small' : 'text-ui'}`}>{label}</span>
                        {hint !== undefined && !compact && <span className="text-small text-ink-2">{hint}</span>}
                    </>
                )}
            </div>
            <input
                ref={input}
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    // Se vacía para que volver a elegir el MISMO archivo dispare otra vez: sin esto, reintentar tras un error no hace nada.
                    event.target.value = '';
                    if (files.length > 0) onFiles(files);
                }}
            />
        </>
    );
}
