// Rutas de servidor de Next.js (App Router) que usan las integraciones. Cada bloque va en su archivo:
//   app/api/documentos/route.ts   → POST  (registrar un archivo ya subido a Storage)
//   app/api/inropay/route.ts      → POST  (InroPay avisa un cambio de estado de pago)
//   app/api/cola/route.ts         → GET   (cron)  export { procesarCola as GET } from '@/integraciones/cola'
//
// Subida de archivos (Vercel limita el cuerpo de una función a ~4.5 MB, por eso el PDF NO pasa por Next):
//   1. El navegador sube directo a Supabase Storage:  supabase.storage.from('documentos').upload(`${userId}/${uuid}-${nombre}`, file)
//   2. Llama a POST /api/documentos con la ruta y los datos. Se inserta con el cliente DEL USUARIO (RLS decide si puede).
//   3. Un disparador de la base encola «archivar_doc» (→ Drive) y, si es cotización o factura, «leer_documento».
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function clienteDelUsuario(req: Request) {
  // En la app real usar @supabase/ssr con cookies; aquí se toma el token del encabezado para que el ejemplo sea corto.
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  });
}

export async function registrarDocumento(req: Request): Promise<Response> {
  const db = clienteDelUsuario(req);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response('Inicia sesión', { status: 401 });
  const b = await req.json() as { storage_path: string; nombre: string; mime: string; tipo_doc: string; orden_id?: string; desaduanaje_id?: string; solicitud_item_id?: string };
  if (!b.storage_path.startsWith(user.id + '/')) return new Response('Ruta no válida', { status: 400 });
  const { data, error } = await db.from('documentos').insert({
    storage_path: b.storage_path, nombre_archivo: b.nombre, mime: b.mime, tipo_doc: b.tipo_doc, subido_por: user.id,
    orden_id: b.orden_id ?? null, desaduanaje_id: b.desaduanaje_id ?? null, solicitud_item_id: b.solicitud_item_id ?? null,
    lectura_estado: ['Cotización', 'Factura'].includes(b.tipo_doc) ? 'Pendiente' : 'No aplica',
  }).select('id').single();
  if (error) return Response.json({ error: error.message }, { status: 403 });
  // dispara la cola sin esperar al cron
  fetch(`${process.env.APP_URL}/api/cola`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }).catch(() => {});
  return Response.json({ id: data.id });
}

// InroPay → INROCOMPRAS. Autenticación con un secreto compartido (INROPAY_WEBHOOK_SECRET) y firma HMAC del cuerpo.
export async function webhookInroPay(req: Request): Promise<Response> {
  const cuerpo = await req.text();
  const firma = req.headers.get('x-inropay-firma') ?? '';
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.INROPAY_WEBHOOK_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const esperada = Buffer.from(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo))).toString('hex');
  if (firma !== esperada) return new Response('Firma no válida', { status: 401 });
  const e = JSON.parse(cuerpo) as { pago_id: string; estado: 'Programado' | 'Pagado' | 'Observado Finanzas'; fecha?: string; n_operacion?: string; ref?: string };
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { error } = await db.rpc('inropay_actualizar', { p_pago: e.pago_id, p_estado: e.estado, p_fecha: e.fecha ?? null, p_n_operacion: e.n_operacion ?? null, p_ref: e.ref ?? null });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

// Llamar a una acción desde la UI (cliente del usuario). La UI pide los botones a acciones_disponibles() y llama a la función que diga.
export async function ejemploAccion(db: SupabaseClient, ordenId: string) {
  const { data: botones } = await db.rpc('acciones_disponibles', { p_tabla: 'ordenes', p_id: ordenId });
  // → [{ accion: 'validar_ppto', etiqueta: 'Validar presupuesto', tipo: 'p', funcion: 'ac_oc_validar_ppto', pide: [{campo:'p_ppto', tipo:'opcion', opciones:[...]}] }, ...]
  const { error } = await db.rpc('ac_oc_validar_ppto', { p_id: ordenId, p_ppto: 'Presupuestado' });
  if (error) console.log(error.message);   // el mensaje ya viene en español, listo para el aviso
  return botones;
}
