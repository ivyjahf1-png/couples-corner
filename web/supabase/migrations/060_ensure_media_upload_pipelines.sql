-- ====================================================================
-- 060: GUARANTEE every media-upload pipeline end-to-end.
--
-- WHY THIS FILE EXISTS: the upload path is split across many migrations (007,
-- 008, 010, 014, 034, 036, 037, 040, 045, 053, 054, 056, 059). This project has
-- a documented history of those containing syntax errors or being only PARTIALLY
-- applied to the live database (014 says the bucket and table were found MISSING
-- on the deployed DB). When any single link is absent, the browser upload fails
-- like a network error with no server trace, because bytes travel browser ->
-- Supabase Storage directly (web/lib/utils/direct-upload.ts), never the server.
--
--   This migration is the SINGLE SOURCE OF TRUTH for the end state: fully
--   idempotent and DEFENSIVE (create if not exists; alter only when absent;
--   re-create every policy behind `drop policy if exists`). Safe to re-run in
--   the SQL Editor; a no-op on a healthy DB, a repair on a broken one.
--
-- THE TWO BUCKETS AND THEIR PATH SHAPES (must match direct-upload.ts EXACTLY):
--   • `user-media` — moments/gallery/feed. Path = `{uid}/{random}-{safe}`.
--     Owner scope = (storage.foldername(name))[1] = auth.uid()::text.
--   • `photos` — profile photos. Path = `profiles/{uid}/{ts}_{safe}`.
--     Owner scope = (storage.foldername(name))[1]='profiles' AND [2]=auth.uid().
--   Applying the WRONG scope shape to a bucket is the #1 cause of "uploads fail
--   for this bucket but work for the other", so both are spelled out.
--
-- WHAT THE CLIENT REQUIRES OF THE BUCKET (media-upload.ts + direct-upload.ts):
--   • public = true            -> getPublicUrl() returns a usable URL.
--   • file_size_limit = null   -> moment videos have NO client-side size guard
--                                 (migration 059); the bucket must not add one.
--   • allowed_mime_types covering EVERY type validateMediaFile() permits, else a
--     full transfer is rejected with a 400 AFTER it completes.
--
-- NOTE ON THE CLIENT-SIDE GAP THIS SQL CANNOT FIX: validateMediaFile() rejects
--   an EMPTY `File.type` BEFORE direct-upload.ts's EXT_MIME extension fallback
--   runs, so some older-Android devices get "Unsupported media type" no matter
--   what the bucket allows. See the note at the very bottom of this file.
-- ====================================================================

begin;

-- ====================================================================
-- PART 1 — THE BUCKETS
-- ====================================================================

-- 1a) user-media: public, unlimited per-file size, full image+video MIME set.
--     `on conflict` repairs an existing row whose public flag, size limit, or
--     MIME allowlist has drifted (a partial 053/054/059 run).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  true,
  null,
  array[
    'image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','image/bmp','image/tiff',
    'video/mp4','video/webm','video/quicktime','video/x-m4v','video/ogg','video/mpeg','video/x-msvideo','video/x-matroska','video/3gpp'
  ]::text[]
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 1b) photos: public, unlimited per-file size. Profile photos are validated
--     client-side to the browser-renderable subset (JPEG/PNG/WebP/GIF/AVIF), so
--     we deliberately do NOT restrict allowed_mime_types here — a missing bucket
--     MIME entry is a worse failure (post-transfer 400) than a loose one, and the
--     owner-scoped write policy already prevents cross-account writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, null, null)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

commit;

-- ====================================================================
-- PART 2 — STORAGE.OBJECTS ROW-LEVEL SECURITY
--
-- A bucket with RLS enabled and NO insert policy denies EVERY authenticated
-- upload with no error the member can act on. These four policies per bucket are
-- what make the direct browser->storage write succeed. Both shapes must match
-- direct-upload.ts's path construction exactly (see header).
-- ====================================================================

begin;

-- 2a) user-media: public read; owner-scoped insert/update/delete.
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

-- 2b) photos: public read; owner-scoped to profiles/{uid}/... ONLY.
drop policy if exists "photos: public read" on storage.objects;
create policy "photos: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'photos');

drop policy if exists "photos: owner can upload" on storage.objects;
create policy "photos: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "photos: owner can update" on storage.objects;
create policy "photos: owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "photos: owner can delete" on storage.objects;
create policy "photos: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

commit;

-- ====================================================================
-- PART 3 — THE `moments` TABLE (what publishMomentFromStorage writes and
-- MediaFeed reads). A perfect storage upload still looks like a failed upload if
-- this insert fails: the bytes land in the bucket but the feed never shows them.
-- ====================================================================

begin;

-- 3a) task_definitions FIRST: `moments.task_slug` has a FK to it. Creating
--     moments before it exists would fail the FK reference on a fresh database.
create table if not exists public.task_definitions (
  slug text primary key,
  title text not null,
  description text,
  category text not null default 'Daily' check (category in ('Daily','Newcomer','Social','Content')),
  reward_coins integer not null check (reward_coins >= 0),
  action_route text,
  requires_upload boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true
);
alter table public.task_definitions enable row level security;
drop policy if exists "task_definitions public read" on public.task_definitions;
create policy "task_definitions public read"
  on public.task_definitions for select using (active = true);
grant select on public.task_definitions to anon, authenticated;

-- 3b) moments, in the exact shape every code path assumes (034 + 037 + 045).
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  task_slug text references public.task_definitions(slug) on delete set null,
  created_at timestamptz not null default now()
);

-- 3c) `content` column: repair the caption->content drift (migration 037) so the
--     publish insert never fails with "column moments.content does not exist".
--     ORDER MATTERS: the caption->content migration must run BEFORE the plain
--     "add if not exists content", otherwise content exists first and the
--     caption data would be orphaned instead of copied.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='moments' and column_name='caption'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='moments' and column_name='content'
  ) then
    alter table public.moments add column content text not null default '';
    update public.moments set content = coalesce(caption, '');
    alter table public.moments drop column caption;
  end if;
end $$;
alter table public.moments add column if not exists content text not null default '';

-- 3d) media_type must admit 'link' (migration 045) or link-embed publishes fail
--     the CHECK. Reuse 045's name-agnostic rewrite so it works on any build,
--     but drop EVERY matching check (not just the first) so re-running can never
--     collide with the constraint name we re-add below.
do $$
declare v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname='public' and rel.relname='moments'
      and con.contype='c' and pg_get_constraintdef(con.oid) ilike '%media_type%'
  loop
    execute format('alter table public.moments drop constraint %I', v_constraint);
  end loop;
end $$;
alter table public.moments
  add constraint moments_media_type_check
  check (media_type in ('image', 'video', 'link'));

create index if not exists moments_created_idx on public.moments(created_at desc);

commit;

-- ====================================================================
-- PART 4 — MOMENTS ROW-LEVEL SECURITY + GRANTS
--
-- RLS restricts ROWS, not the table itself: without the GRANT, the role cannot
-- touch the table at all and every policy below is unreachable. Without an
-- INSERT policy, the publish insert is denied with no member-actionable error
-- even though the file uploaded perfectly.
-- ====================================================================

begin;

alter table public.moments enable row level security;

-- Public feed read (the home feed renders signed-out too): migration 040.
drop policy if exists "moments public read" on public.moments;
create policy "moments public read" on public.moments for select using (true);

-- Owner-only writes: publishMomentFromStorage uses the service role (bypasses
-- RLS), but these guard any direct anon-client write path.
drop policy if exists "users insert own moments" on public.moments;
create policy "users insert own moments" on public.moments
  for insert with check (auth.uid() = user_id);

drop policy if exists "users delete own moments" on public.moments;
create policy "users delete own moments" on public.moments
  for delete using (auth.uid() = user_id);

grant select on public.moments to anon, authenticated;
grant insert, update, delete on public.moments to authenticated;
grant all on public.moments to service_role;

commit;

-- ====================================================================
-- PART 5 — ENGAGEMENT + GALLERY TABLES (036 / 044 / 014)
-- Read by MediaFeed right after a publish; kept here so a fresh DB is complete.
-- ====================================================================

begin;

-- 5a) moment_reactions (036).
create table if not exists public.moment_reactions (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'like' check (kind in ('like','love','fire','laugh')),
  created_at timestamptz not null default now(),
  unique (moment_id, user_id)
);
create index if not exists moment_reactions_moment_idx on public.moment_reactions(moment_id);
alter table public.moment_reactions enable row level security;
drop policy if exists "moment_reactions public read" on public.moment_reactions;
create policy "moment_reactions public read" on public.moment_reactions for select using (true);
drop policy if exists "moment_reactions own insert" on public.moment_reactions;
create policy "moment_reactions own insert" on public.moment_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "moment_reactions own delete" on public.moment_reactions;
create policy "moment_reactions own delete" on public.moment_reactions for delete using (auth.uid() = user_id);
grant select on public.moment_reactions to anon, authenticated;
grant insert, delete on public.moment_reactions to authenticated;

-- 5b) moment_comments (036 shape + 044 body->comment rename).
create table if not exists public.moment_comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null check (char_length(comment) between 1 and 500),
  created_at timestamptz not null default now()
);
-- 044: fresh builds from 036 named it `body`; fold into `comment` so both agree.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='moment_comments' and column_name='body'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='moment_comments' and column_name='comment'
  ) then
    alter table public.moment_comments rename column body to comment;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='moment_comments' and column_name='body'
  ) then
    update public.moment_comments set comment = body where comment is null;
    alter table public.moment_comments drop column body;
  end if;
end $$;
create index if not exists moment_comments_moment_created_idx
  on public.moment_comments(moment_id, created_at desc);
alter table public.moment_comments enable row level security;
drop policy if exists "moment_comments public read" on public.moment_comments;
create policy "moment_comments public read" on public.moment_comments for select using (true);
drop policy if exists "moment_comments own insert" on public.moment_comments;
create policy "moment_comments own insert" on public.moment_comments for insert with check (auth.uid() = user_id);
drop policy if exists "moment_comments own delete" on public.moment_comments;
create policy "moment_comments own delete" on public.moment_comments for delete using (auth.uid() = user_id);
grant select on public.moment_comments to anon, authenticated;
grant insert, delete on public.moment_comments to authenticated;

commit;

-- ====================================================================
-- PART 6 — THE `user_media` GALLERY TABLE (migration 014)
-- recordUserMediaAction writes a row here after some uploads; the profile
-- gallery reads it. Table with RLS and no grants/policies = silent failure.
-- ====================================================================

begin;

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
create index if not exists idx_user_media_page on public.user_media(user_id, created_at desc, id desc);

alter table public.user_media enable row level security;
grant select on public.user_media to anon, authenticated;
grant insert, update, delete on public.user_media to authenticated;
grant all on public.user_media to service_role;

-- Public gallery reads; writes stay owner-only. Recreated without the legacy
-- 10-item insert cap (014 removed the trigger; drop it again defensively).
drop policy if exists "media_select_public" on public.user_media;
drop policy if exists "user_media_select_public" on public.user_media;
drop policy if exists "user_media_select_owner" on public.user_media;
create policy "media_select_public" on public.user_media for select using (true);

drop policy if exists "media_insert_own" on public.user_media;
drop policy if exists "user_media_insert_own" on public.user_media;
create policy "media_insert_own" on public.user_media for insert with check (auth.uid() = user_id);

drop policy if exists "media_update_own" on public.user_media;
drop policy if exists "user_media_update_own" on public.user_media;
create policy "media_update_own" on public.user_media
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "media_delete_own" on public.user_media;
drop policy if exists "user_media_delete_own" on public.user_media;
create policy "media_delete_own" on public.user_media for delete using (auth.uid() = user_id);

drop trigger if exists user_media_limit_trigger on public.user_media;
drop function if exists check_user_media_limit();

commit;

-- ====================================================================
-- PART 7 — VERIFICATION (read-only; run after the above).
-- Every result should be non-empty / pass. If a bucket row is MISSING or an
-- insert policy count is 0, that is the reason uploads fail.
-- ====================================================================

-- 7a) Both buckets exist, are public, have no size cap, and carry the MIME set.
select id, "public", file_size_limit,
       coalesce(array_length(allowed_mime_types, 1), 0) as mime_count
from storage.buckets
where id in ('user-media', 'photos')
order by id;

-- 7b) Every bucket needs >=1 insert policy on storage.objects, else all writes
--     are denied. Expect 1 for 'user-media' and 1 for 'photos'. NOTE: pg_policies
--     has no bucket_id column; the bucket is identified inside qual/with_check.
select 'user-media' as bucket,
       count(*) filter (where cmd = 'INSERT') as insert_policies,
       count(*) filter (where cmd = 'SELECT') as select_policies
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (coalesce(qual, '') || coalesce(with_check, '')) like '%user-media%'
union all
select 'photos',
       count(*) filter (where cmd = 'INSERT'),
       count(*) filter (where cmd = 'SELECT')
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (coalesce(qual, '') || coalesce(with_check, '')) like '%''photos''%';

-- 7c) moments must be insertable by the service role and readable publicly.
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('moments','moment_reactions','moment_comments','user_media')
order by tablename;

-- 7d) media_type must admit 'link' or link-embed publishes fail the CHECK.
select pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.moments'::regclass and contype = 'c'
  and pg_get_constraintdef(oid) like '%media_type%';

-- ====================================================================
-- KNOWN CLIENT-SIDE BUG (NOT FIXABLE FROM SQL):
--   web/lib/utils/media-upload.ts validateMediaFile() rejects when
--   `file.type` is "" (empty). Older-Android browsers often report an empty
--   MIME type, and direct-upload.ts's EXT_MIME fallback (which recovers the type
--   from the file extension) only runs AFTER validation, so it never gets the
--   chance. Fix: in validateMediaFile, when `file.type` is empty, derive it from
--   the extension before comparing, or accept empty types and let the server
--   infer. Until then, affected devices fail with "Unsupported media type"
--   regardless of how correct this bucket configuration is.
-- ====================================================================
