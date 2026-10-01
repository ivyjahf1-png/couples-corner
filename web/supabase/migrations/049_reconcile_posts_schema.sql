-- Couples Corner: reconcile public.posts with the shape the application assumes
--
-- WHY THIS EXISTS — a silent schema collision between 006 and 008.
--
-- Migration 006 and migration 008 BOTH open with:
--
--     create table if not exists public.posts (...)
--
-- Whichever runs FIRST wins and the second is a silent no-op. 006 runs first, so
-- the deployed table is 006's shape:
--
--     user_id      uuid not null  references auth.users(id)
--     content      text
--     media_urls   jsonb default '[]'
--     (no author_id, no visibility)
--
-- Every other part of this codebase assumes 008's shape:
--   • lib/actions/profile.ts inserts (author_id, visibility) — both absent.
--   • 008's policies use `auth.uid() = author_id` — the column does not exist,
--     so every `create policy` in 008 raised "column does not exist" and NONE
--     were created. A table with RLS enabled and no policies denies everything,
--     including the member's own writes.
--   • the feed joins `users!posts_author_id_fkey` — the FK does not exist.
--   • migration 047 filters on posts.author_id / posts.visibility.
--
-- The visible symptom is precisely "I publish a photo and it never appears":
-- the insert fails on two missing columns while the bytes sit correctly in
-- Storage the whole time.
--
-- IDEMPOTENT AND SAFE TO RUN TWICE. Every step is guarded, so it is also the
-- right thing to run against a project whose table already looks correct and
-- whose problem lies elsewhere.

begin;

-- ── 1) Add the columns 008 assumed, if they are not already there ────────────
alter table public.posts add column if not exists author_id uuid;
alter table public.posts add column if not exists visibility text;

-- ── 2-3) Reconcile the 006 `user_id` column, IF IT EXISTS ───────────────────
--
-- THE 42703 FIX. Both statements below used to name `user_id` unconditionally:
--
--     update public.posts set author_id = user_id where ... and user_id is not null;
--     alter table public.posts alter column user_id drop not null;
--
-- That is correct ONLY on a table in 006's shape. On a project where 008's
-- definition actually landed — no `user_id` at all — Postgres resolves the name
-- at parse time and raises:
--
--     ERROR: 42703: column "user_id" does not exist
--
-- aborting the whole transaction, so the migration did not half-apply: it
-- applied nothing at all. The project is therefore no worse off than before,
-- but the fix has to be re-run once this is corrected.
--
-- BOTH statements are now inside DO blocks that test information_schema first,
-- so they simply do not run when there is no `user_id` to migrate. That makes
-- the file correct against BOTH shapes — 006's (migrate the column) and 008's
-- (nothing to migrate) — which is what "idempotent" has to actually mean here.
--
-- Step 4 below re-adds `user_id` as NULLABLE for exactly this case, so on a
-- project that already had 008's shape this ends up adding a nullable column
-- that matches 006's name without disturbing any existing row.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'posts'
       and column_name = 'user_id'
  ) then
    -- Backfill first: rows written under 006 carry user_id and nothing else.
    -- Without this they keep a NULL author_id, fail the policies below, and
    -- silently vanish from the author's own profile.
    update public.posts
       set author_id = user_id
     where author_id is null
       and user_id is not null;

    -- Then release the NOT NULL, which is the other half of the insert failure:
    -- `user_id uuid not null` with no default rejects every insert the app now
    -- makes. Only the constraint is dropped — the column and its data stay, so
    -- anything still reading it is unaffected.
    alter table public.posts alter column user_id drop not null;
  end if;
end $$;

-- ── 4) Both ownership columns end up present and nullable-safe ───────────────
--
-- `user_id` is ADDED (nullable) rather than assumed. On a project already in
-- 008's shape it does not exist, and the guarded block above correctly skipped
-- it — but 006 declared it, so anything older may still read it. Adding a
-- NULLABLE column is safe in both directions: it satisfies such a reader with
-- NULLs instead of erroring, and it never populates or constrains existing rows.
alter table public.posts add column if not exists user_id uuid;

-- `author_id` becomes NOT NULL only once it is actually populated. A row that
-- somehow carries neither ownership column would otherwise abort the entire
-- migration and leave the project exactly where it started.
do $$
begin
  if exists (
    select 1 from public.posts
     where author_id is null
  ) then
    -- Any row still NULL here survived the backfill, which means it carries no
    -- recoverable owner under EITHER column. It cannot be attributed to anyone,
    -- and an orphan post is unreachable under every policy below, so keeping it
    -- buys nothing while risking the entire transaction.
    --
    -- Deliberately NOT attributed from created_by_id: that column belongs to
    -- public.conversations, not public.posts. Naming it here would raise the
    -- very 42703 this block exists to prevent.
    delete from public.posts where author_id is null;
  end if;

  alter table public.posts alter column author_id set not null;
end $$;

-- ── 5) Attach the FK the feed's PostgREST embed depends on ───────────────────
-- `users!posts_author_id_fkey` names this constraint exactly; an inline
-- reference generates precisely that name, which is why the join string in
-- lib/actions/profile.ts is written the way it is.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.posts'::regclass
       and conname = 'posts_author_id_fkey'
  ) then
    alter table public.posts
      add constraint posts_author_id_fkey
      foreign key (author_id) references auth.users(id) on delete cascade;
  end if;
end $$;
-- ── 6) media_urls: jsonb (006) → text[] (what 008 and every reader expect) ───
-- `jsonb::text[]` is a lossless cast for the shape this column ever held: an
-- array of URL strings. The `using` clause is required; Postgres will not
-- narrow jsonb to text[] without one.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'posts'
       and column_name = 'media_urls'
       and data_type = 'jsonb'
  ) then
    alter table public.posts
      alter column media_urls
      type text[] using coalesce(media_urls::text[], '{}'::text[]);
  end if;
end $$;

-- Default added only after the type settles; a jsonb default would be
-- incompatible with the text[] cast above.
alter table public.posts alter column media_urls set default '{}'::text[];

-- ── 7) visibility: default, NOT NULL, and the enum CHECK ────────────────────
alter table public.posts alter column visibility set default 'public';
update public.posts set visibility = 'public' where visibility is null;
alter table public.posts alter column visibility set not null;

-- `not valid` first, so an unexpected legacy value is rewritten above rather
-- than aborting the whole migration, then validated so it is actually enforced.
alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts
  add constraint posts_visibility_check
  check (visibility in ('public', 'friends', 'private')) not valid;
alter table public.posts validate constraint posts_visibility_check;

-- ── 8) public.friends, if it is genuinely absent ────────────────────────────
-- Created BEFORE the posts policies below, not after: `posts_select_public`
-- contains a subquery against public.friends, and Postgres resolves that at
-- policy-creation time. Building the policy first would fail outright on a
-- project where 008 never effectively applied. Defensive, and idempotent.
create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;
drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own" on public.friends
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

-- ── 9) Policies, recreated against the now-correct columns ───────────────────
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public" on public.posts
  for select using (
    visibility = 'public'
    or auth.uid() = author_id
    or (visibility = 'friends' and auth.uid() in (
      select friend_id from public.friends where user_id = posts.author_id
    ))
  );

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = author_id);

-- ── 10) Grants and indexes ────────────────────────────────────────────────
-- RLS restricts ROWS, not the table itself: without these grants an anon or
-- authenticated role cannot touch public.posts at all and every policy above is
-- unreachable.
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- Both indexes exist in 008 keyed on author_id. On a 006-shaped database they
-- were never created, so the feed's ORDER BY created_at DESC sorted the entire
-- table on every render.
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_author on public.posts(author_id, created_at desc);
create index if not exists idx_posts_visibility on public.posts(visibility, created_at desc);

commit;