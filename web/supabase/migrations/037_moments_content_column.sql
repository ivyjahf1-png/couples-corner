-- 037: Guarantee the moments text column matches what the app writes.
--
-- WHY: the app inserts/selects the moment text as `moments.content`
-- (see lib/server/tasks.ts, MOMENT_TEXT_COLUMN). If the deployed table was
-- created by an earlier/hand-edited schema that used `caption` instead, every
-- publish fails with "column moments.content does not exist" — and the same
-- error appears if the column is missing entirely.
--
-- This migration is deliberately DEFENSIVE and idempotent: it only acts when
-- the schema actually disagrees, and never renames a column that already
-- exists. Run it repeatedly in the SQL Editor; it is a no-op on a correct DB.
--
--   A) table missing entirely  -> create the full 034 shape
--   B) `content` missing but
--      `caption` present       -> backfill, then rename caption -> content
--   C) `content` missing and no
--      caption either          -> add `content`
--   D) `content` present       -> no-op (the healthy case)
begin;

-- A) Ensure the table exists at all.
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  task_slug text references public.task_definitions(slug) on delete set null,
  created_at timestamptz not null default now()
);

-- B) A `caption` column with no `content` column: copy the data across, then
--    rename so the column identity (and its NOT NULL default) is preserved.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'moments' and column_name = 'caption'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'moments' and column_name = 'content'
  ) then
    alter table public.moments add column content text not null default '';
    update public.moments set content = coalesce(caption, '');
    alter table public.moments drop column caption;
  end if;
end $$;

-- C) Neither column present: add `content` so the insert cannot fail.
alter table public.moments add column if not exists content text not null default '';

create index if not exists moments_created_idx on public.moments(created_at desc);

commit;
