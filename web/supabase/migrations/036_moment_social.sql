-- 036: Moment social interactions (reactions + comments).
--
-- The home media feed renders one `moments` row at a time and needs real
-- engagement to sit alongside it. Both tables are keyed to a moment and
-- cascade-delete with it, so removing a moment removes its engagement.
--
-- UNIQUENESS: a member can react to a moment once (unique on
-- (moment_id, user_id)) and post many comments. Reaction counts are derived
-- by counting rows rather than cached in a counter column, which cannot drift
-- out of sync with the rows it summarises.
begin;

create table if not exists public.moment_reactions (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'like' check (kind in ('like', 'love', 'fire', 'laugh')),
  created_at timestamptz not null default now(),
  unique (moment_id, user_id)
);

create table if not exists public.moment_comments (
  id uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists moment_reactions_moment_idx
  on public.moment_reactions(moment_id);
create index if not exists moment_comments_moment_created_idx
  on public.moment_comments(moment_id, created_at desc);

alter table public.moment_reactions enable row level security;
alter table public.moment_comments enable row level security;

-- Reactions: readable by everyone (moments are public), writable only by owner.
drop policy if exists "moment_reactions public read" on public.moment_reactions;
create policy "moment_reactions public read" on public.moment_reactions for select using (true);
drop policy if exists "moment_reactions own insert" on public.moment_reactions;
create policy "moment_reactions own insert" on public.moment_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "moment_reactions own delete" on public.moment_reactions;
create policy "moment_reactions own delete" on public.moment_reactions for delete using (auth.uid() = user_id);

-- Comments: same ownership boundary, plus public read.
drop policy if exists "moment_comments public read" on public.moment_comments;
create policy "moment_comments public read" on public.moment_comments for select using (true);
drop policy if exists "moment_comments own insert" on public.moment_comments;
create policy "moment_comments own insert" on public.moment_comments for insert with check (auth.uid() = user_id);
drop policy if exists "moment_comments own delete" on public.moment_comments;
create policy "moment_comments own delete" on public.moment_comments for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
commit;