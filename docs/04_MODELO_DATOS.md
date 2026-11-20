# 04 · Modelo de datos

El esquema completo está en `supabase/migrations/0001_esquema.sql`, y cada tabla indica de qué tabla del AppSheet viene. Resumen:

| Tabla Supabase | AppSheet | Nota |
|---|---|---|
| `usuarios` | Usuarios | `id` = `auth.users.id`; área, jefe, ámbito (nac/imp/todas) |
| `usuario_roles` | Aprobadores_OC | Se agregan `JEFE_COMPRAS_I`, `CONTABILIDAD`, `TECNICA` y `ADMIN` |
| `empresas` | Empresas / Unidad de negocio | INROPRIN, INROPLAS, Consorcio, Cooteq |
| `monedas` | Tipo_Cambio | PEN, USD, EUR, GBP con tasa a soles |
| `reglas_aprobacion` | Reglas_Aprobacion | Ruta por tipo de compra y monto |
| `conceptos` | Conceptos / Conceptos_Item | Faltan cargar los 43 de OC desde la hoja |
| `proveedores` | Base de datos Proveedores | + evaluación financiera |
| `proyectos`, `proyecto_etapas` | Proyectos, Proyecto_Etapas | + fecha meta y lugar de entrega |
| `solicitudes`, `solicitud_items`, `carga_items` | Solicitudes, Solicitud_Items, Carga_items | El número SOL-AAAA-0000 de Solicitud_Docs va en `solicitudes.numero` |
| `requerimientos`, `requerimiento_items` | Requerimientos, Items | `requerimiento_items` es **también la línea del plan de compras** |
| `anulaciones` | Anulaciones | De un requerimiento o de un ítem |
| `ordenes` | OC | Las 37 columnas del cuadro salen de una vista (ver abajo) |
| `oc_lineas` | Base de datos OC NAC | Con demasía y su decisión |
| `documentos` | Documentos_OC + Des_Documentos + fichas | Storage (staging) + Drive (legajo) + lectura del PDF |
| `pagos` | Pagos | Cuotas + `inropay_ref` |
| `caja_chica` | Caja_Chica | Comprobante por ítem |
| `desaduanajes`, `des_gastos`, `des_productos`, `des_costeo_hist` | Desaduanajes, Des_Gastos, Des_Productos, Des_Costeo_Hist | `Des_Docs` (puente del webhook) ya no hace falta |
| `tc_costeo`, `conceptos_gasto_imp` | TC_Costeo, Conceptos_Gasto_Imp | |
| `series`, `correlativos` | Serie EMPRESA\|PROCEDENCIA\|AÑO | Numeración sin huecos por bloqueo de fila |
| `historial` | (no existía) | Cada cambio de estado: quién, cuándo, de, a, motivo |
| `cola_trabajos` | Cola de Apps Script | carpeta, archivar, PDF, correo, leer, notificar, InroPay |
| `notificaciones` | (correos y chat) | Campana en la app + correo |
| `config` | (fijos en Listas) | Parámetros editables por el administrador |

## Nombres de tablas y SIDIGE
Las tablas usan nombres en español claro. Para la integración con el SIDIGE se guardan las referencias: `requerimientos.rq_sidige`, `requerimiento_items.codigo_sidige` (SKU ME00…) y, más adelante, el número de OCN/OCE. Se escribirá por la cola `sidige_escribir` (no habilitada). El mapa de campos está en `referencia/sidige/`.

## Vista pendiente: cuadro de aprobaciones (37 columnas)
Las áreas que leen el cuadro de la hoja OC no deben notar el cambio. Hay que crear `v_cuadro_aprobaciones` con las columnas en este orden, tomado del AppSheet:

> VB C. GESTION · OC · Estatus Compra · Comprador · N° Requerimiento · Procedencia · Unidad de negocio · Fecha · Proveedor · Proyecto · Concepto · Link de la carpeta OC · Monto · Moneda original · Monto en Soles · Tipo de aprobación · Forma de pago · % adelanto · Días de crédito · Condición · Aprobación Ppto · Aprobación GOP · Aprobación GAF · Check Aprobació · Check Control Gestión · Estado de Aprobación3 · Observación finanzas · Criterio de observación finanzas · LEGAJO PARA PAGO · OC CERRADA · Cuadro de pagos · Comentarios compras · UBICACIÓN · SUSTENTO DEL EXCESO PARA LA BD · Concatenado

Son 35 en el AppSheet. **Hay que confirmar contra la hoja real** cuáles son las 2 que faltan para llegar a 37 (decisión D-05), y luego exportarlo a CSV o Excel con esos nombres exactos.

## Funciones útiles para la UI
- `acciones_disponibles(tabla, id)`: botones.
- `te_toca()`: bandeja de la persona.
- `seguimiento_items(proyecto)`: avance sin montos.
- `saldo_item(item)`: cuánto falta comprar.
- `ruc_valido(ruc)`: módulo 11.
- Todas las `ac_*`: ver `0003_acciones.sql`.
