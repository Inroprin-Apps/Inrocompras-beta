// El PDF de la OC se genera con el formato de Compras (datos inventados). Con PDF_MUESTRA=<carpeta> deja los archivos
// para revisarlos a ojo.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { adelantosPdf, condicionPago, cuentaPara, fechaPdf, iniciales, notaPago, type OrdenPdf } from '@/modules/integraciones/domain/pdf.ts';

vi.mock('server-only', () => ({}));

const base: OrdenPdf = {
    id: 'o1',
    numero: '0050-2027',
    revision: 0,
    clase: 'Compra',
    procedencia: 'Nacional',
    fecha: '2027-01-13',
    moneda: 'PEN',
    tipoImpuesto: 'IGV 18%',
    subtotal: 5649,
    igv: 1016.82,
    monto: 6665.82,
    formaPago: 'Adelanto',
    pctAdelanto: 0.5,
    hitoSaldo: 'contra entrega',
    diasCredito: null,
    lugarEntrega: 'Av. Ejemplo 456, Lima',
    plazoEntregaDias: 15,
    terminos: null,
    incoterm: null,
    penalidadPctDia: null,
    penalidadTopePct: null,
    empresa: { id: 'INROPRIN', razonSocial: 'EMPRESA DE PRUEBA S.A.C.', ruc: '20100000009', direccion: 'Av. Ejemplo 123, Lima' },
    proveedor: {
        razonSocial: 'PROVEEDOR DE PRUEBA S.A.C.',
        ruc: '20999999990',
        pais: 'Perú',
        direccion: 'Jr. Inventado 789, Lima',
        atencion: 'Ana Pérez',
        telefono: '999 000 111',
        correo: 'ventas@proveedor-prueba.pe',
        cuenta: { banco: 'Banco de prueba', numero: '000-0000000-0-00', cci: '000-000-000000000000-00' },
        detraccion: '00-000-000000',
    },
    proyecto: { codigo: 'P-001', nombre: 'Proyecto de prueba' },
    pedido: { motivo: 'Equipamiento de talleres', requerimientos: ['RC-2027-0027'], solicitado: 'Persona Solicitante', supervisor: 'Gerencia' },
    firmas: { primera: 'PGO', segunda: 'PGA' },
    pie: {
        horario: 'Horario de atención: lunes a viernes de 08:30 a. m. a 4:00 p. m.',
        documentos: ['Orden de compra', 'Factura', 'Guía de remisión'],
        nota: 'Es imprescindible la entrega con los documentos solicitados; caso contrario, no será atendido.',
        legal: 'Esta transacción se rige por los términos y condiciones de la empresa.',
        enlace: 'https://www.ejemplo.pe/',
    },
    aprobaciones: { ppto: 'Aprobado', cgFecha: '2027-01-13', gop: 'Aprobado', gopFecha: '2027-01-14', gaf: null, gafFecha: null, tipo: 'Aprobación Única' },
    comprador: { id: 'u1', nombre: 'Persona Compradora' },
    lineas: [1, 2, 3].map((n) => ({
        nLinea: n,
        descripcion: `Set de 16 fundas protectoras para cocina - modelo ${n}`,
        descripcionProv: null,
        unidad: 'SET',
        cantidad: 16,
        precioUnit: 70.63,
        subtotal: 1130,
        esDemasia: false,
        demasiaEstado: null,
        concepto: 'Mercadería',
        codInt: 'ME003040',
        codProy: `MAT-165.${n}`,
    })),
};

describe('PDF de la OC (formato de Compras)', () => {
    it('cálculos del formato', () => {
        expect(iniciales('Rosa de la Gómez Ruiz')).toBe('RGR');
        expect(iniciales('')).toBeNull();
        expect(condicionPago(base, 'es')).toEqual({ forma: 'Adelanto', valor: '50', unidad: '%' });
        expect(condicionPago({ ...base, formaPago: 'Crédito', pctAdelanto: null, diasCredito: 30 }, 'es')).toEqual({
            forma: 'Crédito',
            valor: '30',
            unidad: 'Días',
        });
        expect(notaPago(base, 'es')).toBe('50 % adelanto, saldo contra entrega');
        expect(adelantosPdf(base, 'es').map((x) => [x.etiqueta, x.pct, x.monto])).toEqual([
            ['Adelanto 01', 0.5, 3332.91],
            ['Adelanto 02', 0, 0],
            ['Adelanto 03', 0, 0],
            ['Saldo', 0.5, 3332.91],
        ]);
        expect(
            cuentaPara(
                [
                    { banco: 'A', moneda: 'USD', numero: '1', cci: '' },
                    { banco: 'B', moneda: 'PEN', numero: '2', cci: '' },
                ],
                'PEN',
            )?.banco,
        ).toBe('B');
        expect(fechaPdf('2027-01-13')).toBe('13/01/2027');
    });

    it('se genera el PDF (interno y proveedor, nacional e importación)', async () => {
        const { ReactPdfAdapter } = await import('@/modules/integraciones/infrastructure/ReactPdfAdapter.tsx');
        const pdf = new ReactPdfAdapter();
        const casos: [string, OrdenPdf, 'interna' | 'proveedor'][] = [
            ['nacional-proveedor', base, 'proveedor'],
            ['nacional-interna', base, 'interna'],
            ['servicio-credito', { ...base, numero: '1477-2027', clase: 'Servicio', formaPago: 'Crédito', pctAdelanto: null, diasCredito: 7 }, 'proveedor'],
            [
                'importacion-proveedor',
                { ...base, numero: '172-2027', procedencia: 'Importación', tipoImpuesto: 'Sin IGV', moneda: 'USD', incoterm: 'FOB' },
                'proveedor',
            ],
        ];
        for (const [nombre, o, v] of casos) {
            const r = await pdf.generar(o, v);
            expect(r.isOk(), nombre).toBe(true);
            const bytes = r._unsafeUnwrap();
            expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
            if (process.env.PDF_MUESTRA) fs.writeFileSync(path.join(process.env.PDF_MUESTRA, `${nombre}.pdf`), bytes);
        }
    }, 30_000);
});
