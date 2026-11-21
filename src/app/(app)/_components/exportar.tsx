'use client';

// El botón «Exportar Excel» de una lista: va a la derecha de la barra de filtros (guía, «Listado») y descarga lo que se
// ve con los filtros puestos. Quien no ve precios no recibe columnas de montos: cada pantalla arma sus columnas con
// `perfil.ve_precios`.
import { useState } from 'react';
import { Download } from 'lucide-react';
import { exportarExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import { Button } from '@/shared/ui/button.tsx';
import { toast } from '@/shared/ui/toaster.tsx';

export function BotonExportar<T>({ nombre, columnas, filas }: { nombre: string; columnas: readonly ColumnaExcel<T>[]; filas: readonly T[] }) {
    const [bajando, setBajando] = useState(false);
    async function exportar() {
        setBajando(true);
        const r = await exportarExcel(nombre, columnas, filas);
        setBajando(false);
        if (r.isErr()) return toast.error(r.error.message);
        toast.success(`Excel de ${nombre.toLowerCase()} descargado: ${filas.length} ${filas.length === 1 ? 'fila' : 'filas'}.`);
    }
    return (
        <Button
            variant="secondary"
            onClick={() => void exportar()}
            disabled={bajando || filas.length === 0}
            title={filas.length ? undefined : 'No hay filas para exportar'}
        >
            <Download size={15} aria-hidden /> {bajando ? 'Exportando…' : 'Exportar Excel'}
        </Button>
    );
}
