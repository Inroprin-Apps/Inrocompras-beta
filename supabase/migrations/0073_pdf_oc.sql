-- 0073 · Lo que necesita el PDF de la OC para salir como el que hoy recibe el proveedor (los formatos de Compras).
--   1. Proveedor: dirección y cuenta de detracción (el resto ya existía: contacto = «Atención», teléfono, correo y las
--      cuentas bancarias con banco, número y CCI). Se editan directo, como los demás datos del proveedor.
--   2. El pie de la orden (instrucciones de entrega, documentos que pide, nota y texto legal) como parámetro: lo cambia
--      el administrador en Configuración sin tocar código.

alter table public.proveedores add column if not exists direccion text;
alter table public.proveedores add column if not exists cuenta_detraccion text;

drop trigger if exists proteger on public.proveedores;
create trigger proteger before update on public.proveedores for each row execute function app.proteger(
  'razon_social','pais','correo','telefono','contacto','cuentas','es_agente_retencion','es_buen_contribuyente',
  'direccion','cuenta_detraccion');

insert into public.config (clave, valor, nota) values
  ('oc_pie', jsonb_build_object(
     'horario', 'Horario de atención: lunes a viernes de 08:30 a. m. a 4:00 p. m.',
     'documentos', jsonb_build_array('Orden de compra', 'Factura', 'Guía de remisión'),
     'nota', 'Es imprescindible la entrega con los documentos solicitados; caso contrario, no será atendido.',
     'legal', 'Esta transacción se rige por los términos y condiciones, incluyendo nuestra Política Antisoborno y Ambiental, referenciada en el siguiente enlace y considerada parte integral de este acuerdo. La aprobación de la orden implica el compromiso de prevención de sobornos para cualquier transacción, proyecto, actividad o relación.',
     'enlace', 'https://www.inroprin.com/'),
   'El pie del PDF de la orden: horario de entrega, documentos que se piden, nota y texto legal con su enlace.')
on conflict (clave) do nothing;
