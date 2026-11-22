# 13 · INROCOMPRAS e INROCONTA: qué se cruzan y qué hay que cuidar

INROCONTA (la app de Contabilidad) reúne lo que SUNAT, Drive, Almacén y CONCAR dicen de cada comprobante y de
cada OC. Fuente: «INROCONTA — Objetivo y funcionalidades» (11/11/2026) y su código (repo Inroprin-Apps/Inroconta).
Las dos apps viven en Supabase y entran con la cuenta Google @inroprin.com.

## 1. Riesgos para el arranque (01/01/2027)

### 1.1 INROCONTA lee las carpetas de OC de Drive por su NOMBRE

Su robot `carpetas-oc` recorre la carpeta madre de compras nacionales y la de importaciones, y por el nombre de cada
carpeta sabe qué OC es, de qué proveedor y de qué proyecto (`src/shared/lib/drive/carpetas-oc.ts`). Con eso une cada
factura de SUNAT con su OC, arma el legajo, pone el centro de costo y lista las facturas sin OC.

Hoy Compras las nombra así:

```
5. Ordenes de Compra /
  01) PROYECTO EJEMPLO /                                    ← proyecto
    OC 2026 - 0200 PROVEEDOR EJEMPLO S.A.C. - PROYECTO EJEMPLO / ← OC: año, número, proveedor, proyecto
    OS 0911 -2026 SERVICIOS DE PRUEBA E.I.R.L. - PROYECTO EJEMPLO /
```

El diseño original de INROCOMPRAS (docs/07 §2, `src/modules/integraciones/domain/carpetas.ts`) crea otra cosa:
`AAAA / INROPRIN-NAC / INROPRIN-NAC-2026-0001 – Proveedor / 001 Requerimiento …`. **Si sale así, desde el primer día
INROCONTA deja de reconocer las OC nuevas**: no une facturas, no arma legajos, no pone centro de costo.

**Decidido y aplicado (0072):** INROCOMPRAS crea las carpetas con la convención actual (la que reconoce
`carpetaDeOC`): `<madre> / NN) PROYECTO / OC AAAA - NNNN PROVEEDOR - PROYECTO` (OS para servicios; la carpeta madre de
importaciones para importaciones). Las subcarpetas de dentro pueden quedarse: INROCONTA recorre todo el árbol y
clasifica cada archivo por su nombre o su contenido.

### 1.2 La numeración de las OC

Lo que usa la empresa (y entiende INROCONTA, `parseOc`):

- **Nacionales:** `NNNN-AAAA` (4 dígitos), **OC y OS comparten** el correlativo (OS 1477-2026 y OC 1483-2026 son de la
  misma semana).
- **Importaciones:** `NNN-AAAA` (3 dígitos), correlativo aparte.
- El registro de compras de Control de Gestión trae todas las empresas del grupo; INROCONTA solo toma INROPRIN.

INROCOMPRAS numera hoy `INROPRIN-NAC-2026-0001`. **Decidido y aplicado (0072):** el formato de la empresa desde el
arranque (`0001-2027` nacional, `001-2027` importación). Falta saber si INROPLAS, los consorcios y COOTEQ llevan su
propio correlativo.

### 1.3 Las hojas que INROCONTA lee y que INROCOMPRAS reemplaza

INROCONTA copia dos veces al día una hoja privada de Google Sheets con **Compras, COMEX (DUAs) y el kardex**, y lee el
**registro de compras de CG** y el **cuadro de aprobaciones**. INROCOMPRAS reemplaza el AppSheet y las hojas de OC: si
Compras deja de llenarlas, INROCONTA se queda sin OC nuevas.

**Decisión propuesta:** que INROCONTA lea las OC de INROCOMPRAS (una vista o API de solo lectura con token de servidor,
como su `/api/apps`) en vez de las hojas. Mientras tanto, el cuadro de aprobaciones de INROCOMPRAS ya se exporta con las
mismas columnas.

## 2. Lo que se duplicaría

- **Costeo de importaciones por DUA.** INROCONTA lo tiene como «crecimiento previsto» (el _file_ de una o varias OC, con
  reparto por peso o valor). INROCOMPRAS ya lo tiene, heredado del AppSheet (Desaduanaje: gastos, reparto, FI,
  versiones). **Propuesta:** el costeo operativo vive en INROCOMPRAS (ahí Importaciones registra los gastos) e INROCONTA
  toma el resultado para el kardex valorizado y el costo de venta.
- **Legajo y facturas.** INROCOMPRAS vincula la factura que sube Compras; INROCONTA la que llega de SUNAT. Hay que elegir
  cuál manda o cómo se juntan (ver 3).

## 3. Lo que INROCOMPRAS puede tomar de INROCONTA (más adelante)

- **Consulta RUC / padrón:** razón social, domicilio fiscal, buen contribuyente, agente de retención, estado y condición
  (habido), sujetos sin capacidad operativa. Al registrar un proveedor o una empresa, se llenan solos; antes de enviar
  una OC, aviso si el proveedor no está activo y habido. Hoy Contabilidad marca a mano agente de retención y buen
  contribuyente.
- **Facturas de SUNAT por OC:** el legajo y el recordatorio de facturas podrían mirar lo que ya llegó a SUNAT, sin
  esperar a que Compras suba el PDF.
- **Detracciones:** la cuenta de detracción del proveedor (va en el PDF de la OC) y la constancia de depósito.

## 4. Cómo se valida Drive antes de tocar las carpetas reales

1. Sistemas crea una carpeta de **prueba** y la comparte con la cuenta de servicio como **Editor**.
2. En Vercel: `GOOGLE_SERVICE_ACCOUNT_JSON` y `DRIVE_RAIZ_NACIONAL_ID` / `DRIVE_RAIZ_IMPORTACION_ID` (o
   `DRIVE_CARPETA_RAIZ_ID` para las dos) con el id de esa carpeta.
3. Se emiten órdenes de prueba y se revisa que aparezcan `NN) PROYECTO / OC AAAA - NNNN PROVEEDOR - PROYECTO` con sus
   subcarpetas, el PDF y los documentos subidos, cada uno en su lugar. Si se quiere, se corre el robot de INROCONTA
   sobre esa carpeta para confirmar que reconoce cada OC.
4. Recién entonces se cambian las variables a las carpetas madre reales. El código no cambia.
