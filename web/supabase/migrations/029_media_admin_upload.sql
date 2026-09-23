-- Media bucket: allow authenticated admins to upload/manage content media
-- Fixes: "new row violates row-level security policy" when the admin
-- dashboard uploads directly from the browser with the anon key.
-- The browser JWT has role 'authenticated' (never 'service_role'), so the
-- service_role-only policies in 010_media_bucket.sql rejected every direct
-- browser upload. Server Actions (service_role) still bypass RLS entirely.
-- Public read stays open; anon users still cannot write.

drop policy if exists "media_storage_admin_insert" on storage.objects;
create policy "media_storage_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "media_storage_admin_update" on storage.objects;
create policy "media_storage_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "media_storage_admin_delete" on storage.objects;
create policy "media_storage_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Content table: allow authenticated admins to read drafts (needed by the
-- admin list view when any code path uses the anon-key client). Service-role
-- writes already bypass RLS; the admin insert/update/delete policies from
-- 011 already cover anon-key admin writes.
drop policy if exists "content_admin_select" on public.content;
create policy "content_admin_select"
  on public.content for select
  to authenticated
  using (
    status = 'published'
    or exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );
