# 12 · Comparación con el AppSheet de Geanfranco, bot por bot

La referencia a superar es el AppSheet «prueba más importaciones». El PDF de su documentación (ver
`referencia/appsheet/`) no trae la lógica de los bots; aquí se anota, bot por bot, lo que se verificó con sus
condiciones y pasos reales (capturas del editor, 21/11/2026) y dónde lo cubre INROCOMPRAS.

**Estado:** ✅ igual · ⭐ mejor (mismo resultado, más claro o más seguro) · 🔶 por confirmar (deducido, falta ver
el bot) · ❌ falta · ⏸ desactivado en el AppSheet (no se copia).

En INROCOMPRAS los bots no existen como tales: su lógica vive en las funciones `ac_*` y `app.*` de la base, dentro de
la misma transacción que el cambio (no hay un bot que corra después y pueda fallar solo), y lo que sale de la base
(Drive, PDF, correo, InroPay) va por la cola de trabajos.

## Verificados con el bot real

### Aprobada → Legajo incompleto ✅

- **AppSheet:** tabla OC, Updates. Condición: `[Estado de Aprobación3]` pasa a «Aprobado para Compra». Pone
  `Estatus Compra = IF([LEGAJO PARA PAGO], IFS(forma de pago → Adelanto pendiente | Crédito | Credito letra | Tarjeta
de credito | Caja Chica | Pago pendiente), "Legajo incompleto")` y `Fecha_Aprobacion = hoy` si está vacía.
- **INROCOMPRAS:** `app.oc_sync_estatus` (0003): misma regla y la fecha una sola vez. En el mismo paso hace lo de
  «OC - Aprobada» (cuotas, PDF para el proveedor, aviso al comprador) y lo de «Estado - Actualizar por pago» (saldo
  pendiente, OC pagada). Los estados se escriben sin la ortografía mezclada del AppSheet («Crédito letra»,
  «Tarjeta de crédito», «Caja chica»).

### Estado - Legajo Completo ⭐

- **AppSheet:** tabla OC, Updates. Condición: `[LEGAJO PARA PAGO]` pasa a «Y» (Compras marca la casilla y llena
  Fecha_Limite_Pago, Entrega_Total y Monto_a_Registrar). Pasos: (1) `Estatus Compra` según la forma de pago (la misma
  tabla de arriba); (2) acción «Crear pago automático»: agrega un pago «Solicitado» por el adelanto, lo entregado o el
  total, con su fecha límite.
- **INROCOMPRAS:** las cuotas se crean al aprobar (`app.generar_cuotas`: adelanto + saldo, crédito, letra, caja
  chica) y el legajo se da por completo cuando una cuota se solicita: a mano («Solicitar pago», con sustento si no hay
  factura) o sola al subir la factura que calza (`app.factura_libre`, bot «Pago - Factura subida»). El estatus cambia
  igual (`app.oc_sync_estatus`). Una entrega parcial se resuelve dividiendo la cuota («Dividir»), en vez de
  Entrega_Total + Monto_a_Registrar. Mismo resultado, sin una casilla que se pueda marcar sin documentos.

### OC - Estado al aprobar ⭐

- **AppSheet:** tabla OC, Updates. Condición: `[Estado de Aprobación3]` pasa a «Aprobado para Compra». Pasos: (1)
  acción «actualizar estado» sobre la misma OC; (2) `Correo_Envio = IF(ISBLANK([Correo_Envio]), correo del proveedor,
[Correo_Envio])`; (3) webhook a un Apps Script que recalcula las cuotas.
- **INROCOMPRAS:** (1) `app.oc_sync_estatus`; (3) `app.generar_cuotas` en la misma transacción, sin script externo;
  (2) el correo del proveedor se copia al crear la OC y, desde 0070, también al aprobar si quedó vacío (como el bot).

### Sincronizar Estatus con Aprobación ✅

- **AppSheet:** cuando cambia `[Estado de Aprobación3]` (salvo Borrador, Anulada, Anulación solicitada, Saldo pendiente,
  OC pagada, En modificación): estatus = «Observado por …» si está observada; si está aprobada, la tabla de legajo;
  si no, «Pendiente de aprobación». `Fecha_Aprobacion` = hoy si está aprobada; si no, vacía.
- **INROCOMPRAS:** `app.oc_sync_estatus`, misma regla. Diferencia menor: la fecha de aprobación no se borra si la
  aprobación se revoca (queda como la primera aprobación; el historial dice cuándo se revocó).

### Estado - Actualizar por pago ✅ · Sincronizar Pago ✅

- **AppSheet:** un cambio en Pagos corre «actualizar OC» sobre su OC; un cambio de estatus de la OC corre una acción
  sobre sus pagos.
- **INROCOMPRAS:** cada acción de pago llama a `app.oc_sync_estatus` en la misma transacción; al anular la OC, sus
  cuotas pendientes pasan a «Anulado».

### Pago - Remanente de cuota ⭐

- **AppSheet:** si una cuota pasa de Plan a Solicitado con un monto menor, crea otra en Plan por la diferencia:
  N_Cuota + 0.1, tipo «Saldo», mismo hito, días de crédito y letra, comentario «Remanente de la cuota N».
- **INROCOMPRAS:** la acción «Dividir» (`ac_pago_dividir`, 0061) hace lo mismo a propósito, no como efecto de editar
  el monto: mismo número (+0.1, sin repetirse), tipo, hito, crédito, letra, fecha límite y comentario.

### Pago - Factura subida ⭐ (0070)

- **AppSheet:** al subir una «Factura» de la OC: (1) la vincula a TODAS las cuotas de la OC sin factura que estén
  Solicitadas, Programadas o Pagadas; (2) solicita las cuotas en Plan con hito «A la aprobación» o «Contra factura»;
  (3) pone la fecha de factura; (4) actualiza la OC.
- **INROCOMPRAS hoy:** `app.al_subir_factura` solo actúa si la factura trae monto, y vincula o solicita UNA cuota cuyo
  monto calce (±1). Una factura que cubre varias cuotas (o sin monto leído) deja cuotas «sin factura», y el
  recordatorio seguiría avisando.
- **Corrección (0070), más precisa que el AppSheet:** una factura por el **total de la OC** (±1) cubre todas sus
  cuotas: se vincula a las ya solicitadas, programadas o pagadas sin factura, el adelanto que siga en Plan se solicita,
  y las demás cuotas, al pedirlas, la encuentran y no piden sustento. Una factura por **otro monto** sigue yendo solo a
  la cuota con ese monto. No se copia la regla amplia del AppSheet (vincular cualquier factura a todas las cuotas):
  con entregas parciales, la primera factura «taparía» cuotas que esperan su propia factura y el control se pierde.

### Generar Requerimiento ⭐ (0070)

- **AppSheet:** al pasar la solicitud de Liberada a «En Req»: (1) Apps Script (PDF del requerimiento); (2) aviso al
  área que lo emite: «Administración» si la solicitud es administrativa, «Logística» si la etapa dice «Transporte»,
  si no «Planeamiento».
- **INROCOMPRAS hoy:** `ac_solicitud_liberar` crea el requerimiento y avisa, pero el área sale de un parámetro fijo
  (`area_emisora_rq` = Planeamiento) para todas.
- **Corrección (0070):** la misma regla de tres áreas (`app.area_emisora_de`), con «Logística» = **Compras**: en
  INROPRIN «Logística» es el equipo de compras nacionales e importaciones, no un área aparte (en el AppSheet ese
  aviso no le llegaba a nadie, porque ningún usuario tiene el área «Logística»). Y una red: si el área elegida no tiene a
  nadie activo, va a Planeamiento, porque solo el área emisora puede emitir y el requerimiento quedaría trabado. Responde D-01 con lo que se usa hoy. El PDF del requerimiento: ver
  «Apps Script» abajo.

### OC - Pago · Chat - Pago registrado · Chat Liberada ⭐ (0070)

- **AppSheet:** «OC - Pago» publica en un espacio de Chat cuando el legajo se completa; «Chat - Pago registrado»,
  cuando se agrega un pago (Adds en Pagos); «Chat Liberada», cuando se libera una solicitud.
- **INROCOMPRAS:** el legajo se completa y el pago «se registra» en el mismo momento: cuando se solicita una cuota
  (las cuotas existen desde la aprobación). **Ajuste (0070):** `chat_avisos` = solicitud liberada → «compras», cuota
  solicitada → «finanzas», resumen de facturas → «compras». Falta confirmar los espacios y cargar sus webhooks.

### Recordatorio - Facturas ⭐ (0070)

- **AppSheet:** programado, todos los días a las 8:00 (hora de Lima), sin condición: publica un resumen («digest») de
  las facturas pendientes en un espacio de Chat.
- **INROCOMPRAS hoy:** un aviso a cada comprador por OC con cuotas pagadas sin factura (cada 3 días), una vez al día
  con la cola. **Ajuste (0070):** además, el resumen del día en el espacio de Chat, y el cron a las 8:00 de Lima
  (`vercel.json`: 13:00 UTC; en el plan Hobby corre dentro de esa hora).

### Ejecutar anulación · OC - Anulada liberar ítems · Emitir Req · Generar PDF (Apps Script) 🔶

Estos cuatro solo llaman al mismo Apps Script (`…/macros/s/…/exec`); su lógica vive en el código del script, no en el
bot. INROCOMPRAS hace lo equivalente en la base (`ac_anulacion_decidir`, el saldo del plan descuenta solo órdenes no
anuladas, `ac_req_emitir`), pero para confirmarlo hace falta ver el código del Apps Script.

## Por verificar

| Grupo                | Bot                                | Dónde lo cubre INROCOMPRAS                                  | Estado |
| -------------------- | ---------------------------------- | ----------------------------------------------------------- | ------ |
| Anulaciones          | Ejecutar anulación                 | `ac_anulacion_decidir`                                      | 🔶     |
| Anulaciones          | Aviso - Anulación pendiente        | aviso a los aprobadores de la anulación                     | 🔶     |
| Base de datos OC NAC | Estampar OC en Item                | —                                                           | ⏸      |
| Base de datos OC NAC | OC - Recalcular cabecera           | `app.oc_recalcular`                                         | 🔶     |
| Des_Documentos       | Desaduanaje - Archivar documento   | cola `archivar_doc`                                         | 🔶     |
| Desaduanajes         | Desaduanaje - Crear                | `ac_des_crear` + cola `crear_carpeta`                       | 🔶     |
| Documentos_OC        | Documento - Archivar               | cola `archivar_doc`                                         | 🔶     |
| Documentos_OC        | Pago - Factura subida              | `app.factura_libre` (solicita la cuota que calza)           | 🔶     |
| OC                   | OC - Nueva                         | —                                                           | ⏸      |
| OC                   | OC - Aprobada                      | `app.oc_sync_estatus` (cuotas, PDF, aviso)                  | 🔶     |
| OC                   | OC - Pago                          | `app.oc_sync_estatus`                                       | 🔶     |
| OC                   | OC - Observada                     | `ac_oc_observar*` + aviso al comprador                      | 🔶     |
| OC                   | Levantar Observación               | `ac_oc_reenviar` / `ac_oc_finanzas_subsanar`                | 🔶     |
| OC                   | Legajo quitado - Revertir          | —                                                           | ⏸      |
| OC                   | Quitar observación                 | —                                                           | ⏸      |
| OC                   | Sincronizar Estatus con Aprobación | `app.oc_sync_estatus`                                       | 🔶     |
| OC                   | Sincronizar Pago                   | `app.oc_sync_estatus`                                       | 🔶     |
| OC                   | Generar PDF - Interna              | cola `pdf_oc` (versión interna)                             | 🔶     |
| OC                   | Generar PDF - Prov                 | cola `pdf_oc` (versión proveedor, español o inglés)         | 🔶     |
| OC                   | OC - Reservar número               | `app.siguiente` al emitir                                   | 🔶     |
| OC                   | OC - Anulada liberar ítems         | `app.oc_sync_estatus` / anular: el saldo vuelve al plan     | 🔶     |
| OC                   | OC - Modificada (aviso)            | aviso a Control de Gestión                                  | 🔶     |
| OC                   | OC - Estado al aprobar             | `app.oc_sync_estatus`                                       | 🔶     |
| OC                   | OC - Recalcular cuotas             | `app.generar_cuotas`                                        | 🔶     |
| OC                   | OC - Enviar al proveedor           | `ac_oc_enviar` + cola `enviar_correo` (PDF adjunto)         | 🔶     |
| Pagos                | Estado - Actualizar por pago       | `app.oc_sync_estatus`                                       | 🔶     |
| Pagos                | Chat - Pago registrado             | aviso en la app y por correo; **Google Chat ❌**            | ❌     |
| Pagos                | Pago - Remanente de cuota          | `ac_pago_*` (0061)                                          | 🔶     |
| Proyectos            | Auto etapa General al Ganar        | `ac_proyecto_resultado`                                     | 🔶     |
| Requerimientos       | data Req=Items                     | —                                                           | ⏸      |
| Requerimientos       | Req observado                      | `ac_req_observar` (aviso al solicitante)                    | 🔶     |
| Requerimientos       | Emitir Req                         | `ac_req_emitir`                                             | 🔶     |
| Solicitudes          | Nuevo proyecto                     | —                                                           | ⏸      |
| Solicitudes          | Aviso - Solicitud emitida          | aviso a quien libera                                        | 🔶     |
| Solicitudes          | Clonar Solicitud                   | `ac_solicitud_clonar`                                       | 🔶     |
| Solicitudes          | Aviso - Solicitud Liberada         | aviso al solicitante; **Google Chat ❌**                    | ❌     |
| Solicitudes          | Aviso - Solicitud rechazada        | aviso al solicitante                                        | 🔶     |
| Solicitudes          | Generar Requerimiento              | `ac_solicitud_liberar` crea el requerimiento                | 🔶     |
| Solicitudes          | Carga masiva - Procesar archivo    | carga Excel (lectura en el navegador + `ac_carga_procesar`) | 🔶     |
| Solicitudes          | Carga masiva - Confirmar           | `ac_carga_procesar` / `ac_carga_descartar_fila`             | 🔶     |
| Solicitudes          | Generar PDF Solicitud              | —                                                           | ❌     |
| Solicitudes          | Solicitud observada                | `ac_solicitud_devolver` (aviso al solicitante)              | 🔶     |
| Solicitudes          | Solicitud reenviada                | `ac_solicitud_reenviar` (aviso a quien libera)              | 🔶     |
| Solicitudes          | Req anulado                        | anulación del requerimiento                                 | 🔶     |
| Solicitudes          | Aviso - Solicitud cancelada        | —                                                           | ❌     |
| Other (programado)   | Recordatorio - Facturas            | —                                                           | ❌     |

## Fuera de los bots

- Pantalla **Empresas** (el AppSheet la tiene en el menú) ⭐ (0071): en Configuración → Empresas, solo el administrador. RUC validado con su dígito verificador, y una OC de una empresa sin RUC no se emite (el proveedor no sabría a quién facturar). Los datos reales se cargan en la base, no en el repo.
