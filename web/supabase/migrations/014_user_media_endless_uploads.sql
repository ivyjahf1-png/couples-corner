-- Repair user-media storage and remove the account item cap.
-- Earlier migrations contain syntax errors; live read-only checks found this
-- table and bucket missing. Apply after reviewing existing bucket policies.
-- Every statement here is idempotent — safe to run repeatedly in the SQL Editor.
begin;

-- 1) Bucket: public read, 250 MB per file, all common image/video MIME types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  true,
  262144000, -- 250 MB per file (set null instead to defer to plan limits only)
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','image/bmp','image/tiff',
    'video/mp4','video/webm','video/quicktime','video/x-m4v','video/ogg','video/mpeg','video/x-msvideo','video/x-matroska','video/3gpp'
  ]::text[]
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) Storage RLS for the bucket: public read, owner-scoped writes. The server
--    client uses the service role (bypasses RLS); these guard direct client use.
-- Preserve unrelated existing Storage policies; audit any additional policies
-- in the deployed project before enabling client uploads.

drop policy if exists "user_media_storage_read" on storage.objects;
create policy "user_media_storage_read"
  on storage.objects for select
  using (bucket_id = 'user-media');

drop policy if exists "user_media_storage_insert" on storage.objects;
create policy "user_media_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "user_media_storage_update" on storage.objects;
create policy "user_media_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "user_media_storage_delete" on storage.objects;
create policy "user_media_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3) The user_media gallery table, linked to auth users (cascade on delete).
create table if not exists public.user_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  is_profile_photo boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_media_user on public.user_media(user_id, sort_order);

alter table public.user_media enable row level security;
grant select on public.user_media to anon, authenticated;
grant insert, update, delete on public.user_media to authenticated;
grant all on public.user_media to service_role;
create index if not exists idx_user_media_page on public.user_media(user_id, created_at desc, id desc);

-- Public gallery reads; all writes stay owner-only. Recreated without the
-- legacy 10-item insert restriction.
drop policy if exists "user_media_select_public" on public.user_media;
drop policy if exists "media_select_public" on public.user_media;
create policy "media_select_public"
  on public.user_media for select
  using (true);

drop policy if exists "user_media_insert_own" on public.user_media;
drop policy if exists "media_insert_own" on public.user_media;
create policy "media_insert_own"
  on public.user_media for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_media_update_own" on public.user_media;
drop policy if exists "media_update_own" on public.user_media;
create policy "media_update_own"
  on public.user_media for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_media_delete_own" on public.user_media;
drop policy if exists "media_delete_own" on public.user_media;
create policy "media_delete_own"
  on public.user_media for delete
  using (auth.uid() = user_id);

-- 4) Remove the lifetime 10-item cap trigger and its function.
drop trigger if exists user_media_limit_trigger on public.user_media;
drop function if exists check_user_media_limit();

commit;
