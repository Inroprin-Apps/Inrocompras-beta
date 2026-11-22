-- 0071 · Empresas (la pantalla «Empresas» del AppSheet, en Configuración).
-- Su razón social, RUC y dirección van en la cabecera del PDF de la OC que recibe el proveedor: sin RUC, el proveedor
-- no sabe a quién facturar. Por eso: (1) el RUC, si se pone, tiene que ser válido (dígito verificador, como en
-- Proveedores); (2) una OC de una empresa sin RUC no se emite, con un mensaje que dice quién lo arregla.
-- Los datos reales de las empresas NO van aquí: los carga el administrador desde la app.

alter table public.empresas drop constraint if exists empresas_ruc_valido;
alter table public.empresas add constraint empresas_ruc_valido check (ruc is null or public.ruc_valido(ruc));

create or replace function app.p_oc_emitir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Emitir OC] = AND(Estatus="Borrador", COUNT(líneas)>0, Monto>0, área Compras/Importaciones,
  --                   OR(CONTAINS(Forma de pago,"Tarjeta"), hay Documentos_OC tipo "Cotización"))
  select case
    when not app.es_compras() then 'La orden la emite Compras o Importaciones.'
    when o.estatus <> 'Borrador' then 'La orden ya fue emitida.'
    when not exists (select 1 from public.oc_lineas where orden_id = o.id) then 'La orden no tiene líneas.'
    when o.monto <= 0 then 'El monto debe ser mayor que cero.'
    when o.proveedor_id is null then 'Elige el proveedor.'
    when (select coalesce(trim(e.ruc), '') from public.empresas e where e.id = o.empresa_id) = ''
      then 'La empresa ' || o.empresa_id || ' no tiene RUC: el administrador lo completa en Configuración → Empresas.'   -- 0071
    when o.forma_pago = 'Adelanto' and o.pct_adelanto is null then 'Indica el % de adelanto.'
    when o.forma_pago in ('Crédito','Letra') and o.dias_credito is null then 'Indica los días de crédito.'
    when o.forma_pago <> 'Tarjeta de crédito' and not exists (select 1 from public.documentos where orden_id = o.id and tipo_doc = 'Cotización' and estado <> 'Reemplazado')
      then 'Sube la cotización del proveedor.'
    when (app.cfg('exigir_validacion_tecnica', 'true'))::text::boolean and exists (
           select 1 from public.oc_lineas l join public.requerimiento_items i on i.id = l.item_id
           where l.orden_id = o.id and i.validacion_tecnica not in ('Validado','No aplica'))
      then 'Hay ítems sin validación técnica.'                                              -- adición C-16
    when o.procedencia = 'Importación' and (select origen from public.proveedores where id = o.proveedor_id) <> 'Extranjero' then 'Una importación lleva proveedor extranjero.'
  end from public.ordenes o where o.id = p_id
$$;
