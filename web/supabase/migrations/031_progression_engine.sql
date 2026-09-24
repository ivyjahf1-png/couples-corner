-- Level 1 is the only safe initial progression state. Activity ledger is append-only.
alter table public.users add column if not exists level integer not null default 1;
alter table public.users add column if not exists experience integer not null default 0;
create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('game','aristocracy','store','task','invite')),
  xp integer not null default 0 check (xp > 0), created_at timestamptz not null default now()
);
create index if not exists user_activity_user_idx on public.user_activity(user_id, created_at desc);
alter table public.user_activity enable row level security;
drop policy if exists "users read own progression" on public.users;
create policy "users read own progression" on public.users for select using (auth.uid() = id);
