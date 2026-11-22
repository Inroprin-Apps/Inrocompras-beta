-- 0072 · La numeración y las carpetas de Drive como las usa hoy la empresa (docs/13 §1.1 y §1.2).
-- INROCONTA reconoce cada OC por su número y por el nombre de su carpeta en Drive; si INROCOMPRAS numerara o
-- nombrara distinto, desde el arranque INROCONTA dejaría de unir facturas, legajos y centros de costo.
--   · Nacionales: NNNN-AAAA (4 dígitos). OC y OS (servicios) COMPARTEN el correlativo.
--   · Importaciones: NNN-AAAA (3 dígitos), correlativo aparte.
--   · INROPRIN numera así, sin prefijo. Las demás empresas llevan su código delante («INROPLAS 0001-2027») mientras
--     no se confirme cómo numeran (el número de OC es único en toda la base).
-- Además, cada proyecto recuerda su carpeta de Drive («NN) PROYECTO»): la busca la cola la primera vez (o se fija a
-- mano para enlazar un proyecto con su carpeta de siempre) y no se vuelve a buscar.

create or replace function app.numero_oc(p_empresa text, p_procedencia text) returns text language plpgsql security definer set search_path = public as $$
declare anio int := extract(year from (now() at time zone 'America/Lima'))::int;
        serie text := case when p_procedencia = 'Importación' then 'IMP' else 'NAC' end;   -- SRV comparte con NAC
        digitos int := case when p_procedencia = 'Importación' then 3 else 4 end;
        n int := app.siguiente(p_empresa, serie, anio);
        num text := case when length(n::text) >= digitos then n::text else lpad(n::text, digitos, '0') end;
begin
  return case when p_empresa = 'INROPRIN' then '' else p_empresa || ' ' end || num || '-' || anio;
end $$;

create or replace function public.ac_oc_emitir(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_emitir(p_id));
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set estatus = 'Pendiente de aprobación', fecha_emision = now(), emitido_por = yo,
         numero = coalesce(numero, app.numero_oc(o.empresa_id, o.procedencia))                          -- reservar_oc (0072)
   where id = p_id returning * into o;
  perform app.oc_recalcular(p_id);
  perform app.log('ordenes', p_id, 'emitir', 'Borrador', 'Pendiente de aprobación');
  perform app.encolar('crear_carpeta', 'ordenes', p_id);
  perform app.encolar('pdf_oc', 'ordenes', p_id, '{"version":"interna"}');
  perform app.notificar(app.usuarios_con_rol('CONTROL_GESTION'), 'Orden por validar presupuesto: ' || o.numero, null, 'ordenes', p_id);
  return jsonb_build_object('ok', true, 'numero', o.numero);
end $$;

alter table public.proyectos add column if not exists carpeta_drive_id text;
comment on column public.proyectos.carpeta_drive_id is 'Carpeta «NN) PROYECTO» en Drive donde van las carpetas de sus OC. La llena la cola; se puede fijar a mano.';
