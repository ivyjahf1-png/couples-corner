-- 034: Task center with daily reset, claimable rewards, and moment uploads.
--
-- * public.task_definitions  - catalog of tasks with coin rewards
-- * public.user_tasks        - per-user, per-day progress/claim rows
-- * public.moments           - syndication of uploaded moments to the home feed
--
-- A user_task row is keyed by (user_id, task_slug, task_date) so claiming is
-- naturally once-per-day: the daily reset is a new (task_date) row set, not a
-- destructive UPDATE. This keeps the ledger append-only and avoids cron.
begin;

create table if not exists public.task_definitions (
  slug text primary key,
  title text not null,
  description text,
  category text not null default 'Daily' check (category in ('Daily', 'Newcomer', 'Social', 'Content')),
  reward_coins integer not null check (reward_coins >= 0),
  action_route text,
  requires_upload boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.user_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_slug text not null references public.task_definitions(slug) on delete cascade,
  task_date date not null default current_date,
  status text not null default 'available' check (status in ('available', 'claimed')),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, task_slug, task_date)
);

create index if not exists user_tasks_user_date_idx
  on public.user_tasks(user_id, task_date desc);

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  task_slug text references public.task_definitions(slug) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists moments_created_idx on public.moments(created_at desc);

alter table public.task_definitions enable row level security;
alter table public.user_tasks enable row level security;
alter table public.moments enable row level security;

drop policy if exists "task_definitions public read" on public.task_definitions;
create policy "task_definitions public read" on public.task_definitions for select using (active = true);

drop policy if exists "users read own tasks" on public.user_tasks;
create policy "users read own tasks" on public.user_tasks for select using (auth.uid() = user_id);
drop policy if exists "users insert own tasks" on public.user_tasks;
create policy "users insert own tasks" on public.user_tasks for insert with check (auth.uid() = user_id);
drop policy if exists "users update own tasks" on public.user_tasks;
create policy "users update own tasks" on public.user_tasks for update using (auth.uid() = user_id);

drop policy if exists "moments public read" on public.moments;
create policy "moments public read" on public.moments for select using (true);
drop policy if exists "users insert own moments" on public.moments;
create policy "users insert own moments" on public.moments for insert with check (auth.uid() = user_id);
drop policy if exists "users delete own moments" on public.moments;
create policy "users delete own moments" on public.moments for delete using (auth.uid() = user_id);

-- Seed the task catalog (idempotent).
insert into public.task_definitions (slug, title, description, category, reward_coins, action_route, requires_upload, sort_order) values
  ('daily-check-in',      'Daily Check-in',        'Open the app and check in for the day.',            'Daily',    100, null,                                   false, 1),
  ('send-messages',        'Send 5 Messages',       'Send five messages to your connections today.',     'Social',   250, '/messages',                             false, 2),
  ('play-ludo',            'Play a Round of Ludo',  'Finish a round in the Game Center.',                'Daily',    300, '/games/couples-ludo-advance',            false, 3),
  ('upload-moment',        'Upload a Moment Post',  'Share a photo or short video with the community.', 'Content',  400, '/task/upload-moment',                    true,  4),
  ('complete-profile',     'Complete Your Profile', 'Finish your profile so better matches find you.',   'Newcomer', 500, '/profile/edit',                          false, 5)
on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      category = excluded.category,
      reward_coins = excluded.reward_coins,
      action_route = excluded.action_route,
      requires_upload = excluded.requires_upload,
      sort_order = excluded.sort_order;

notify pgrst, 'reload schema';
commit;