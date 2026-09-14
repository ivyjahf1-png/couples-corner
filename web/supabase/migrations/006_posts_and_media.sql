-- Posts / moments table with multi-media support
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  media_urls jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "posts_select_public"
  on public.posts for select
  using (true);

create policy "posts_insert_own"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "posts_update_own"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "posts_delete_own"
  on public.posts for delete
  using (auth.uid() = user_id);

create index idx_posts_created_at on public.posts (created_at desc);
create index idx_posts_user_id on public.posts (user_id);

-- Profile photos limit enforcement (10 per user)
-- This is a helper function used by the application layer
create or replace function public.count_profile_photos(target_uid uuid)
returns integer as $$
  select coalesce(jsonb_array_length(photos), 0)
  from public.profiles
  where user_id = target_uid;
$$ language sql stable;
