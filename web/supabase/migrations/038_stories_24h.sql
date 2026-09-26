-- 038: 24-hour expiring stories + engagement.
--
-- WHY A NEW TABLE: stories were being stored in `user_media` with a "story"
-- caption, which has no expiry and no viewer. A status must disappear after
-- 24 hours and must carry its own reactions/comments, so it needs its own
-- tables rather than a convention on the permanent profile gallery.
--
-- EXPIRY: `expires_at` is written as now() + 24h at insert time and every
-- read filters on it server-side (`gt("expires_at", now)`). Storing the
-- timestamp rather than computing 24h at read time means the window is fixed
-- when the story is posted, and a stale client can never widen it. The
-- `stories_expires_idx` supports the filter; rows are never hard-deleted, so a
-- story that lapsed is simply invisible and its storage object is reclaimed by
-- a later cleanup job.
begin;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- The hot query is always "active stories, newest first".
create index if not exists stories_expires_idx
  on public.stories(expires_at desc);
create index if not exists stories_user_created_idx
  on public.stories(user_id, created_at desc);

create table if not exists public.story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'like' check (kind in ('like', 'love', 'fire', 'laugh')),
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists story_reactions_story_idx on public.story_reactions(story_id);
create index if not exists story_comments_story_created_idx
  on public.story_comments(story_id, created_at desc);

alter table public.stories enable row level security;
alter table public.story_reactions enable row level security;
alter table public.story_comments enable row level security;

-- Stories are read by any signed-in member, but ONLY while unexpired. The
-- expiry predicate is repeated in the policy (not just the query) so a lapsed
-- story is unreadable even if some future code path forgot to filter.
drop policy if exists "stories active read" on public.stories;
create policy "stories active read" on public.stories
  for select using (expires_at > now());
drop policy if exists "stories own insert" on public.stories;
create policy "stories own insert" on public.stories
  for insert with check (auth.uid() = user_id);
drop policy if exists "stories own delete" on public.stories;
create policy "stories own delete" on public.stories
  for delete using (auth.uid() = user_id);

drop policy if exists "story_reactions public read" on public.story_reactions;
create policy "story_reactions public read" on public.story_reactions
  for select using (true);
drop policy if exists "story_reactions own insert" on public.story_reactions;
create policy "story_reactions own insert" on public.story_reactions
  for insert with check (auth.uid() = user_id);
drop policy if exists "story_reactions own delete" on public.story_reactions;
create policy "story_reactions own delete" on public.story_reactions
  for delete using (auth.uid() = user_id);

drop policy if exists "story_comments public read" on public.story_comments;
create policy "story_comments public read" on public.story_comments
  for select using (true);
drop policy if exists "story_comments own insert" on public.story_comments;
create policy "story_comments own insert" on public.story_comments
  for insert with check (auth.uid() = user_id);
drop policy if exists "story_comments own delete" on public.story_comments;
create policy "story_comments own delete" on public.story_comments
  for delete using (auth.uid() = user_id);

-- Backfill: existing "story" rows in user_media become real, dated stories so
-- the tray is not empty after this migration. Anything already older than a day
-- is deliberately NOT migrated — it would be invisible anyway.
insert into public.stories (user_id, storage_path, media_type, caption, created_at, expires_at)
select um.user_id, um.storage_path, um.media_type, um.caption, um.created_at, um.created_at + interval '24 hours'
from public.user_media um
where lower(coalesce(um.caption, '')) = 'story'
  and um.created_at > now() - interval '24 hours';

notify pgrst, 'reload schema';
commit;
