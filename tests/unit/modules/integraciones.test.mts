import { describe, expect, it } from 'vitest';
import { anioDe, nombreCarpetaDes, nombreCarpetaOC, nombreSeguro, rutaCarpetaOC, serieOC, subcarpetaDe, escaparConsultaDrive } from '@/modules/integraciones/domain/carpetas.ts';
import { correoValido, escaparHtml, modoCorreo, notificacion, ocProveedor } from '@/modules/integraciones/domain/correo.ts';
import { leerEvento, solicitudInroPay } from '@/modules/integraciones/domain/inropay.ts';
import { aNumero, bastaElTexto, combinar, extraerDeTexto, fechaDelTexto, monedaDelTexto, numeroDelTexto, revisarGemini, LECTURA_VACIA } from '@/modules/integraciones/domain/lectura.ts';
import { formaPagoTexto, idiomaPdf, lineasPdf, nombrePdf, type OrdenPdf } from '@/modules/integraciones/domain/pdf.ts';
import { cierre, descartado, final, hecho, noConfigurado, reintentar } from '@/modules/integraciones/domain/trabajo.ts';
import { firmaValida, firmar } from '@/modules/integraciones/infrastructure/hmac.ts';
import { mensajeMime } from '@/modules/integraciones/infrastructure/mime.ts';
import { rucValido } from '@/modules/proveedores/domain/ruc.ts';

describe('carpetas del legajo (docs/07 §2)', () => {
    const oc = { numero: 'INROPRIN-NAC-2026-0025', empresaId: 'INROPRIN', clase: 'Compra', procedencia: 'Nacional', fecha: '2026-12-03', proveedor: 'Ferretería / Andina SAC' };
    it('Raíz / AAAA / EMPRESA-PROC / N° OC – Proveedor', () => {
        expect(rutaCarpetaOC(oc)).toEqual(['2026', 'INROPRIN-NAC', 'INROPRIN-NAC-2026-0025 – Ferretería Andina SAC']);
        expect(serieOC({ ...oc, procedencia: 'Importación' })).toBe('INROPRIN-IMP');
        expect(serieOC({ ...oc, clase: 'Servicio', procedencia: 'Importación' })).toBe('INROPRIN-SRV');
    });
    it('cada documento a su subcarpeta', () => {
        expect(subcarpetaDe('Cotización')).toBe('002 Cotizaciones');
        expect(subcarpetaDe('PDF OC proveedor')).toBe('003 Orden');
        expect(subcarpetaDe('Factura')).toBe('004 Documentos Contables');
        expect(subcarpetaDe('Voucher de pago')).toBe('005 Pagos');
        expect(subcarpetaDe('DAM')).toBe('006 Otros');
    });
    it('desaduanaje dentro de su OC y nombres seguros', () => {
        expect(nombreCarpetaDes('DES-2026-0001', 'II')).toBe('DES-2026-0001 (II)');
        expect(nombreCarpetaOC('N1', '')).toBe('N1');
        expect(nombreSeguro('a'.repeat(200)).length).toBe(120);
        expect(anioDe(null, new Date('2027-01-02'))).toBe('2027');
        expect(escaparConsultaDrive("O'Brien")).toBe("O\\'Brien");
    });
});

describe('lector: lo que se saca del texto', () => {
    const texto = `FACTURA ELECTRÓNICA F001-000123
      ACME SAC  RUC 20555666773
      Cliente: INROPRIN RUC 20100100101
      Fecha de emisión: 05/11/2026
      Moneda: SOLES
      OP. GRAVADAS S/ 1,000.00
      IGV S/ 180.00
      IMPORTE TOTAL S/ 1,180.00`;
    it('RUC válidos sin los propios, moneda, número, fecha y montos', () => {
        const l = extraerDeTexto(texto, rucValido, ['20100100101']);
        expect(l.ruc).toBe('20555666773');
        expect(l.rucs_encontrados).toEqual(['20555666773']);
        expect(l.tipo).toBe('Factura');
        expect(l.numero).toBe('F001-000123');
        expect(l.fecha).toBe('2026-11-05');
        expect(l.moneda).toBe('PEN');
        expect(l.subtotal).toBe(1000);
        expect(l.igv).toBe(180);
        expect(l.total).toBe(1180);
        expect(l.avisos).toEqual([]);
        expect(bastaElTexto(l, texto)).toBe(true);
    });
    it('sin los propios configurados avisa que hay dos RUC', () => {
        const l = extraerDeTexto(texto, rucValido);
        expect(l.rucs_encontrados.length).toBe(2);
        expect(l.avisos.join(' ')).toMatch(/más de un RUC/);
        expect(bastaElTexto(l, texto)).toBe(false);
    });
    it('descarta un RUC con el dígito verificador mal y avisa si no hay', () => {
        const l = extraerDeTexto('Cotización N° COT-77 RUC 20100100102 Total US$ 2.500,50 ' + 'x'.repeat(60), rucValido);
        expect(l.ruc).toBeNull();
        expect(l.avisos.join(' ')).toMatch(/No se encontró un RUC válido/);
        expect(l.moneda).toBe('USD');
        expect(l.total).toBe(2500.5);
        expect(l.numero).toBe('COT-77');
        expect(l.tipo).toBe('Cotización');
    });
    it('un PDF escaneado (sin texto) lo dice', () => expect(extraerDeTexto('', rucValido).avisos[0]).toMatch(/escaneado/));
    it('números y fechas', () => {
        expect(aNumero('1.234,56')).toBe(1234.56);
        expect(aNumero('1,234.56')).toBe(1234.56);
        expect(fechaDelTexto('vence 2026-12-31')).toBe('2026-12-31');
        expect(fechaDelTexto('32/13/2026')).toBeNull();
        expect(monedaDelTexto('Total € 10')).toBe('EUR');
        expect(numeroDelTexto('E001 - 45')).toBe('E001-45');
    });
    it('Gemini: avisa RUC malo; al combinar gana el RUC del texto', () => {
        const g = revisarGemini({ ...LECTURA_VACIA, ruc: '20100100102', total: 10, items: [{ descripcion: 'x', cantidad: 1, unidad: null, precio_unitario: 5, total: 5, marca: null, modelo: null }], subtotal: 10 }, rucValido);
        expect(g.avisos.join(' ')).toMatch(/no pasa la validación/);
        expect(g.avisos.join(' ')).toMatch(/no coincide con el subtotal/);
        const t = extraerDeTexto(texto, rucValido, ['20100100101']);
        const c = combinar(t, { ...g, ruc: '20100100101', moneda: null });
        expect(c.ruc).toBe('20555666773');
        expect(c.moneda).toBe('PEN');
        expect(c.avisos.join(' ')).toMatch(/se usa el del texto/);
    });
});

describe('trabajos: cómo terminan', () => {
    it('cada desenlace a los argumentos de cola_terminar', () => {
        expect(cierre({ ok: true, valor: hecho() })).toEqual({ ok: true, mensaje: null, final: null });
        expect(cierre({ ok: true, valor: descartado('SIDIGE') })).toEqual({ ok: true, mensaje: 'SIDIGE', final: 'Descartado' });
        expect(cierre({ ok: false, fallo: reintentar('red') })).toEqual({ ok: false, mensaje: 'red', final: null });
        expect(cierre({ ok: false, fallo: final('x') }).final).toBe('Error');
    });
    it('sin credenciales: un mensaje legible y sin reintentos', () => {
        const f = noConfigurado('Drive', ['GOOGLE_SERVICE_ACCOUNT_JSON', 'DRIVE_UNIDAD_ID']);
        expect(f.tipo).toBe('final');
        expect(f.mensaje).toBe('Drive no configurado: falta GOOGLE_SERVICE_ACCOUNT_JSON, DRIVE_UNIDAD_ID. Configúralo en Vercel y reintenta el trabajo.');
    });
});

describe('InroPay', () => {
    const id = '0b4f6f86-5c5e-4a39-9a54-0c2f8bcd1234';
    it('firma HMAC-SHA256 del cuerpo, en hex, comparada en tiempo constante', () => {
        const cuerpo = JSON.stringify({ pago_id: id, estado: 'Pagado' });
        const f = firmar('secreto', cuerpo);
        expect(f).toMatch(/^[0-9a-f]{64}$/);
        expect(firmaValida('secreto', cuerpo, f)).toBe(true);
        expect(firmaValida('secreto', cuerpo, 'sha256=' + f)).toBe(true);
        expect(firmaValida('secreto', cuerpo + ' ', f)).toBe(false);
        expect(firmaValida('otro', cuerpo, f)).toBe(false);
        expect(firmaValida(undefined, cuerpo, f)).toBe(false);
        expect(firmaValida('secreto', cuerpo, 'zz')).toBe(false);
    });
    it('valida el aviso', () => {
        expect(leerEvento('no')).toEqual({ motivo: 'El cuerpo no es JSON.' });
        expect(leerEvento(JSON.stringify({ pago_id: 'x', estado: 'Pagado' }))).toEqual({ motivo: 'pago_id no es un uuid.' });
        expect('motivo' in leerEvento(JSON.stringify({ pago_id: id, estado: 'Anulado' }))).toBe(true);
        expect(leerEvento(JSON.stringify({ pago_id: id, estado: 'Pagado', fecha: '2026-12-01', n_operacion: 123 }))).toEqual({
            evento: { pago_id: id, estado: 'Pagado', fecha: '2026-12-01', n_operacion: '123', ref: null },
        });
    });
    it('arma la solicitud del contrato', () => {
        const b = solicitudInroPay({ id, nCuota: 1, monto: 100, retencion: 3, neto: 97, fechaLimite: null, facturaId: null, orden: { numero: 'N1', moneda: 'PEN', proveedor: null } });
        expect(Object.keys(b)).toEqual(['origen', 'pago_id', 'orden', 'cuota', 'monto', 'retencion', 'neto', 'fecha_limite', 'factura_id']);
    });
});

describe('PDF y correo', () => {
    const o = { numero: 'INROPRIN-IMP-2026-0001', revision: 2, formaPago: 'Adelanto', pctAdelanto: 0.3, hitoSaldo: 'contra BL', diasCredito: null } as OrdenPdf;
    it('idioma, nombre y forma de pago', () => {
        expect(idiomaPdf('proveedor', 'Importación')).toBe('en');
        expect(idiomaPdf('interna', 'Importación')).toBe('es');
        expect(nombrePdf(o, 'interna')).toBe('INROPRIN-IMP-2026-0001-interna-rev2.pdf');
        expect(nombrePdf({ numero: null, revision: 0 }, 'proveedor')).toBe('borrador.pdf');
        expect(formaPagoTexto(o, 'es')).toBe('30 % adelanto, saldo contra BL');
        expect(formaPagoTexto({ ...o, formaPago: 'Crédito', diasCredito: 30 }, 'en')).toBe('Credit 30 days');
        expect(lineasPdf({ lineas: [{ nLinea: 2, esDemasia: false }, { nLinea: 1, esDemasia: true, demasiaEstado: 'Rechazada' }, { nLinea: 1, esDemasia: false }] } as OrdenPdf).map((l) => l.nLinea)).toEqual([1, 2]);
    });
    it('plantillas: la de importación en inglés, todo escapado', () => {
        expect(ocProveedor({ proveedor: 'A<b>', numero: 'N1', empresa: 'E', comprador: 'C', idioma: 'en' }).asunto).toBe('Purchase Order N1 – E');
        expect(ocProveedor({ proveedor: 'A<b>', numero: 'N1', empresa: 'E', comprador: 'C', idioma: 'es' }).html).toContain('A&lt;b&gt;');
        expect(notificacion({ nombre: 'Ana', titulo: 'T', enlace: 'https://x/proveedores?ver=1' }).html).toContain('Hola, Ana.');
        expect(escaparHtml('"&')).toBe('&quot;&amp;');
        expect(modoCorreo('smtp')).toBe('smtp');
        expect(modoCorreo('otro')).toBe('registro');
        expect(correoValido('ventas@ejemplo.pe')).toBe(true);
        expect(correoValido('a@b')).toBe(false);
    });
    it('el MIME lleva asunto UTF-8, copia, responder a y el adjunto', () => {
        const m = mensajeMime(
            { para: ['p@x.pe'], cc: ['c@x.pe'], responderA: 'c@x.pe', asunto: 'Orden ñ', html: '<p>hola</p>', adjuntos: [{ nombre: 'oc.pdf', mime: 'application/pdf', datos: new Uint8Array([1, 2, 3]) }] },
            'INROCOMPRAS <n@x.pe>',
            'LIM',
        );
        expect(m).toContain('Cc: c@x.pe');
        expect(m).toContain('Reply-To: c@x.pe');
        expect(m).toContain('Subject: =?UTF-8?B?' + Buffer.from('Orden ñ').toString('base64') + '?=');
        expect(m).toContain('AQID');
        expect(m.endsWith('--LIM--')).toBe(true);
        expect(mensajeMime({ para: ['a@x.pe\r\nBcc: z@x.pe'], asunto: 's', html: '' }, 'r', 'L')).not.toContain('\r\nBcc:');
    });
});
