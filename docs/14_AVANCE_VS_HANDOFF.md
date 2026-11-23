# 14 · Lo que se agregó respecto del handoff (al 23/11/2026)

## Qué traía el handoff

- **Base de datos:** 4 migraciones (`0001` esquema, `0002` seguridad, `0003` acciones, `0004` ajustes de Supabase) y el
  `seed`.
- **Documentación:** docs `01` a `11` (alcance, roles, estados, modelo de datos, plan de trabajo, criterios, mejoras sobre
  el AppSheet) y las referencias (extracción del AppSheet v2, prototipo v3, flujo).
- **La guía de diseño** y código de ejemplo de las integraciones.
- **Ninguna pantalla:** la app no existía.

## Datos (base de datos): 20 migraciones nuevas, de la `0005` a la `0074`

Casi todo lo nuevo son reglas, no tablas: el modelo del handoff era bueno y se respetó.

### Seguridad y permisos (`0005`–`0008`, `0060`)

- El equipo (área, jefe y roles) solo se cambia con una acción que deja historial; antes los roles se podían escribir
  directo.
- Se cerraron 4 huecos donde un dato vacío terminaba en «permitido» (por ejemplo, cualquier persona podía liberar una
  solicitud si la etapa tenía un aprobador sin elegir).
- Los permisos quedaron como los deja Supabase: antes cualquiera podía marcar una cuota como pagada sin iniciar sesión.
- La carga Excel ya no se puede saltar la validación.

### Reglas que faltaban al construir cada pantalla

- **Solicitudes (`0010`):** nadie libera su propia solicitud (desde `0074`, la excepción es el ADMIN).
- **Proveedores (`0020`):** evaluar, verificar retención y pedir evaluación, con historial.
- **Cola de trabajos (`0021`):** reintentos, sin que dos corridas tomen el mismo trabajo, y errores visibles.
- **Configuración (`0022`):** tasas y tipos de cambio que no pueden ser cero.
- **InroPay (`0023`):** su aviso solo mueve pagos que existen y por pasos válidos.
- **Órdenes y plan (`0030`):** recalcular montos y ruta de aprobación; plan de compras por proyecto, sin montos para quien
  no ve precios.
- **Cuadro de aprobaciones (`0040`):** las columnas exactas del AppSheet (2 por confirmar, D-05).
- **Desaduanaje (`0050`, `0062`):** costeo y gastos corregidos; aparece en «Te toca».
- **Pagos (`0061`):** 5 correcciones (fechas pasadas, voucher de otra orden, números de cuota repetidos…).

### Lo que agregaron los bots del AppSheet (`0070`–`0074`)

- Aviso de solicitud cancelada.
- Avisos a Google Chat, configurables (`chat_avisos`).
- Recordatorio diario de facturas a las 8:00 (`recordatorio_facturas_dias`).
- Una factura por el total de la OC cubre todas sus cuotas.
- El área que emite el requerimiento sale de la solicitud (Administración, Compras o Planeamiento).
- Empresas con RUC validado; una OC de una empresa sin RUC no se emite.
- La numeración de Compras (`0001-2027` nacional, `001-2027` importación) y las carpetas de Drive que lee INROCONTA.
- Dirección y cuenta de detracción del proveedor, y el pie de la OC como parámetro (`oc_pie`).

**Datos reales cargados** (solo en Supabase, nunca en el repo): las 5 empresas del grupo con su RUC; faltan 2
direcciones.

## Flujo: qué cambió respecto del handoff

La secuencia es la del AppSheet de Geanfranco (jefe de Compras Nacionales y COMEX). Cambió esto:

| Paso            | Antes (handoff)                           | Ahora                                                                                              |
| --------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Solicitud       | El solicitante podía liberarse a sí mismo | Nadie libera la suya (salvo el ADMIN); aviso al cancelar                                           |
| Requerimiento   | Siempre lo emitía Planeamiento            | Administración, Compras o Planeamiento según el caso (D-01 resuelta), con red para que no se trabe |
| OC              | Número `INROPRIN-NAC-2026-0001`           | `0001-2027` como Compras; exige empresa con RUC; correo del proveedor al aprobar                   |
| PDF de la OC    | Formato simple                            | El formato que hoy recibe el proveedor                                                             |
| Legajo en Drive | Carpetas propias                          | La convención de Compras que lee INROCONTA; primero en una carpeta de prueba                       |
| Pagos           | Factura = una cuota del mismo monto       | Factura por el total cubre todas; recordatorio de facturas; aviso a Finanzas en Chat               |
| Desaduanaje     | No aparecía en «Te toca»                  | Aparece                                                                                            |

## La app (todo nuevo)

- 15 pantallas con la guía de diseño: Te toca, Solicitudes (con carga Excel), Requerimientos, Validaciones,
  Seguimiento, Proyectos, Plan de compras, Órdenes, Cuadro de aprobaciones, Proveedores, Pagos, Desaduanaje, Equipo,
  Configuración (con Empresas) y Login con Google.
- Exportar Excel en las listas, Deshacer al borrar, ficha lateral, aviso de cambios sin guardar y cola de trabajos
  (Drive, PDF, correo, lector de PDF, InroPay, Chat).
- Publicada en Vercel.
- Pruebas: 122 de dominio, unas 175 de reglas y 16 en navegador; todas pasan.

## Lo que falta

Detalle en `docs/12_PARIDAD_APPSHEET.md` y `docs/13_INTEGRACION_INROCONTA.md`:

- El código del Apps Script.
- El PDF de la solicitud y del requerimiento.
- La numeración de las otras empresas.
- La revisión de los 13 bots de aviso.
- La configuración de Sistemas en Vercel (clave del servidor, Drive, correo, espacios de Chat).
- Que INROCONTA lea las OC de INROCOMPRAS.
- La prueba con Compras en diciembre.
