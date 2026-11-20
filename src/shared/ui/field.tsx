// Campos de formulario: la etiqueta arriba, el control, y debajo O la ayuda O el error (nunca los
// dos: el error ocupa el sitio de la ayuda, así nada salta). El control es el mismo CONTROL de
// los filtros, y en error cambia solo el borde y el texto de abajo, no el fondo.
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { CONTROL } from './bits.tsx';

const INVALID = 'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger';

export function Field({
    label,
    hint,
    error,
    optional = false,
    children,
}: {
    label: string;
    hint?: ReactNode;
    error?: ReactNode;
    /** Se marca lo opcional, no lo obligatorio: en un formulario de empresa casi todo es obligatorio. */
    optional?: boolean;
    children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
    const id = useId();
    const below = error || hint ? `${id}-below` : undefined;
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={id} className="text-ui font-medium">
                {label}
                {optional && <span className="ml-1.5 font-normal text-ink-3">(opcional)</span>}
            </label>
            {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': below })}
            {error ? (
                <p id={below} className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            ) : (
                hint && (
                    <p id={below} className="text-small text-ink-3">
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={`${CONTROL} ${INVALID} w-full ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={`${CONTROL} ${INVALID} min-h-24 w-full resize-y ${className}`} {...rest} />;
}

/** Casilla con su texto al lado: todo el texto es clicable. */
export function Checkbox({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
    return (
        <label className="flex items-start gap-2.5 text-ui">
            <input type="checkbox" className="mt-0.5 size-4 flex-none accent-primary disabled:accent-disabled-ink" {...rest} />
            <span className="flex flex-col gap-0.5">
                <span>{label}</span>
                {hint && <span className="text-small text-ink-3">{hint}</span>}
            </span>
        </label>
    );
}
