-- INROCOMPRAS · datos base (catálogos reales del AppSheet; nada de personas ni montos reales)

insert into public.empresas (id, razon_social) values
  ('INROPRIN', 'INROPRIN'), ('INROPLAS', 'INROPLAS'), ('CONSORCIO-PUCP', 'Consorcio Inroprin–PUCP'), ('COOTEQ', 'Cooteq')
on conflict do nothing;

insert into public.monedas (id, nombre, tasa_a_soles) values
  ('PEN', 'Soles', 1), ('USD', 'Dólares', 3.75), ('EUR', 'Euros', 4.05), ('GBP', 'Libras', 4.75)   -- tasas de ejemplo: Finanzas las actualiza
on conflict do nothing;

-- Reglas_Aprobacion (Listas.xlsx): < S/ 5,000 aprobación única; ≥ S/ 5,000 conjunta (GOP + GAF en paralelo).
insert into public.reglas_aprobacion (tipo_compra, monto_desde, monto_hasta, ruta) values
  ('Todos', 0, 5000, 'Aprobación Única'),
  ('Todos', 5000, null, 'Aprobación Conjunta');

insert into public.conceptos (id, ambito) values
  ('Administrativo','OC'), ('Activos fijos','OC'), ('Materia prima','OC'), ('Mercadería','OC'), ('Servicios','OC'),
  ('Suministros','OC'), ('Equipamiento de proyecto','OC'), ('Mobiliario de proyecto','OC'), ('Muestras','OC'),
  ('Transporte','OC'), ('Importación','OC')
on conflict do nothing;
-- (El AppSheet tiene 43 conceptos de OC: cargar la lista completa desde la hoja Conceptos al migrar.)

insert into public.conceptos_gasto_imp (concepto, entra_costo, reparto, orden) values
  ('Flete internacional', true, 'Valor', 1), ('Seguro', true, 'Valor', 2), ('Agente de aduanas', true, 'Valor', 3),
  ('Almacén / terminal', true, 'Valor', 4), ('Transporte local', true, 'Valor', 5), ('Service fee plataforma', true, 'Valor', 6),
  ('Derechos (ad valorem)', true, 'Producto', 7), ('Percepción IGV', false, 'Valor', 8), ('IGV importación', false, 'Valor', 9),
  ('Multa / gasto posterior', true, 'Valor', 10)
on conflict do nothing;
insert into public.conceptos (id, ambito) select concepto, 'Gasto' from public.conceptos_gasto_imp on conflict do nothing;

insert into public.config (clave, valor, nota) values
  ('dominio_permitido', '"inroprin.com"', 'Solo cuentas de este dominio entran'),
  ('area_emisora_rq', '"Planeamiento"', 'Área que emite los requerimientos creados desde solicitudes'),
  ('exigir_validacion_tecnica', 'true', 'C-16: no se emite la OC si un ítem no tiene validación técnica'),
  ('exigir_evaluacion_fin', 'true', 'No se envía la OC si Finanzas no aprobó al proveedor'),
  ('retencion_tasa', '0.03', 'Retención IGV'),
  ('retencion_umbral_soles', '700', 'Monto desde el que aplica la retención'),
  ('dias_alerta_plan', '7', 'Semáforo ámbar del plan de compras'),
  ('dias_requerimiento_quieto', '3', 'Bandeja: requerimiento con saldo sin movimiento'),
  ('lector_documentos', '{"proveedor":"gemini","activo":true}', 'Lector de cotizaciones y facturas')
on conflict (clave) do nothing;
