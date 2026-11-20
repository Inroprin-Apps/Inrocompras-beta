-- INROCOMPRAS · 0010 · Solicitudes y requerimientos: huecos encontrados al construir las pantallas (Hito 1)
-- Cada corrección dice qué pasaba. Prueba: supabase/tests/solicitudes.test.mjs

-- 1) Autoliberación. En una solicitud Administrativa el solicitante elige el jefe (jefe_id es columna editable):
--    podía ponerse a sí mismo y liberar su propia solicitud. Quien hizo la solicitud nunca es su aprobador
--    (en una de proyecto tampoco: si es aprobador de la etapa, la libera otro aprobador de la etapa).
--    Afecta también a la anulación (sus aprobadores salen de aquí si la causa no es «Error de emisión»).
create or replace function app.aprobadores_solicitud(p_id uuid) returns uuid[] language sql stable security definer set search_path = public as $$
  -- [_Aprobadores] = IFS(AND(Tipo="Proyecto", ISNOTBLANK(Etapa_Ref)), Etapa_Ref.Aprobadores, TRUE, LIST(Jefe_Email)), sin el solicitante
  select array_remove(
           case when s.tipo = 'Proyecto' and s.etapa_id is not null
                then array_remove((select aprobadores from public.proyecto_etapas where id = s.etapa_id), null)
                else array_remove(array[s.jefe_id], null) end,
           s.solicitante_id)
  from public.solicitudes s where s.id = p_id
$$;

-- 2) Emitir: la etapa debía ser del proyecto elegido (con etapa_id de OTRO proyecto la liberaban los aprobadores
--    de esa otra etapa) y el proyecto, ganado. Los mensajes dicen qué hacer.
create or replace function app.p_solicitud_emitir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.solicitante_id <> auth.uid() then 'Solo quien hizo la solicitud puede emitirla.'
    when s.estado <> 'Borrador' then 'La solicitud ya no está en borrador.'
    when s.tipo = 'Proyecto' and s.etapa_id is null then 'Elige la etapa del proyecto: sus aprobadores la liberan.'
    when s.tipo = 'Proyecto' and not exists (select 1 from public.proyecto_etapas e where e.id = s.etapa_id and e.proyecto_id = s.proyecto_id)
      then 'La etapa elegida no es de ese proyecto. Edita la solicitud y elige otra.'
    when s.tipo = 'Proyecto' and coalesce((select estado from public.proyectos where id = s.proyecto_id), '') <> 'Ganado'
      then 'El proyecto no está ganado: solo se hacen solicitudes de proyectos ganados.'
    when s.tipo = 'Administrativa' and s.jefe_id = s.solicitante_id then 'Tú no puedes liberar tu propia solicitud: elige a tu jefe.'
    when not exists (select 1 from public.solicitud_items where solicitud_id = s.id) then 'Agrega al menos un ítem.'
    when coalesce(trim(s.sustento), '') = '' then 'Escribe el sustento.'
    when exists (select 1 from public.carga_items where solicitud_id = s.id and lote_id = s.lote_actual and estado_fila = 'Error')
      then 'Hay filas de la carga con error: corrígelas o descártalas.'
    when cardinality(coalesce(app.aprobadores_solicitud(s.id), '{}')) = 0
      then case when s.tipo = 'Proyecto' then 'La etapa del proyecto no tiene aprobadores (aparte de ti). Pide al gerente del proyecto que agregue uno.'
                else 'Indica a tu jefe: él la libera.' end
  end from public.solicitudes s where s.id = p_id
$$;

-- 3) Carga masiva. Un presupuesto que no era número («S/ 1,200», «abc»), un canal fuera de la lista, una fecha que no
--    era aaaa-mm-dd («15/03/2027») o inexistente («2027-02-31») hacían fallar TODA la carga con un error de Postgres en
--    inglés, sin marcar la fila. Ahora cada una queda en Error con su mensaje y las demás pasan. Además: la moneda del
--    presupuesto (moneda_ppto; PEN si no se indica) y la comprobación de cantidad sin depender del orden del OR.
create or replace function app.a_fecha(p text) returns date language plpgsql immutable as $$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return p::date;
exception when others then return null;
end $$;

create or replace function public.ac_carga_procesar(p_solicitud uuid, p_lote uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); f record; errs text[]; ok int := 0; mal int := 0; d jsonb;
        cant text; ppto text; fecha text; canal text; moneda text; cant_mala boolean;
begin
  perform app.exigir((select case when solicitante_id <> yo then 'Solo quien hizo la solicitud puede cargar ítems.'
                                  when estado not in ('Borrador','Observada') then 'La solicitud no se puede editar.' end
                      from public.solicitudes where id = p_solicitud));
  update public.solicitudes set lote_actual = p_lote, estado_carga = 'Revision' where id = p_solicitud;
  for f in select * from public.carga_items where solicitud_id = p_solicitud and lote_id = p_lote and estado_fila in ('Revision','Error') order by n_fila loop
    d := f.datos; errs := '{}';
    cant := replace(coalesce(trim(d->>'cantidad'), ''), ',', '.');
    ppto := replace(coalesce(trim(d->>'presupuesto_unit'), ''), ',', '.');
    fecha := nullif(trim(coalesce(d->>'plazo_adquisicion', '')), '');
    canal := nullif(trim(coalesce(d->>'canal', '')), '');
    moneda := upper(nullif(trim(coalesce(d->>'moneda_ppto', '')), ''));
    if coalesce(trim(d->>'descripcion'), '') = '' then errs := array_append(errs, 'Falta la descripción'::text); end if;
    cant_mala := case when cant ~ '^[0-9]+(\.[0-9]+)?$' then cant::numeric <= 0 else true end;
    if cant_mala then
      errs := array_append(errs, 'La cantidad debe ser un número mayor que cero'::text); end if;
    if fecha is not null and app.a_fecha(fecha) is null then
      errs := array_append(errs, 'La fecha de Plazo_Adquisicion no es válida: escríbela como dd/mm/aaaa'::text);
    elsif app.a_fecha(fecha) < current_date then
      errs := array_append(errs, 'La fecha de Plazo_Adquisicion ya pasó'::text);                      -- mensaje literal del AppSheet
    end if;
    if coalesce(nullif(d->>'tipo', ''), 'Bienes') not in ('Bienes','Accesorios','Servicio','Muestra') then
      errs := array_append(errs, 'Tipo no válido: usa Bienes, Accesorios, Servicio o Muestra'::text); end if;
    if canal is not null and canal not in ('Nacional','Importación') then
      errs := array_append(errs, 'Canal no válido: usa Nacional o Importación'::text); end if;
    if ppto <> '' and ppto !~ '^[0-9]+(\.[0-9]+)?$' then
      errs := array_append(errs, 'El presupuesto unitario debe ser un número, sin símbolo de moneda'::text); end if;
    if moneda is not null and not exists (select 1 from public.monedas where id = moneda) then
      errs := array_append(errs, 'Moneda no válida: usa PEN, USD o EUR'::text); end if;
    if cardinality(errs) > 0 then
      update public.carga_items set estado_fila = 'Error', errores = errs where id = f.id; mal := mal + 1;
    else
      insert into public.solicitud_items (solicitud_id, n_item, tipo, codigo_cliente, descripcion, detalle, unidad, cantidad,
             referencia_link, plazo_adquisicion, canal, presupuesto_unit, moneda_ppto)
      values (p_solicitud, f.n_fila, coalesce(nullif(d->>'tipo', ''), 'Bienes'), nullif(trim(d->>'codigo_cliente'), ''), trim(d->>'descripcion'),
              nullif(trim(d->>'detalle'), ''), coalesce(nullif(upper(trim(d->>'unidad')), ''), 'UND'), cant::numeric,
              nullif(trim(d->>'referencia_link'), ''), app.a_fecha(fecha), canal, nullif(ppto, '')::numeric,
              case when ppto <> '' then coalesce(moneda, 'PEN') end);
      update public.carga_items set estado_fila = 'Procesado', errores = '{}' where id = f.id; ok := ok + 1;
    end if;
  end loop;
  update public.solicitudes set estado_carga = case when mal = 0 then 'Confirmado' else 'Revision' end where id = p_solicitud;
  return jsonb_build_object('ok', true, 'cargados', ok, 'con_error', mal);
end $$;

-- 4) Anulación de un ítem: no se comprobaba que el ítem fuera de ese requerimiento. Con el requerimiento A (donde la
--    persona puede pedir) y un ítem del requerimiento B, al aprobarse se anulaba el ítem de B con los aprobadores de A.
--    Tampoco se avisaba con palabras de una causa fuera de la lista (fallaba el «check» de la tabla).
create or replace function public.ac_anulacion_solicitar(p_req uuid, p_item uuid, p_causa text, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); n uuid; r public.requerimientos;
begin
  select * into r from public.requerimientos where id = p_req;
  perform app.exigir(case
    when r.id is null then 'No existe el requerimiento.'
    when r.estado = 'Anulado' then 'Ya está anulado.'
    when not (coalesce(app.mi_area() = r.area_emisora, false) or coalesce(app.es_compras(), false)
              or coalesce(yo = (select solicitante_id from public.solicitudes where id = r.solicitud_id), false))
      then 'La pide el área emisora, Compras o quien hizo la solicitud.'
    when p_item is not null and not exists (select 1 from public.requerimiento_items where id = p_item and requerimiento_id = p_req)
      then 'Ese ítem no es de este requerimiento.'
    when p_item is not null and (select anulado from public.requerimiento_items where id = p_item) then 'El ítem ya está anulado.'
    when coalesce(p_causa, '') not in ('Error de emisión','Ya no se necesita','Cambio de especificación','Otro')
      then 'Elige la causa: Error de emisión, Ya no se necesita, Cambio de especificación u Otro.'
    when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo.'
    when exists (select 1 from public.anulaciones where requerimiento_id = p_req and coalesce(item_id::text,'') = coalesce(p_item::text,'') and estado = 'Pendiente')
      then 'Ya hay una anulación pendiente.' end);
  insert into public.anulaciones (requerimiento_id, item_id, causa, motivo, solicitado_por) values (p_req, p_item, p_causa, p_motivo, yo) returning id into n;
  perform app.log('anulaciones', n, 'solicitar', null, 'Pendiente', p_motivo);
  perform app.notificar(app.aprobadores_anulacion(n), 'Anulación por aprobar: ' || coalesce(r.numero, 'requerimiento'), p_motivo, 'anulaciones', n);
  return jsonb_build_object('ok', true, 'id', n);
end $$;

revoke all on function app.a_fecha(text) from public, anon;
