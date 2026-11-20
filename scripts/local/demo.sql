-- Datos de PRUEBA para el Supabase local (todo inventado). Una persona por área/rol, un proyecto ganado
-- con su etapa y aprobador, y tres proveedores. Idempotente: se puede correr dos veces.
-- Las personas entran por auth.users, como en Supabase: el disparador alta_usuario crea su fila en usuarios.
do $$
declare
  gente text[][] := array[
    ['a0000000-0000-0000-0000-000000000001','admin@inroprin.com','Ana Admin','Administración','ADMIN'],
    ['a0000000-0000-0000-0000-000000000002','solicitante@inroprin.com','Sergio Solicitante','Comercial',''],
    ['a0000000-0000-0000-0000-000000000003','gerente@inroprin.com','Gabriela Gerente de Proyecto','Proyectos',''],
    ['a0000000-0000-0000-0000-000000000004','pcp@inroprin.com','Paula Planeamiento','Planeamiento',''],
    ['a0000000-0000-0000-0000-000000000005','tecnica@inroprin.com','Tomás Técnica','Técnica','TECNICA'],
    ['a0000000-0000-0000-0000-000000000006','compras@inroprin.com','Carla Compras','Compras',''],
    ['a0000000-0000-0000-0000-000000000007','importaciones@inroprin.com','Iván Importaciones','Importaciones',''],
    ['a0000000-0000-0000-0000-000000000008','cg@inroprin.com','Carlos Control de Gestión','Control de Gestión','CONTROL_GESTION'],
    ['a0000000-0000-0000-0000-000000000009','gop@inroprin.com','Gloria GOP','Gerencia','GOP'],
    ['a0000000-0000-0000-0000-000000000010','gaf@inroprin.com','Gustavo GAF','Gerencia','GAF'],
    ['a0000000-0000-0000-0000-000000000011','finanzas@inroprin.com','Fernanda Finanzas','Finanzas','FINANZAS'],
    ['a0000000-0000-0000-0000-000000000012','contabilidad@inroprin.com','Cecilia Contabilidad','Contabilidad','CONTABILIDAD'],
    ['a0000000-0000-0000-0000-000000000013','jefecompras@inroprin.com','Jorge Jefe de Compras','Compras','JEFE_COMPRAS_N'],
    ['a0000000-0000-0000-0000-000000000014','jefeimp@inroprin.com','Julia Jefa de Importaciones','Importaciones','JEFE_COMPRAS_I']
  ];
  g text[];
begin
  foreach g slice 1 in array gente loop
    insert into auth.users (id, email, raw_user_meta_data, aud, role, instance_id)
    values (g[1]::uuid, g[2], jsonb_build_object('full_name', g[3]), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')
    on conflict (id) do nothing;
    update public.usuarios set area = g[4], nombre = g[3] where id = g[1]::uuid;
    if g[5] <> '' then insert into public.usuario_roles (usuario_id, rol) values (g[1]::uuid, g[5]) on conflict do nothing; end if;
  end loop;
  -- el jefe del solicitante (libera solicitudes administrativas)
  update public.usuarios set jefe_id = 'a0000000-0000-0000-0000-000000000003' where id = 'a0000000-0000-0000-0000-000000000002';
end $$;

insert into public.proyectos (id, codigo, nombre, cliente, estado, gerente_id, fecha_meta, lugar_entrega)
values ('b0000000-0000-0000-0000-000000000001', 'P-001', 'Talleres EPT — Equipamiento', 'Cliente de prueba S.A.C.', 'Ganado',
        'a0000000-0000-0000-0000-000000000003', current_date + 120, 'Almacén Lurín')
on conflict (id) do nothing;
insert into public.proyectos (id, codigo, nombre, cliente, estado, gerente_id)
values ('b0000000-0000-0000-0000-000000000002', 'P-002', 'Mobiliario escolar', 'Otro cliente de prueba', 'Estudio de mercado', 'a0000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;
insert into public.proyecto_etapas (id, proyecto_id, nombre, orden, aprobadores)
values ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'General', 1, array['a0000000-0000-0000-0000-000000000003'::uuid])
on conflict (id) do nothing;

insert into public.proveedores (id, ruc, razon_social, origen, correo, evaluacion_fin)
values ('d0000000-0000-0000-0000-000000000001', '20600000013', 'Proveedor Nacional de Prueba S.A.C.', 'Nacional', 'ventas@proveedor.pe', 'Aprobado'),
       ('d0000000-0000-0000-0000-000000000002', '20500000024', 'Ferretería Inventada E.I.R.L.', 'Nacional', 'ventas@ferreteria.pe', 'Pendiente')
on conflict (id) do nothing;
insert into public.proveedores (id, razon_social, origen, pais, correo, evaluacion_fin)
values ('d0000000-0000-0000-0000-000000000003', 'Overseas Machinery Ltd (prueba)', 'Extranjero', 'China', 'sales@overseas.example', 'Aprobado')
on conflict (id) do nothing;
