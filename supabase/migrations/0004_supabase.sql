-- INROCOMPRAS · 0004 · Piezas propias de Supabase (auth y storage)
-- Va aparte para que 0001–0003 también corran en un Postgres de pruebas.

-- Alta automática del usuario al primer ingreso con Google (solo @inroprin.com; ver config.dominio_permitido).
drop trigger if exists alta_usuario on auth.users;
create trigger alta_usuario after insert on auth.users for each row execute function app.alta_usuario();

-- Bucket privado de staging. El archivo definitivo vive en Google Drive (legajo); aquí queda la copia
-- mientras el trabajo «archivar_doc» lo sube, y para que el lector de cotizaciones lo lea.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 26214400,
        array['application/pdf','image/jpeg','image/png','application/xml','text/xml',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

-- Ruta: documentos/<auth.uid()>/<uuid>-<nombre>. Cada quien sube a su carpeta; el servidor (service_role) mueve a Drive.
create policy "subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "leer documentos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.documentos d where d.storage_path = name
               and (app.ve_precios() or (d.orden_id is null and d.desaduanaje_id is null)))));
