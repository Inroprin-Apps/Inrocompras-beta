# 02 · Roles y permisos

El AppSheet decide con **dos datos de la persona**, y aquí se mantiene igual:

1. **Área** (`usuarios.area`, en el AppSheet `[_MiArea]`): Compras, Importaciones, Finanzas, Contabilidad, Control de Gestión, Gerencia, Planeamiento, Comercial, Técnica, Costos, Proyectos, Administración, Almacén.
2. **Roles de aprobación** (`usuario_roles.rol`, en el AppSheet `[_MisRoles]` desde Aprobadores_OC): `CONTROL_GESTION`, `GOP`, `GAF`, `JEFE_COMPRAS_N`, `JEFE_COMPRAS_I`, `LIDER_COMPRAS`, `FINANZAS`, `CONTABILIDAD`, `TECNICA`, `ADMIN`.

Además, para las solicitudes cuentan **ser el solicitante**, ser **aprobador de la etapa del proyecto** o ser el **jefe** del solicitante.

Implementación: funciones `app.mi_area()`, `app.mis_roles()`, `app.tengo_rol()`, `app.es_compras()` y `app.ve_precios()` en `0002_seguridad.sql`.

## Quién ve qué (RLS)

| Datos | Quién los ve |
|---|---|
| Proyectos, solicitudes, requerimientos, ítems, proveedores, catálogos | Toda persona con acceso (como en el AppSheet) |
| Órdenes, líneas, pagos, documentos de OC y desaduanaje, costeo, historial con montos | Solo quien **ve precios**: áreas Compras, Importaciones, Finanzas, Contabilidad, Control de Gestión, Gerencia, Costos y Administración, o cualquier rol de aprobación |
| Técnica, Planeamiento, Almacén, Comercial, solicitantes | El avance **sin montos** con `seguimiento_items()`: qué es, si tiene OC, en qué estado y si está pagado |
| Notificaciones | Solo las propias |
| Cola de trabajos, series, correlativos | Nadie desde la app (solo el servidor) |

## Quién hace qué

La condición sale de la fórmula del AppSheet (columna «Origen»). Las filas con «Mejora» corrigen un hueco del AppSheet (ver `11_MEJORAS_SOBRE_APPSHEET.md`).

### Proyectos y solicitudes
| Acción | Quién | Condición | Origen |
|---|---|---|---|
| Marcar proyecto ganado / perdido | Comercial, Control de Gestión, Gerencia o el gerente del proyecto | Estado «Estudio de mercado» | Marcar como Ganado (Mejora B-01: allá no pedía rol) |
| Crear / editar solicitud e ítems | El solicitante | Borrador u Observada | Edit/Delete Solicitudes |
| Emitir solicitud | El solicitante | Borrador, con ítems y sustento, sin filas de carga en error, y la etapa tiene aprobadores (o hay jefe) | Emitir solicitud |
| Liberar / rechazar | Aprobadores de la etapa (proyecto) o el jefe (administrativa) | Pendiente Liberación | Liberar solicitud, `[_Aprobadores]` |
| Cancelar | El solicitante | Borrador, Pendiente o Liberada, sin requerimiento | Cancelar Solicitud |
| Rehacer desde una rechazada o cancelada | El solicitante | Que aún no se haya rehecho | Generar nueva solicitud |
| Corregir y reenviar | El solicitante | Observada. Vuelve a liberación solo si hay ítems nuevos, más cantidad o cambia una descripción | Completar y reenviar, `[_Requiere_Aprobacion]` |
| Pedirla de vuelta | El solicitante | En Req, con el requerimiento aún En Proceso | Devolver de Req |

### Requerimientos
| Acción | Quién | Condición | Origen |
|---|---|---|---|
| Editar requerimiento e ítems | Área emisora (por defecto Planeamiento) | En Proceso | Edit Requerimientos/Items |
| Emitir | Área emisora | En Proceso, sin número, con empresa, tipo y destino, con ítems y concepto, y sin anulación pendiente | Emitir Requerimiento |
| Observar | Área emisora | En Proceso; la solicitud pasa a Observada | Observar solicitud 2 |
| Anotar RQ del SIDIGE | Planeamiento | No anulado | C-14 (nuevo) |
| Asignar SKU | Planeamiento, Compras, Importaciones | — | C-14/C-22 (nuevo) |
| Validación técnica (marca, modelo) | Técnica (rol `TECNICA` o área Técnica) | Ítem no anulado | C-16 (nuevo) |
| Pedir anulación | Área emisora, Compras o el solicitante | Sin otra pendiente | Anulaciones |
| Aprobar / rechazar anulación | Si la causa es «Error de emisión», el jefe de quien la pidió; si no, los aprobadores de la solicitud | Pendiente | `[_Aprobadores]` de Anulaciones (Mejora B-02: rechazar no pedía rol) |

### Órdenes
| Acción | Quién | Condición | Origen |
|---|---|---|---|
| Crear OC desde el plan | Compras / Importaciones | Ítems de requerimientos emitidos, cantidad ≤ saldo, proveedor extranjero si es importación | Nuevo (reemplaza el Sheet) |
| Editar OC y líneas | Compras / Importaciones | Borrador, En modificación, Observado…, o Pendiente sin ninguna firma | Editar OC |
| Agregar demasía | Compras / Importaciones | Línea no demasía, sin otra demasía del mismo ítem, OC editable | ＋ Demasía |
| Emitir | Compras / Importaciones | Borrador, con líneas, monto > 0, cotización subida (o tarjeta), % de adelanto o días de crédito si corresponde, ítems con validación técnica | Emitir OC (+ C-16) |
| Validar presupuesto | `CONTROL_GESTION` | Etapa CG (sin VB de CG, o Ppto «Subsanado») | Validar presupuesto |
| Observar presupuesto | `CONTROL_GESTION` | Etapa CG | Observar presupuesto (CG) |
| Aprobar (GOP) | `GOP` | Etapa GERENCIA, falta aprobación, la GOP no aprobó aún. Aprueba también las demasías pendientes | Aprobar GOP |
| Aprobar sin la demasía | `GOP` | Igual, con demasías pendientes; las rechaza | Aprobar sin demasía |
| Aprobar (GAF) | `GAF` | Etapa GERENCIA, falta aprobación; no si hay demasías y la ruta es única | Aprobar GAF |
| Observar / rechazar (gerencia) | `GOP` o `GAF` | Etapa GERENCIA y no observada | Observar OC / Rechazar OC |
| Reenviar a aprobación | Compras / Importaciones | Estado de aprobación «Observado por …» | Reenviar a aprobación |
| Revocar aprobación | `CONTROL_GESTION`, `GOP` o `GAF` | Aprobada, sin pagos solicitados, y no en Anulada, Anulación solicitada, En modificación, Saldo pendiente u OC pagada | Revocar aprobación |
| Modificar / confirmar modificación | Compras / Importaciones | Aprobada y no anulada ni pagada | Modificar OC / Confirmar |
| Pedir anulación | Compras / Importaciones | Emitida, nada pagado, y no en modificación ni con saldo pendiente | Solicitar anulación (Comprador) |
| Aprobar / rechazar anulación | `JEFE_COMPRAS_N` (nacional) o `JEFE_COMPRAS_I` (importación) | Anulación solicitada | `[_Rol_Jefe]` (Mejora B-03) |
| Anular directo | `GOP` o `GAF` | Emitida, nada pagado | Anular OC (Gerencia) |
| Descartar borrador | Compras / Importaciones | Borrador | Borrar borrador (Mejora B-01) |
| Enviar al proveedor | Compras / Importaciones | Aprobada, no anulada, y proveedor aprobado por Finanzas | Enviar al proveedor (+ decisión 18/11) |
| Observar / levantar (Finanzas) | Área Finanzas | Pago pendiente, Adelanto pendiente, Crédito o Legajo incompleto | Observar OC / Subsanar OC |
| Cerrar OC | Compras, Finanzas o Contabilidad | OC pagada, con factura en el legajo | Nuevo |

### Pagos, proveedores y desaduanaje
| Acción | Quién | Condición | Origen |
|---|---|---|---|
| Solicitar pago | Compras / Importaciones | Cuota en Plan y OC aprobada. Sin factura que calce, pide un sustento (salvo adelanto o caja chica) | Solicitar pago 2 |
| (automático) Solicitar al subir la factura | — | Factura con monto que calza ±1 con una cuota en Plan | `_Solicitar_Auto` |
| Programar | Área Finanzas | Solicitado | Programar pago |
| Marcar pagado | Finanzas | Programado; pide el N° de operación | Pagado (Mejora B-06: allá no pedía rol) |
| Observar cuota / subsanar | Finanzas observa, Compras subsana | — | Estado «Observado Finanzas» |
| Dividir cuota (entrega parcial) | Compras / Importaciones | Plan | New step Action - 5 |
| Evaluación financiera del proveedor | Finanzas | — | Decisión 18/11 (nuevo) |
| Verificar retención | `CONTABILIDAD` | Proveedor nacional, no verificado | Verificar Retención |
| Crear desaduanaje | Compras / Importaciones | OC de importación aprobada | Nuevo desaduanaje |
| Avanzar el ciclo (docs, DAM, llegada, levante, almacén) | Compras / Importaciones | Paso anterior cumplido y checklist completo | Acciones de Desaduanajes (Mejora B-07) |
| Registrar gastos | Importaciones, Compras o Contabilidad | Costeo no cerrado | Edit Des_Gastos |
| Cerrar costeo | Compras / Importaciones | En almacén | Cierre (versión +1) |
| Reabrir costeo | `JEFE_COMPRAS_I` o administrador | Costeo cerrado, con motivo | Motivo_Reapertura (C-02) |
| Corregir cualquier estado | `ADMIN` | Siempre con motivo; queda en el historial | Pedido del jefe de área (06/11) |

## Menú por perfil (sugerido para la UI)
| Perfil | Menú |
|---|---|
| Solicitante (cualquier área) | Te toca · Mis solicitudes · Seguimiento |
| Planeamiento | Te toca · Requerimientos · Plan de compras · Seguimiento |
| Técnica | Te toca · Validaciones · Seguimiento |
| Compras / Importaciones | Te toca · Plan de compras · Órdenes · Proveedores · Pagos (solo lectura) · Embarques (si ve importación) |
| Control de Gestión, GOP, GAF | Te toca · Órdenes · Cuadro de aprobaciones · Proyectos |
| Finanzas | Te toca · Pagos · Proveedores · Órdenes |
| Contabilidad | Te toca · Proveedores · Desaduanaje y gastos · Órdenes |
| Administrador | Todo + Equipo (áreas y roles) + Configuración |

El menú es comodidad, no seguridad: la seguridad la ponen RLS y las funciones.
