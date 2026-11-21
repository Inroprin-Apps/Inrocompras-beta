'use client';

import { useState } from 'react';
import { Code, DoDont, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { Checkbox, Field, Input, Textarea } from '../../../../ui/field.tsx';
import { SelectMenu } from '../../../../ui/select-menu.tsx';

export default function Formularios() {
    const [ruc, setRuc] = useState('2051234567');
    const [ok, setOk] = useState(true);
    const [currency, setCurrency] = useState('PEN');
    const rucError = ruc.length !== 11 ? `El RUC tiene 11 dígitos; este tiene ${ruc.length}.` : undefined;

    return (
        <Page href="/componentes/formularios">
            <PageHeader
                eyebrow="Componentes"
                title="Campos de formulario"
                lead={
                    <>
                        <Code>Field</Code> pone la etiqueta arriba y debajo la ayuda o el error, y conecta todo para el lector de pantalla (<Code>htmlFor</Code>
                        , <Code>aria-invalid</Code>, <Code>aria-describedby</Code>). Los controles son el mismo <Code>CONTROL</Code> de los filtros.{' '}
                        <i>Propuesta: nuevo, no está en INROCONTA.</i>
                    </>
                }
            />

            <Section title="Campo de texto">
                <Example
                    code={`import { Field, Input } from '@/shared/ui/field.tsx';

<Field label="Razón social" hint="Como aparece en la ficha RUC.">
    {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
</Field>`}
                >
                    <div className="grid max-w-md gap-4">
                        <Field label="Razón social" hint="Como aparece en la ficha RUC.">
                            {(p) => <Input {...p} defaultValue="Proveedor Andino SAC" />}
                        </Field>
                        <Field label="Referencia" optional>
                            {(p) => <Input {...p} placeholder="Ej. OC-2026-0142" />}
                        </Field>
                        <Field label="Campo deshabilitado" hint="Se llena solo desde SUNAT.">
                            {(p) => <Input {...p} defaultValue="ACTIVO · HABIDO" disabled />}
                        </Field>
                    </div>
                </Example>
            </Section>

            <Section title="Con error" blurb="Escribe o borra dígitos: el error aparece en el sitio de la ayuda y dice qué está mal y cómo se arregla.">
                <Example
                    code={`<Field label="RUC" hint="11 dígitos." error={ruc.length !== 11 ? \`El RUC tiene 11 dígitos; este tiene \${ruc.length}.\` : undefined}>
    {(p) => <Input {...p} inputMode="numeric" value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\\D/g, ''))} />}
</Field>`}
                >
                    <div className="max-w-md">
                        <Field label="RUC" hint="11 dígitos." error={rucError}>
                            {(p) => <Input {...p} inputMode="numeric" maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))} />}
                        </Field>
                    </div>
                </Example>
            </Section>

            <Section title="Lista, texto largo y casilla">
                <Example
                    code={`<Field label="Moneda">
    {(p) => (
        <SelectMenu {...p} value={currency} onChange={setCurrency} options={[
            { value: 'PEN', label: 'Soles (S/)' },
            { value: 'USD', label: 'Dólares (US$)' },
        ]} />
    )}
</Field>
<Field label="Observaciones" optional>{(p) => <Textarea {...p} />}</Field>
<Checkbox label="Afecta a detracción" hint="12 % sobre servicios." checked={ok} onChange={(e) => setOk(e.target.checked)} />`}
                >
                    <div className="grid max-w-md gap-4">
                        <Field label="Moneda">
                            {(p) => (
                                <SelectMenu
                                    {...p}
                                    value={currency}
                                    onChange={setCurrency}
                                    options={[
                                        { value: 'PEN', label: 'Soles (S/)' },
                                        { value: 'USD', label: 'Dólares (US$)' },
                                    ]}
                                />
                            )}
                        </Field>
                        <Field label="Observaciones" optional>
                            {(p) => <Textarea {...p} placeholder="Algo que deba saber contabilidad" />}
                        </Field>
                        <Checkbox label="Afecta a detracción" hint="12 % sobre servicios." checked={ok} onChange={(e) => setOk(e.target.checked)} />
                    </div>
                </Example>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        [
                            'Siempre etiqueta visible arriba; el placeholder es un ejemplo, no la etiqueta.',
                            'El placeholder desaparece al escribir y deja al usuario sin saber qué era el campo.',
                        ],
                        [
                            'Se marca lo opcional, no lo obligatorio.',
                            'En formularios de trabajo casi todo es obligatorio: un asterisco en cada campo es ruido.',
                        ],
                        [
                            'El error se muestra al salir del campo o al enviar, no con cada tecla.',
                            'Gritar «inválido» mientras se escribe el tercer dígito no ayuda.',
                        ],
                        ['El error dice qué hacer: «El RUC tiene 11 dígitos; este tiene 10».', 'Nunca «Campo inválido».'],
                        ['Un campo por fila en móvil; en escritorio, dos columnas solo si son pareja (desde / hasta, moneda / monto).', ''],
                    ]}
                />
                <DoDont
                    good={
                        <div className="w-64">
                            <Field label="Correo">{(p) => <Input {...p} placeholder="nombre@inroprin.com" />}</Field>
                        </div>
                    }
                    goodNote="Etiqueta arriba, el placeholder es un ejemplo."
                    bad={
                        <div className="w-64">
                            <Input placeholder="Correo" aria-label="Correo" />
                        </div>
                    }
                    badNote="El placeholder hace de etiqueta: al escribir ya no se sabe qué campo era."
                />
            </Section>
        </Page>
    );
}
