-- ====================================================================
-- 061: ISOLATED FEED ENGINE — feed_posts table + feed-uploads bucket.
--
-- The Feed page (photos + text timeline) gets its own storage lane,
-- fully independent of the Moment screen (moments table + user-media
-- bucket). Idempotent: safe to re-run in the SQL Editor.
-- ====================================================================

begin;

-- ── PART 1 — feed_posts table ─────────────────────────────────────
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null default '',
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.feed_posts enable row level security;

drop policy if exists "feed_posts_public_read" on public.feed_posts;
create policy "feed_posts_public_read" on public.feed_posts
  for select using (true);

drop policy if exists "feed_posts_insert_own" on public.feed_posts;
create policy "feed_posts_insert_own" on public.feed_posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "feed_posts_update_own" on public.feed_posts;
create policy "feed_posts_update_own" on public.feed_posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "feed_posts_delete_own" on public.feed_posts;
create policy "feed_posts_delete_own" on public.feed_posts
  for delete using (auth.uid() = user_id);

create index if not exists feed_posts_user_id_idx on public.feed_posts (user_id);
create index if not exists feed_posts_created_at_idx on public.feed_posts (created_at desc);

-- ── PART 2 — feed-uploads bucket ──────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feed-uploads',
  'feed-uploads',
  true,
  null,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[]
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── PART 3 — storage.objects policies for feed-uploads ────────────
-- Path shape = {uid}/{file}. Owner scope = foldername(name)[1] = auth.uid().

drop policy if exists "feed_uploads_public_read" on storage.objects;
create policy "feed_uploads_public_read" on storage.objects
  for select using (bucket_id = 'feed-uploads');

drop policy if exists "feed_uploads_insert_own" on storage.objects;
create policy "feed_uploads_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'feed-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "feed_uploads_update_own" on storage.objects;
create policy "feed_uploads_update_own" on storage.objects
  for update using (
    bucket_id = 'feed-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'feed-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "feed_uploads_delete_own" on storage.objects;
create policy "feed_uploads_delete_own" on storage.objects
  for delete using (
    bucket_id = 'feed-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- ── VERIFICATION (read-only) ──────────────────────────────────────
select id, "public", file_size_limit from storage.buckets where id = 'feed-uploads';
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'feed_posts';
