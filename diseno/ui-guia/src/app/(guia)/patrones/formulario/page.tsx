'use client';

import { useState, type FormEvent } from 'react';
import { Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { Notice } from '../../../../ui/bits.tsx';
import { Button } from '../../../../ui/button.tsx';
import { Card } from '../../../../ui/card.tsx';
import { Checkbox, Field, Input, Textarea } from '../../../../ui/field.tsx';
import { SelectMenu } from '../../../../ui/select-menu.tsx';
import { money } from '../../../../ui/format.ts';
import { toast } from '../../../../ui/toaster.tsx';

interface Form {
    ruc: string;
    proveedor: string;
    moneda: 'PEN' | 'USD';
    monto: string;
    fecha: string;
    detraccion: boolean;
    notas: string;
}
type Errors = Partial<Record<keyof Form, string>>;

const EMPTY: Form = { ruc: '', proveedor: '', moneda: 'PEN', monto: '', fecha: '', detraccion: false, notas: '' };

function validate(f: Form): Errors {
    const e: Errors = {};
    if (!/^\d{11}$/.test(f.ruc)) e.ruc = f.ruc ? `El RUC tiene 11 dígitos; este tiene ${f.ruc.length}.` : 'Escribe el RUC del proveedor.';
    if (!f.proveedor.trim()) e.proveedor = 'Escribe la razón social.';
    const n = Number(f.monto.replace(/,/g, ''));
    if (!f.monto) e.monto = 'Escribe el monto total.';
    else if (!(n > 0)) e.monto = 'El monto tiene que ser mayor que cero. Usa punto para los decimales: 1250.50';
    if (!f.fecha) e.fecha = 'Elige la fecha de entrega.';
    return e;
}

export default function Formulario() {
    const [f, setF] = useState<Form>(EMPTY);
    const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
    const [sent, setSent] = useState(false);
    const [saving, setSaving] = useState(false);
    const errors = validate(f);
    const show = (k: keyof Form) => ((sent || touched[k]) && errors[k]) || undefined;
    const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
    const blur = (k: keyof Form) => () => setTouched((t) => ({ ...t, [k]: true }));
    const count = Object.keys(errors).length;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setSent(true);
        if (count) return;
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            toast.success(`Orden OC-2026-0143 guardada: ${f.proveedor}, ${money(Number(f.monto), f.moneda)}.`);
            setF(EMPTY);
            setTouched({});
            setSent(false);
        }, 1200);
    };

    return (
        <Page href="/patrones/formulario">
            <PageHeader
                eyebrow="Patrones"
                title="Formulario completo"
                lead="Una orden de compra nueva. Prueba a enviarla vacía, corrige los errores uno a uno, y guárdala: el botón dice lo que hace mientras guarda y el toast confirma qué se guardó."
            />

            <Section title="El ejemplo">
                <Example
                    code={`// Errores al salir del campo (touched) o al enviar (sent), nunca con cada tecla.
const show = (k) => ((sent || touched[k]) && errors[k]) || undefined;

<form onSubmit={submit} noValidate>
    {sent && count > 0 && <Notice tone="danger">Revisa {count} campos marcados en rojo.</Notice>}
    <Field label="RUC" error={show('ruc')}>
        {(p) => <Input {...p} value={f.ruc} onBlur={blur('ruc')} onChange={…} />}
    </Field>
    …
    <div className="flex justify-end gap-2.5">
        <Button variant="secondary" onClick={cancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar orden'}</Button>
    </div>
</form>`}
                >
                    <Card title="Nueva orden de compra" className="mx-auto max-w-2xl">
                        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                            {sent && count > 0 && (
                                <Notice tone="danger">
                                    Revisa {count === 1 ? 'el campo marcado' : `los ${count} campos marcados`} en rojo.
                                </Notice>
                            )}
                            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                                <Field label="RUC" hint="11 dígitos." error={show('ruc')}>
                                    {(p) => (
                                        <Input
                                            {...p}
                                            inputMode="numeric"
                                            maxLength={11}
                                            value={f.ruc}
                                            onBlur={blur('ruc')}
                                            onChange={(e) => set('ruc', e.target.value.replace(/\D/g, ''))}
                                        />
                                    )}
                                </Field>
                                <Field label="Razón social" error={show('proveedor')}>
                                    {(p) => <Input {...p} value={f.proveedor} onBlur={blur('proveedor')} onChange={(e) => set('proveedor', e.target.value)} />}
                                </Field>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[10rem_1fr_1fr]">
                                <Field label="Moneda">
                                    {(p) => (
                                        <SelectMenu
                                            {...p}
                                            value={f.moneda}
                                            onChange={(v) => set('moneda', v as Form['moneda'])}
                                            options={[
                                                { value: 'PEN', label: 'Soles (S/)' },
                                                { value: 'USD', label: 'Dólares (US$)' },
                                            ]}
                                        />
                                    )}
                                </Field>
                                <Field label="Monto total" hint="Con IGV." error={show('monto')}>
                                    {(p) => (
                                        <Input
                                            {...p}
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            className="text-right tabular-nums"
                                            value={f.monto}
                                            onBlur={blur('monto')}
                                            onChange={(e) => set('monto', e.target.value)}
                                        />
                                    )}
                                </Field>
                                <Field label="Fecha de entrega" error={show('fecha')}>
                                    {(p) => <Input {...p} type="date" value={f.fecha} onBlur={blur('fecha')} onChange={(e) => set('fecha', e.target.value)} />}
                                </Field>
                            </div>
                            <Checkbox
                                label="Afecta a detracción"
                                hint="Servicios sujetos al SPOT."
                                checked={f.detraccion}
                                onChange={(e) => set('detraccion', e.target.checked)}
                            />
                            <Field label="Notas para contabilidad" optional>
                                {(p) => <Textarea {...p} value={f.notas} onChange={(e) => set('notas', e.target.value)} />}
                            </Field>
                            <div className="flex flex-wrap justify-end gap-2.5 border-t border-divider pt-4">
                                <Button
                                    variant="secondary"
                                    disabled={saving}
                                    onClick={() => {
                                        setF(EMPTY);
                                        setTouched({});
                                        setSent(false);
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Guardando…' : 'Guardar orden'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </Example>
            </Section>

            <Section title="Anatomía">
                <Rules
                    items={[
                        ['Los campos en el orden en que el usuario tiene los datos (normalmente, el del documento en papel).', ''],
                        ['Al enviar con errores: un aviso arriba con cuántos hay, y cada error junto a su campo.', 'El aviso dice que hay algo; el campo dice qué.'],
                        ['El botón principal abajo a la derecha, «Cancelar» a su izquierda.', ''],
                        ['Mientras guarda: el botón deshabilitado y diciendo «Guardando…».', 'Nada de doble envío.'],
                        ['Al guardar, un toast que nombra lo guardado, y el formulario limpio o la pantalla del registro nuevo.', ''],
                        ['Si el usuario sale con cambios sin guardar, se le avisa.', 'Perder un formulario largo es lo que más molesta.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
