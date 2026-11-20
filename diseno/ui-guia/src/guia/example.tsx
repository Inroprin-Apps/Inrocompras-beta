'use client';

// Un ejemplo vivo: arriba el componente de verdad (se puede pasar el mouse, pulsar y llegar con
// Tab), abajo el código para copiar. El código se escribe a mano junto al ejemplo: es lo que una
// app debe pegar, no un volcado del JSX de la guía.
import { useState, type ReactNode } from 'react';
import { Check, Code2, Copy } from 'lucide-react';
import { CARD } from '../ui/card.tsx';

export function Example({
    title,
    code,
    children,
    padded = true,
}: {
    title?: string;
    code?: string;
    children: ReactNode;
    padded?: boolean;
}) {
    const [show, setShow] = useState(false);
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code.trim());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* sin portapapeles (http, permisos): el código sigue a la vista para copiarlo a mano */
        }
    };
    return (
        <div className={`overflow-hidden ${CARD}`}>
            {title && <div className="border-b border-divider px-4 py-2.5 text-small font-medium text-ink-2">{title}</div>}
            <div className={`${padded ? 'p-3 sm:p-5' : ''}`}>{children}</div>
            {code && (
                <>
                    <div className="flex items-center justify-end gap-1 border-t border-divider bg-surface-2 px-2 py-1.5">
                        <button
                            type="button"
                            onClick={() => setShow(!show)}
                            aria-expanded={show}
                            className="inline-flex items-center gap-1.5 rounded-inner px-2.5 py-1 text-small font-medium text-ink-2 hover:bg-surface-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                        >
                            <Code2 size={14} /> {show ? 'Ocultar código' : 'Ver código'}
                        </button>
                        <button
                            type="button"
                            onClick={copy}
                            className="inline-flex items-center gap-1.5 rounded-inner px-2.5 py-1 text-small font-medium text-ink-2 hover:bg-surface-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                        >
                            {copied ? <Check size={14} className="text-success-strong" /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                    {show && (
                        <pre className="overflow-x-auto border-t border-divider bg-ink px-4 py-3.5 text-small leading-relaxed text-surface-3">
                            <code>{code.trim()}</code>
                        </pre>
                    )}
                </>
            )}
        </div>
    );
}
