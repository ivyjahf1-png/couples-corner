-- Couples Corner: user-generated media and posts
-- Enables: 10 media per user, post creation with media, public gallery

-- User posts (timeline/feed items)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  media_urls text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User media gallery (profile photos, videos)
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

-- Friend graph (referenced by the posts 'friends' visibility policy)
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

create index if not exists idx_friends_friend on public.friends(friend_id);

-- Index for fast lookups
create index if not exists idx_posts_author on public.posts(author_id, created_at desc);
create index if not exists idx_posts_visibility on public.posts(visibility, created_at desc);
create index if not exists idx_user_media_user on public.user_media(user_id, sort_order);

-- RLS: posts
alter table public.posts enable row level security;

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
  for update using (auth.uid() = author_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = author_id);

-- RLS: user_media
alter table public.user_media enable row level security;

drop policy if exists "media_select_public" on public.user_media;
create policy "media_select_public" on public.user_media
  for select using (true); -- everyone can see all media (gallery is public)

drop policy if exists "media_insert_own" on public.user_media;
create policy "media_insert_own" on public.user_media
  for insert with check (
    auth.uid() = user_id
    and (select count(*) from public.user_media where user_id = auth.uid()) < 10
  );

drop policy if exists "media_update_own" on public.user_media;
create policy "media_update_own" on public.user_media
  for update using (auth.uid() = user_id);

drop policy if exists "media_delete_own" on public.user_media;
create policy "media_delete_own" on public.user_media
  for delete using (auth.uid() = user_id);

-- Storage policies for user-media bucket
-- (assumes bucket already exists; adjust name as needed)
insert into storage.buckets (id, name, public)
values ('user-media', 'user-media', true)
on conflict (id) do nothing;

drop policy if exists "storage_select" on storage.objects;
create policy "storage_select" on storage.objects
  for select using (bucket_id = 'user-media');

drop policy if exists "storage_insert" on storage.objects;
create policy "storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "storage_delete" on storage.objects;
create policy "storage_delete" on storage.objects
  for delete using (
    bucket_id = 'user-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
