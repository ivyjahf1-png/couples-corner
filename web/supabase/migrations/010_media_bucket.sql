-- Content / advertisement media bucket
-- Used for storing uploaded media for sponsored content, advertisements, and announcements.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Storage policies for the media bucket (public read, admin/service-role write).
drop policy if exists "media_storage_read" on storage.objects;
create policy "media_storage_read"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media_storage_insert" on storage.objects;
create policy "media_storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'media' and auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "media_storage_update" on storage.objects;
create policy "media_storage_update"
  on storage.objects for update
  using (bucket_id = 'media' and auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "media_storage_delete" on storage.objects;
create policy "media_storage_delete"
  on storage.objects for delete
  using (bucket_id = 'media' and auth.jwt() ->> 'role' = 'service_role');