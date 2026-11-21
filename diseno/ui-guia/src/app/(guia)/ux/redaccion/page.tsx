import { DocTable, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';

export const metadata = { title: 'Cómo se escribe' };

export default function Redaccion() {
    return (
        <Page href="/ux/redaccion">
            <PageHeader
                eyebrow="Experiencia"
                title="Cómo se escribe"
                lead="El texto es la mitad de la interfaz. Se escribe como habla un compañero de trabajo que sabe lo que hace: claro, corto, de tú, sin tecnicismos ni signos de exclamación."
            />

            <Section title="Tono">
                <Rules
                    items={[
                        ['De tú: «Revisa», «Elige», «Escribe».', 'Igual en todas las apps. Ni «usted» ni «el usuario».'],
                        ['Español de Perú y del área: «comprobante», «RUC», «detracción», «OC».', 'Las palabras que se usan en la oficina, no traducciones.'],
                        ['Sin exclamaciones ni celebraciones: «Orden guardada.», no «¡Genial! ¡Tu orden se guardó con éxito!».', ''],
                        ['Frases cortas. Lo importante, primero.', '«3 facturas sin OC. Revísalas antes de pagar.»'],
                        ['Mayúscula solo al inicio: «Ventas por cliente», no «Ventas Por Cliente».', 'Las siglas sí: RUC, SUNAT, IGV.'],
                    ]}
                />
            </Section>

            <Section title="Botones, avisos y errores">
                <DocTable
                    head={['Dónde', 'Sí', 'No']}
                    rows={[
                        ['Botón', 'Guardar orden · Exportar Excel · Crear proveedor', 'OK · Aceptar · Enviar · Click aquí'],
                        ['Botón mientras trabaja', 'Guardando… · Exportando…', '(sin cambio) · Cargando…'],
                        ['Toast de éxito', 'Orden OC-2026-0142 guardada.', 'Operación realizada con éxito.'],
                        ['Error de campo', 'El RUC tiene 11 dígitos; este tiene 10.', 'Campo inválido.'],
                        [
                            'Error de servidor',
                            'No se pudo guardar: SUNAT no respondió. Vuelve a intentar en un minuto.',
                            'Error 500 · Ha ocurrido un error inesperado.',
                        ],
                        ['Vacío', 'No hay comprobantes en noviembre 2026.', 'No data · Sin registros.'],
                        ['Confirmación de borrado', 'Eliminar la orden OC-2026-0142 (S/ 1,250.00) · Deshacer', '¿Está seguro? · Sí / No'],
                        ['Fecha de los datos', 'Actualizado hoy a las 07:00', 'Última sincronización: 2026-11-17T12:00:00Z'],
                    ]}
                />
            </Section>

            <Section title="Un error bien escrito">
                <Rules
                    items={[
                        ['Qué pasó', '«No se pudo guardar la orden»'],
                        ['Por qué, si se sabe y le sirve al usuario', '«SUNAT no respondió a tiempo»'],
                        ['Qué hacer ahora', '«Vuelve a intentar en un minuto; si sigue, avisa a sistemas.»'],
                    ]}
                />
            </Section>
        </Page>
    );
}
