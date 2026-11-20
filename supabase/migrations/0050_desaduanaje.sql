-- INROCOMPRAS · 0050 · Desaduanaje y costeo: huecos encontrados al construir las pantallas (Hito 6)
-- Cada corrección dice qué pasaba. Prueba: supabase/tests/desaduanaje.test.mjs
--
-- 1) des_gastos.entra_costo es NOT NULL sin valor por defecto y nadie lo llenaba: en el AppSheet salía del concepto
--    ([Concepto].[Entra_Costo], Reset_If TRUE). Ahora lo pone la base desde conceptos_gasto_imp en cada alta o cambio
--    de concepto, y la pantalla no puede mandar otro valor.
-- 2) Con el costeo cerrado, la política de des_gastos rechazaba el alta con «new row violates row-level security»,
--    que la app traduce como «No tienes permiso». Ahora el alta y el cambio dicen qué pasa y qué hacer.
--    También se validan el monto (> 0; la nota de crédito va en positivo y la resta el costeo) y el TC (> 0; en soles, 1).
-- 3) La política de des_gastos exigía registrado_por = auth.uid() también al EDITAR: Contabilidad no podía corregir un
--    gasto que registró Importaciones (y sí podía borrarlo). En el AppSheet Edit solo pedía «costeo no cerrado».
--    Se separa en alta (quien registra es quien firma), edición y borrado; registrado_por y fecha_registro no cambian.
-- 4) des_productos no tenía app.proteger: con un UPDATE directo se podían cambiar el precio EXW, la cantidad o el costo
--    calculado (exw_s, costo_unit_s…). Ahora solo se editan ad valorem, cantidad recibida, incidencia, muestra y comentario;
--    lo demás lo escriben ac_des_crear y el cálculo del costeo.
-- 5) Los check del checklist (chk_*) se podían marcar o desmarcar en cualquier estado. En el AppSheet eran
--    Editable_If [Estado] = "Borrador": después de «Documentos completos» el checklist ya no se toca.

-- ───────────────────────── 1 y 2) Gastos: concepto, monto, TC y costeo cerrado ─────────────────────────
create or replace function app.des_gasto_antes() returns trigger language plpgsql security definer set search_path = public as $$
declare est text; ec boolean;
begin
  select estado into est from public.desaduanajes where id = new.desaduanaje_id;
  if est is null then raise exception 'El desaduanaje no existe.' using errcode = 'P0001'; end if;
  if est = 'Costeo cerrado' then
    raise exception 'El costeo está cerrado: ya no se agregan ni cambian gastos. Pide a la jefatura de Importaciones que lo reabra con motivo.'
      using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.desaduanaje_id is distinct from old.desaduanaje_id then
    raise exception 'Un gasto no se mueve a otro desaduanaje: bórralo y regístralo allá.' using errcode = 'P0001';
  end if;
  select entra_costo into ec from public.conceptos_gasto_imp where concepto = new.concepto;
  if ec is null then raise exception 'Elige un concepto de gasto de la lista.' using errcode = 'P0001'; end if;
  new.entra_costo := ec;
  if new.monto_sin_igv is null or new.monto_sin_igv <= 0 then
    raise exception 'Escribe el monto sin IGV, mayor que cero (una nota de crédito también va en positivo: el costeo la resta).'
      using errcode = 'P0001';
  end if;
  if new.moneda = 'PEN' then new.tc_costeo := 1; end if;
  if new.tc_costeo is null or new.tc_costeo <= 0 then
    raise exception 'El tipo de cambio de costeo debe ser mayor que cero.' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    new.registrado_por := old.registrado_por;
    new.fecha_registro := old.fecha_registro;
  end if;
  return new;
end $$;

drop trigger if exists des_gasto_antes on public.des_gastos;
create trigger des_gasto_antes before insert or update on public.des_gastos for each row execute function app.des_gasto_antes();

-- ───────────────────────── 3) Políticas de des_gastos ─────────────────────────
drop policy if exists escribir on public.des_gastos;
drop policy if exists registrar on public.des_gastos;
drop policy if exists editar on public.des_gastos;
drop policy if exists borrar on public.des_gastos;
create policy registrar on public.des_gastos for insert to authenticated
  with check ((app.es_compras() or app.mi_area() = 'Contabilidad') and registrado_por = auth.uid()
              and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'));
create policy editar on public.des_gastos for update to authenticated
  using ((app.es_compras() or app.mi_area() = 'Contabilidad')
         and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'))
  with check ((app.es_compras() or app.mi_area() = 'Contabilidad')
              and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'));
create policy borrar on public.des_gastos for delete to authenticated
  using ((app.es_compras() or app.mi_area() = 'Contabilidad')
         and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'));

-- ───────────────────────── 4) Productos: qué se edita directo ─────────────────────────
drop trigger if exists proteger on public.des_productos;
create trigger proteger before update on public.des_productos for each row execute function app.proteger(
  'ad_valorem_usd','cant_recibida','incidencia','es_muestra','comentario');
alter table public.des_productos drop constraint if exists des_productos_ad_valorem_pos;
alter table public.des_productos add constraint des_productos_ad_valorem_pos check (ad_valorem_usd >= 0);
alter table public.des_productos drop constraint if exists des_productos_recibida_pos;
alter table public.des_productos add constraint des_productos_recibida_pos check (cant_recibida is null or cant_recibida >= 0);

-- ───────────────────────── 5) El checklist se marca en Borrador ─────────────────────────
create or replace function app.des_checklist() returns trigger language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if old.estado <> 'Borrador' and (new.chk_factura, new.chk_bl, new.chk_cert_origen, new.chk_seguro, new.chk_permiso)
       is distinct from (old.chk_factura, old.chk_bl, old.chk_cert_origen, old.chk_seguro, old.chk_permiso) then
    raise exception 'El checklist se marca mientras el desaduanaje está en Borrador. Si falta un documento, súbelo en Documentos.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists des_checklist on public.desaduanajes;
create trigger des_checklist before update on public.desaduanajes for each row execute function app.des_checklist();

revoke all on function app.des_gasto_antes() from public, anon;
revoke all on function app.des_checklist() from public, anon;
grant execute on function app.des_gasto_antes() to authenticated;
grant execute on function app.des_checklist() to authenticated;
