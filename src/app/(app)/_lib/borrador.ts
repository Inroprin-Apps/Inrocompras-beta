'use client';

// El borrador de un formulario guardado en este navegador mientras se escribe (docs/06 §9: si se cae
// internet o se cierra la pestaña, no se pierde). Es comodidad por persona: localStorage, siempre con
// try/catch (puede no haber almacenamiento). `olvidar()` al guardar con éxito.
import { useEffect, useState } from 'react';

const PREFIJO = 'inrocompras.borrador.';

export function useBorrador<T>(clave: string, inicial: T): [T, (v: T) => void, () => void] {
    const [valor, setValor] = useState<T>(() => {
        try {
            const x = localStorage.getItem(PREFIJO + clave);
            return x ? ({ ...inicial, ...(JSON.parse(x) as T) } as T) : inicial;
        } catch {
            return inicial;
        }
    });
    useEffect(() => {
        const id = setTimeout(() => {
            try {
                localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
            } catch {
                /* sin almacenamiento: no se recuerda */
            }
        }, 300);
        return () => clearTimeout(id);
    }, [clave, valor]);
    const olvidar = () => {
        try {
            localStorage.removeItem(PREFIJO + clave);
        } catch {
            /* nada */
        }
    };
    return [valor, setValor, olvidar];
}
