# 03 · Estados

Los nombres son los del AppSheet. Las flechas son funciones `ac_*` (ver `02_ROLES_Y_PERMISOS.md`); lo marcado como (auto) lo hace la base sola.

## Solicitud
```
Borrador ──emitir──▶ Pendiente Liberación ──liberar──▶ Liberada ──(auto: crea requerimiento)──▶ En Req
   │                        │                                                                  │
   │                        └──rechazar──▶ Rechazada ──rehacer──▶ (nueva en Borrador)          │
   └──cancelar──▶ Cancelada (también desde Pendiente o Liberada, si no hay requerimiento)      │
En Req ──pedir de vuelta / observación del área emisora──▶ Observada ──corregir y reenviar──▶ Pendiente Liberación  o  En Req
```

## Requerimiento
`En Proceso ──emitir──▶ Emitido` · `En Proceso ──observar──▶ Observado` (la solicitud pasa a Observada) · anulación aprobada → `Anulado`

Ítem: `validacion_tecnica` Pendiente → Validado / Observado / No aplica. Si se anula un ítem, `anulado = true`.

## Orden: dos ejes
**Estado de aprobación** (calculado, `[Estado de Aprobación3]`):
- `Observado por Ppto|GOP|GAF…` si alguna firma está observada.
- `Rechazado` si CG puso «Anular OC» o una gerencia rechazó.
- `Aprobado para Compra` si el Ppto es «Pre Aprobado»; si la ruta es **única** y firmó la GOP o la GAF; si es **conjunta** y firmaron las dos.
- `Falta Aprobación` en los demás casos.

**Ruta** (`[Tipo de aprobación]`):
- «Pre Aprobado» si CG lo marca así.
- **Conjunta** si el presupuesto es «No presupuestado» o «Excede Presupuesto».
- En los demás casos, según `reglas_aprobacion` por monto en soles: menos de S/ 5,000 es única; S/ 5,000 o más, conjunta.

**Etapa** (`[_Etapa]`), solo mientras el estatus es «Pendiente de aprobación»: `CG` si no hay VB de CG o el Ppto está «Subsanado»; si no, `GERENCIA`.

**Estatus Compra:**
```
Borrador ──emitir──▶ Pendiente de aprobación ──CG valida──▶ (GERENCIA) ──aprueba──▶ Legajo incompleto
     │                    │  ▲                                                          │
     │                    │  └──reenviar── Observado por … ◀──observar (CG/GOP/GAF)─────┤
     │                    └──rechazar──▶ Anulada                                        │
     └──descartar──▶ Anulada                                                            ▼
Legajo incompleto ──(auto: hay una cuota solicitada)──▶ Pago pendiente | Adelanto pendiente | Crédito | Crédito letra | Tarjeta de crédito | Caja chica
   ──(auto: pagado parcial)──▶ Saldo pendiente ──(auto: pagado total)──▶ OC pagada ──cerrar──▶ OC cerrada
Laterales:
   Aprobada ──modificar──▶ En modificación ──confirmar──▶ estado previo  |  Pendiente de aprobación (si sube el monto o cambian la moneda o la forma de pago)
   Emitida ──pedir anulación──▶ Anulación solicitada ──jefatura──▶ Anulada | estado previo
   Emitida ──GOP/GAF──▶ Anulada
   Pago pendiente… ──Finanzas observa──▶ Observado por Finanzas ──Finanzas levanta──▶ estado previo
   Aprobada ──revocar (CG/GOP/GAF)──▶ Observado por …
```
Al aprobarse por primera vez (auto): se generan las cuotas, se encola el PDF para el proveedor y se avisa al comprador.

## Cuota de pago
`Plan ──solicitar (o auto al subir la factura)──▶ Solicitado ──programar──▶ Programado ──pagado──▶ Pagado`
`Solicitado|Programado ──Finanzas observa──▶ Observado Finanzas ──Compras subsana──▶ Solicitado`
Si la OC se anula, sus cuotas no pagadas pasan a `Anulado`. Si cambian las condiciones de pago, las cuotas en Plan se anulan con el comentario «Reemplazada por cambio de condiciones de pago» y se generan otras nuevas.

Cuotas según la forma de pago:

| Forma de pago | Cuotas |
|---|---|
| Contado / Contra entrega / Tarjeta | 1 cuota «Pago total» |
| Adelanto | «Adelanto» (pct %, a la aprobación) + «Saldo» (contra el hito: BL, fotos, entrega) |
| Crédito / Letra | 1 cuota con los días de crédito. La fecha límite se calcula desde la fecha de la factura |
| Caja chica | 1 cuota «Caja chica» |

## Desaduanaje
`Borrador ──(checklist completo)──▶ Documentos completos ──N° DAM──▶ DAM numerada ──▶ Llegada ──▶ Levante ──▶ En almacén ──cerrar costeo──▶ Costeo cerrado ──reabrir (motivo)──▶ En almacén`
- El tipo de cambio de costeo se **congela al numerar la DAM** (decisión 19/11).
- Cada cierre guarda una versión en `des_costeo_hist`.

## Proveedor
`evaluacion_fin`: Pendiente → Aprobado / Observado (Finanzas). `verificado_contab`: false → true (Contabilidad).
