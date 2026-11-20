# Importaciones (COMEX) en el SIDIGE — 06/11/2026
Fuente: configuración de INROPRIN en [servidor SIDIGE] (CFGDOC00, EVENTO, CAMPOS) y uso real de INROPLAS como referencia. Solo lectura.
La app de Roberto (servidor [servidor de apps]) NO tiene módulo de importaciones: `m04.procimp` es "proceso de impresión" (PDF de OCN, OCE, OCS, cotizaciones).

## Documentos de la cadena
| Documento | Qué es | Notas |
|---|---|---|
| RQE | Requerimiento de compra exterior | Aprobaciones: jefatura, jefe de logística, gerencia general. En la práctica se usa el RQ común. |
| **OCE** | **Purchase Order** | Aprobación por niveles OCESAC1…OCESAC (5), igual que la OCN. Estados: tránsito, en almacén, por numerar, file, facturado. |
| **FIL** | **File de importación** (embarque) | Seguimiento logístico por eventos (ver abajo). Sus líneas vienen de la OCE. |
| OSP | Orden de servicio de importación | Configurado, sin uso. |
| PLZ | Póliza de seguro de importación | Configurado, sin uso. |
| **DUA / DAM** | Declaración aduanera | Campos: N.° DUA, canal, aduana (118 Callao), régimen (10 importación), Incoterm; líneas de gasto como artículos (Valor CIF = GI0012, THC = GI0020). Pago por Telecrédito/Telebanking. |
| DPCI / DPGI | Documento de costo / gasto de importación | Costeo (landed cost); se enlaza al comprobante del proveedor (CP). |
| NIA / NSA | Nota de ingreso / salida de aduana | Configurado; con evaluación del proveedor (puntualidad, precio, calidad, SGC). |

Cadena real observada (INROPLAS): **RQ → OCE → FIL** (enlace línea a línea) · DUA y DPGI se registran aparte · el ingreso a almacén se hace con NIN.
Volumen INROPLAS: 134 OCE, 76 files, 56 DUA, 9 DPGI.

## Hitos del File de importación (eventos FIL)
1. FIL01SACK Acuse de recibo del proveedor
2. FIL02SFAB Despacho de fábrica
3. FIL03SEMB Embarcador
4. FIL04SDAE / FIL05SDMA / FIL06SDTE Despacho a Lima aéreo / marítimo / terrestre (ETD)
5. FIL07SAPE Arribo a Perú (ETA)
6. FIL08SDEA Documentos entregados a la agencia de aduanas
7. FIL09SANP Numeración (aduana)
8. FIL10SALV Levante (aduana)
9. FIL11SRME Retiro de mercadería
Otros: FILFC invoice, FILIN ingreso, FILEC estatus de carga, FILOL operador logístico, FILTP tiempo de producción, FILTC tipo de carga, FIL12COM comentario.

## Campos que ve el usuario
- **OCE (Purchase Order)**: Supplier (PRO o PROI), Purchaser, P. Method (condición de pago), Incoterm, Currency (ME por defecto), Ship Date, Ship To, Puerto, Puerto destino, Cotización, Days, Glosa, Aprob.2; detalle Part N., Quantity, PriceUOM, UOM, Detalle.
- **FIL**: Supplier, Embarcador, Incoterm, Currency, Packing, Ship To, Status de carga, Puerto cercano, Naviera, Operador logístico, Cod. proyecto; detalle con cantidad, precio, peso y dimensiones (largo, ancho, profundidad).
- **DUA**: N.° DUA, fecha de emisión, canal, aduana, régimen, Incoterm, condición de pago, centro de costo, proveedor (SUNAT); detalle de gastos (CIF, THC…).
