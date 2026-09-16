-- Content / promotional items table
-- Stores advertisements, featured content, announcements, photos, and videos
-- that can be placed across the app (hero, homepage, dashboard, feed, etc.)

-- ------------------------------------------------------------
-- PRE-FLIGHT GUARD (do not remove)
-- The admin policies below reference public.users.role. If that column (or the
-- whole public.users table) is missing, `create policy` aborts this script with:
--   ERROR: column "role" does not exist           (SQLSTATE 42703)
-- so we guarantee both exist first. 012_users_roles.sql performs the full
-- users/role repair; this guard keeps 011 runnable on its own in the SQL Editor.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    create table public.users (
      id         uuid primary key,
      email      text,
      role       text default 'user',
      created_at timestamptz not null default now()
    );
    raise notice '011: created a minimal public.users table (run 012_users_roles.sql for the full schema).';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'users'
      and column_name  = 'role'
  ) then
    alter table public.users add column role text default 'user';
    update public.users set role = 'user' where role is null;
    alter table public.users alter column role set default 'user';
    alter table public.users alter column role set not null;
    raise notice '011: added public.users.role (default ''user'').';
  end if;
end $$;

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('advertisement', 'photo', 'video', 'announcement', 'featured')),
  title text not null,
  description text,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null default '',
  thumbnail_url text,
  button_text text,
  destination_url text,
  placement text not null check (placement in ('hero', 'homepage', 'dashboard', 'discover', 'feed', 'matches', 'messages')),
  status text not null check (status in ('draft', 'scheduled', 'published', 'archived')) default 'draft',
  priority integer not null default 0,
  start_at timestamptz not null default now(),
  end_at timestamptz not null default (now() + interval '30 days'),
  target_audience text,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.content enable row level security;

-- Policies: Admins and service role can manage all content
drop policy if exists "content_admin_insert" on public.content;
create policy "content_admin_insert"
  on public.content for insert
  with check (auth.jwt() ->> 'role' = 'service_role' or exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "content_admin_update" on public.content;
create policy "content_admin_update"
  on public.content for update
  using (auth.jwt() ->> 'role' = 'service_role' or exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "content_admin_delete" on public.content;
create policy "content_admin_delete"
  on public.content for delete
  using (auth.jwt() ->> 'role' = 'service_role' or exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

-- Policy: Anyone can read published content
drop policy if exists "content_published_select" on public.content;
create policy "content_published_select"
  on public.content for select
  using (status = 'published');

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_content_updated_at on public.content;
create trigger update_content_updated_at
  before update on public.content
  for each row
  execute function public.update_updated_at_column();

-- Index for faster queries by placement and status
create index if not exists idx_content_placement_status on public.content (placement, status);
create index if not exists idx_content_category on public.content (category);
create index if not exists idx_content_created_by on public.content (created_by);