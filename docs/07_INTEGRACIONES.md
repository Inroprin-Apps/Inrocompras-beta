# 07 · Integraciones (todas reales)

Código base en `ejemplos/integraciones/`, compilado con TypeScript estricto. Todo lo externo pasa por la **cola de trabajos** (`cola_trabajos`): la acción responde al instante y el trabajo se hace en segundo plano, con reintentos (5, con espera creciente) y error visible para el administrador.

## 1. Inicio de sesión: Google con la cuenta de la empresa

- Supabase Auth, proveedor **Google**. **No hay contraseñas propias** ni registro por correo: el login por correo y contraseña se deja apagado en Supabase.
- Botón «Iniciar sesión con Google»:
  `supabase.auth.signInWithOAuth({ provider: 'google', options: { queryParams: { hd: 'inroprin.com', prompt: 'select_account' }, redirectTo: APP_URL + '/auth/callback' } })`.
  `hd` hace que Google ofrezca solo cuentas del dominio.
- **Doble control:**
  - el disparador `app.alta_usuario` (0002/0004) rechaza cualquier correo que no sea del dominio de `config.dominio_permitido`;
  - una persona nueva entra con área «Sin área» y sin roles, así que no ve precios ni tiene acciones hasta que el administrador la configura en «Equipo».
- En Google Cloud: pantalla de consentimiento de tipo **Interna**, para que solo la organización pueda usarla, y el cliente OAuth con la URL de callback de Supabase.
- Sesión: cookies con `@supabase/ssr` y middleware de Next que renueva el token. Si se cae internet, el borrador se guarda en el navegador.

## 2. Google Drive (legajo)

- **Unidad compartida** «INROCOMPRAS – Legajos». Una **cuenta de servicio** es miembro de la unidad con el rol Administrador de contenido. No necesita delegación de dominio.
- Estructura: `Raíz / AAAA / EMPRESA-PROC / <N° OC – Proveedor> / 001 Requerimiento · 002 Cotizaciones · 003 Orden · 004 Documentos Contables · 005 Pagos · 006 Otros`. El desaduanaje va en una subcarpeta `DES-AAAA-0000 (I)` dentro de su OC dueña.
- Flujo de subida (Vercel limita el cuerpo de la función a ~4.5 MB):
  1. el navegador sube a **Supabase Storage** (`documentos/<uid>/<uuid>-nombre`);
  2. `POST /api/documentos` registra la fila con el cliente del usuario, así RLS decide si puede;
  3. un disparador encola `archivar_doc` (pasa el archivo a Drive y guarda id y link) y, si es cotización o factura, `leer_documento`.
- Al emitir la OC se encola `crear_carpeta`. Los documentos subidos al borrador se archivan cuando la carpeta existe.
- Variables: `GOOGLE_SERVICE_ACCOUNT_JSON`, `DRIVE_UNIDAD_ID`, `DRIVE_CARPETA_RAIZ_ID`.

## 3. Correo (Google Workspace)

- `CORREO_MODO=gmail`: Gmail API con la cuenta de servicio y **delegación de dominio solo para `gmail.send`**, enviando como una cuenta dedicada (p. ej. `notificaciones@` del dominio). La configura TI en la consola de administración de Google: Seguridad → Controles de API → Delegación de todo el dominio.
- `CORREO_MODO=smtp`: relay SMTP de Workspace con nodemailer.
- `CORREO_MODO=registro`: mientras TI no configure nada, solo deja un log y no se envía nada.
- Qué se envía:
  - notificaciones de pasos pendientes (`notificaciones` → trabajo `notificar`);
  - la OC al proveedor con el PDF adjunto, con el comprador en copia y como «responder a».
- Plantillas en `correo.ts`: de tú, cortas, sin exclamaciones; la OC de importación va en inglés.

## 4. InroPay (pagos de Finanzas)

Decisión 17/11: los pagos se hacen en InroPay. INROCOMPRAS **envía la solicitud y lee el estado**.

- **Salida** (trabajo `inropay_solicitar`, al pasar una cuota a Solicitado): `POST {INROPAY_URL}/solicitudes` con `{ origen, pago_id, orden{numero, moneda, proveedor{razon_social, ruc, cuentas}}, cuota, monto, retencion, neto, fecha_limite, factura_id }`. Responde `{ id }`, que se guarda en `pagos.inropay_ref`.
- **Entrada** (webhook `POST /api/inropay`, firmado con HMAC-SHA256 en `x-inropay-firma`): `{ pago_id, estado: 'Programado'|'Pagado'|'Observado Finanzas', fecha?, n_operacion?, ref? }` → `inropay_actualizar()`. Esa función solo la puede llamar el servidor.
- **Hasta que exista el endpoint:** sin `INROPAY_URL` no se envía nada, y Finanzas mueve los estados con los botones de la app (Programar, Marcar pagado, Observar). El contrato se acuerda con el analista de Finanzas (D-03).

## 5. Lectura de cotizaciones y facturas

`lector-documentos.ts`:

- **Paso 1, gratis, sin IA:** texto del PDF (unpdf); RUC válidos por módulo 11, descartando los propios (`RUCS_PROPIOS`); moneda, subtotal, IGV y total. Se probó con un PDF real.
- **Paso 2, Gemini (plan gratuito):** si el PDF es escaneado, si hay varios RUC o si se pide el detalle de ítems. Usa `@google/genai` con `responseSchema` (JSON fijo) y temperatura 0. La llave `GEMINI_API_KEY` solo vive en el servidor. El modelo se elige con `GEMINI_MODEL` (por defecto `gemini-2.5-flash`; revisar en Google AI Studio qué modelos tienen hoy nivel gratuito).
- Si Gemini falla o no hay cuota, se queda con la lectura gratuita y avisa.
- **Nada se guarda sin confirmación:** la lectura queda en `documentos.lectura` como propuesta. La persona la revisa en pantalla y `ac_documento_confirmar_lectura()` la confirma. Si el RUC corresponde a un proveedor registrado y la OC está en borrador sin proveedor, lo propone.
- Para un RUC nuevo: se crea el proveedor con ese RUC y la razón social leída. Finanzas lo evalúa.
- **Privacidad (D-07):** en el plan gratuito, Google puede usar el contenido para mejorar sus productos. Para el piloto es aceptable; antes de producción hay que decidir si se pasa al plan de pago, que no usa los datos.

## 6. PDF de la orden

`pdf-oc.tsx` con `@react-pdf/renderer`:

- versión interna (con aprobaciones y proyecto);
- versión proveedor (con la descripción del proveedor y en inglés si es importación).

Se regenera al emitir, al aprobar y al confirmar una modificación (revisión N). La versión anterior queda como «Reemplazado» en el legajo.

## 7. SIDIGE

**Fuera de esta etapa.** No se lee ni se escribe en sus servidores. Las referencias (`rq_sidige`, `codigo_sidige`) se anotan a mano. La cola admite `sidige_escribir`, pero el procesador lo rechaza a propósito hasta que exista la integración oficial.

## Variables de entorno (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY       # públicas
SUPABASE_SERVICE_ROLE_KEY                                     # solo servidor
APP_URL, CRON_SECRET
GOOGLE_SERVICE_ACCOUNT_JSON, DRIVE_UNIDAD_ID, DRIVE_CARPETA_RAIZ_ID
CORREO_MODO, CORREO_REMITENTE, (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
GEMINI_API_KEY, GEMINI_MODEL, RUCS_PROPIOS
INROPAY_URL, INROPAY_TOKEN, INROPAY_WEBHOOK_SECRET
```

`vercel.json`: `{ "crons": [{ "path": "/api/cola", "schedule": "* * * * *" }] }`. El cron cada minuto requiere el plan Pro; en Hobby es diario, y entonces la cola se dispara también después de cada acción.
