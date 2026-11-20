'use client';

// Una muestra de color que lee su variable de la página: el valor que se ve ES el token de
// globals.css, no una copia que pueda quedar vieja.
import { useEffect, useState } from 'react';
import { CARD } from '../ui/card.tsx';

export interface SwatchInfo {
    token: string;
    role: string;
    where?: string;
}

export function Swatch({ token, role, where }: SwatchInfo) {
    const [value, setValue] = useState('');
    useEffect(() => setValue(getComputedStyle(document.documentElement).getPropertyValue(token).trim()), [token]);
    return (
        <li className={`flex flex-col overflow-hidden ${CARD}`}>
            <div className="h-14 w-full border-b border-divider" style={{ background: `var(${token})` }} />
            <div className="flex flex-col gap-0.5 p-3">
                <code className="text-small font-medium select-all">{token.replace('--color-', '')}</code>
                <code className="text-caption text-ink-3 select-all">{value || '…'}</code>
                <p className="mt-1 text-small text-ink-2">{role}</p>
                {where && <code className="text-caption text-ink-3">{where}</code>}
            </div>
        </li>
    );
}

export function SwatchGrid({ items }: { items: SwatchInfo[] }) {
    return (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((s) => (
                <Swatch key={s.token} {...s} />
            ))}
        </ul>
    );
}
