// PDF de la orden: versión interna (español, con aprobaciones) y versión proveedor (español o inglés en importación).
// Los dos salen de los MISMOS datos de la base: no se puede repetir el error de un PDF con otro proyecto (decisión 18/11).
// Dependencias: npm i @react-pdf/renderer
import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { SupabaseClient } from '@supabase/supabase-js';

const s = StyleSheet.create({
    pag: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1d1d1f' },
    fila: { flexDirection: 'row' },
    h1: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    gris: { color: '#6b6b70' },
    caja: { borderWidth: 0.5, borderColor: '#c9c9cf', borderRadius: 4, padding: 8, marginTop: 10 },
    th: { fontFamily: 'Helvetica-Bold', backgroundColor: '#f1f1f4', paddingVertical: 4, paddingHorizontal: 3 },
    td: { paddingVertical: 3, paddingHorizontal: 3, borderBottomWidth: 0.5, borderColor: '#e3e3e8' },
    der: { textAlign: 'right' },
});

const T = {
    es: {
        titulo: 'ORDEN DE COMPRA',
        srv: 'ORDEN DE SERVICIO',
        prov: 'Proveedor',
        fecha: 'Fecha',
        moneda: 'Moneda',
        pago: 'Forma de pago',
        entrega: 'Lugar de entrega',
        plazo: 'Plazo de entrega',
        dias: 'días',
        item: 'N°',
        desc: 'Descripción',
        und: 'Und.',
        cant: 'Cant.',
        pu: 'P. unit.',
        total: 'Total',
        sub: 'Subtotal',
        igv: 'IGV 18 %',
        tot: 'Total',
        terminos: 'Términos y condiciones',
        penal: (p: number, t: number) => `Penalidad por demora: ${p} % por día, hasta ${t} % del monto.`,
        aprob: 'Aprobaciones',
        rev: 'Revisión',
    },
    en: {
        titulo: 'PURCHASE ORDER',
        srv: 'SERVICE ORDER',
        prov: 'Supplier',
        fecha: 'Date',
        moneda: 'Currency',
        pago: 'Payment terms',
        entrega: 'Delivery place',
        plazo: 'Lead time',
        dias: 'days',
        item: '#',
        desc: 'Description',
        und: 'Unit',
        cant: 'Qty',
        pu: 'Unit price',
        total: 'Amount',
        sub: 'Subtotal',
        igv: 'VAT',
        tot: 'Total',
        terminos: 'Terms and conditions',
        penal: (p: number, t: number) => `Late delivery penalty: ${p}% per day, up to ${t}% of the order amount.`,
        aprob: 'Approvals',
        rev: 'Revision',
    },
};

const num = (n: number | null | undefined, d = 2) => (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d });

export async function generarPdfOC(db: SupabaseClient, ordenId: string, version: 'interna' | 'proveedor') {
    const { data: o, error } = await db
        .from('ordenes')
        .select('*, empresas(*), proveedores(*), proyectos(nombre, codigo), oc_lineas(*), comprador:usuarios!ordenes_comprador_id_fkey(nombre, email)')
        .eq('id', ordenId)
        .single();
    if (error || !o) throw new Error('No se pudo leer la orden: ' + error?.message);
    const idioma: 'es' | 'en' = version === 'proveedor' && o.procedencia === 'Importación' ? 'en' : 'es';
    const t = T[idioma];
    const lineas = (
        o.oc_lineas as {
            n_linea: number;
            descripcion: string;
            descripcion_prov: string | null;
            unidad: string;
            cantidad: number;
            precio_unit: number;
            subtotal: number;
            es_demasia: boolean;
            demasia_estado: string | null;
        }[]
    )
        .filter((l) => !(l.es_demasia && l.demasia_estado === 'Rechazada'))
        .sort((a, b) => a.n_linea - b.n_linea);
    const pago =
        o.forma_pago === 'Adelanto'
            ? `${Math.round(o.pct_adelanto * 100)} % adelanto, saldo ${o.hito_saldo ?? ''}`
            : ['Crédito', 'Letra'].includes(o.forma_pago)
              ? `${o.forma_pago} ${o.dias_credito} ${t.dias}`
              : o.forma_pago;

    const doc = (
        <Document title={o.numero ?? 'Borrador'}>
            <Page size="A4" style={s.pag}>
                <View style={[s.fila, { justifyContent: 'space-between' }]}>
                    <View>
                        <Text style={s.h1}>{o.clase === 'Servicio' ? t.srv : t.titulo}</Text>
                        <Text>
                            {o.numero ?? 'BORRADOR'}
                            {o.revision ? ` · ${t.rev} ${o.revision}` : ''}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{o.empresas?.razon_social}</Text>
                        <Text style={s.gris}>RUC {o.empresas?.ruc ?? ''}</Text>
                    </View>
                </View>
                <View style={[s.caja, s.fila]}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.gris}>{t.prov}</Text>
                        <Text>{o.proveedores?.razon_social}</Text>
                        <Text>{o.proveedores?.ruc ? 'RUC ' + o.proveedores.ruc : o.proveedores?.pais}</Text>
                        {o.incoterm ? <Text>Incoterm: {o.incoterm}</Text> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text>
                            {t.fecha}: {o.fecha}
                        </Text>
                        <Text>
                            {t.moneda}: {o.moneda}
                        </Text>
                        <Text>
                            {t.pago}: {pago}
                        </Text>
                        <Text>
                            {t.entrega}: {o.lugar_entrega ?? '—'}
                        </Text>
                        {o.plazo_entrega_dias ? (
                            <Text>
                                {t.plazo}: {o.plazo_entrega_dias} {t.dias}
                            </Text>
                        ) : null}
                        {version === 'interna' && o.proyectos ? (
                            <Text>
                                Proyecto: {o.proyectos.codigo} {o.proyectos.nombre}
                            </Text>
                        ) : null}
                    </View>
                </View>
                <View style={{ marginTop: 10 }}>
                    <View style={s.fila}>
                        <Text style={[s.th, { width: 24 }]}>{t.item}</Text>
                        <Text style={[s.th, { flex: 1 }]}>{t.desc}</Text>
                        <Text style={[s.th, { width: 36 }]}>{t.und}</Text>
                        <Text style={[s.th, s.der, { width: 44 }]}>{t.cant}</Text>
                        <Text style={[s.th, s.der, { width: 64 }]}>{t.pu}</Text>
                        <Text style={[s.th, s.der, { width: 70 }]}>{t.total}</Text>
                    </View>
                    {lineas.map((l, i) => (
                        <View key={i} style={s.fila} wrap={false}>
                            <Text style={[s.td, { width: 24 }]}>{i + 1}</Text>
                            <Text style={[s.td, { flex: 1 }]}>{version === 'proveedor' && l.descripcion_prov ? l.descripcion_prov : l.descripcion}</Text>
                            <Text style={[s.td, { width: 36 }]}>{l.unidad}</Text>
                            <Text style={[s.td, s.der, { width: 44 }]}>{num(l.cantidad, 0)}</Text>
                            <Text style={[s.td, s.der, { width: 64 }]}>{num(l.precio_unit, 4)}</Text>
                            <Text style={[s.td, s.der, { width: 70 }]}>{num(l.subtotal)}</Text>
                        </View>
                    ))}
                    <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
                        <Text>
                            {t.sub}: {o.moneda} {num(o.subtotal)}
                        </Text>
                        {o.tipo_impuesto === 'IGV 18%' ? (
                            <Text>
                                {t.igv}: {o.moneda} {num(o.igv)}
                            </Text>
                        ) : null}
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11 }}>
                            {t.tot}: {o.moneda} {num(o.monto)}
                        </Text>
                    </View>
                </View>
                <View style={s.caja}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>{t.terminos}</Text>
                    {o.terminos ? <Text>{o.terminos}</Text> : null}
                    {o.penalidad_pct_dia ? <Text>{t.penal(Number(o.penalidad_pct_dia) * 100, Number(o.penalidad_tope_pct) * 100)}</Text> : null}
                </View>
                {version === 'interna' ? (
                    <View style={s.caja}>
                        <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>{t.aprob}</Text>
                        <Text>
                            Presupuesto (CG): {o.aprobacion_ppto ?? 'pendiente'} {o.cg_fecha ? '· ' + String(o.cg_fecha).slice(0, 10) : ''}
                        </Text>
                        <Text>
                            GOP: {o.aprobacion_gop ?? 'pendiente'} {o.gop_fecha ? '· ' + String(o.gop_fecha).slice(0, 10) : ''}
                        </Text>
                        {o.tipo_aprobacion === 'Aprobación Conjunta' ? (
                            <Text>
                                GAF: {o.aprobacion_gaf ?? 'pendiente'} {o.gaf_fecha ? '· ' + String(o.gaf_fecha).slice(0, 10) : ''}
                            </Text>
                        ) : null}
                        <Text style={s.gris}>Comprador: {o.comprador?.nombre}</Text>
                    </View>
                ) : null}
            </Page>
        </Document>
    );
    const pdf = new Uint8Array(await renderToBuffer(doc));
    return {
        pdf,
        nombre: `${o.numero ?? 'borrador'}${version === 'proveedor' ? '' : '-interna'}${o.revision ? '-rev' + o.revision : ''}.pdf`,
        ordenId: o.id as string,
        usuario: o.comprador_id as string,
    };
}
