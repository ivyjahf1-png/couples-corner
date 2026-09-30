-- Couples Corner: persistent likes on feed posts
--
-- WHY THIS EXISTS: PostCard's like button was local-only UI state (a
-- `TODO(Firebase)` optimistic flip). A like evaporated on refresh, on remount, or
-- the moment the server re-rendered the feed — which is the same "it snapped back
-- down" class of bug the moment reactions had, and the reason a member could never
-- tell whether a like had registered.
--
-- Shape mirrors public.moment_reactions (migration 036) exactly: one row per
-- (post, member), enforced by a primary key rather than a separate unique index,
-- so a double-tap races to an insert failure instead of silently creating two
-- likes and inflating the count.

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- The feed counts likes per post on every render, so the read path is always
-- "all likes for these posts". A composite index leading with post_id serves that
-- directly; without it every count is a sequential scan of the whole table.
create index if not exists idx_post_likes_post on public.post_likes(post_id, created_at desc);

-- "Which posts did I like?" — the viewer's own likes, for seeding the card state.
create index if not exists idx_post_likes_user on public.post_likes(user_id, created_at desc);

alter table public.post_likes enable row level security;

-- Likes are as public as the post they sit on: a member must be able to see who
-- liked something in order to understand the count they are looking at.
drop policy if exists "post_likes_select_public" on public.post_likes;
create policy "post_likes_select_public" on public.post_likes
  for select using (
    exists (
      select 1 from public.posts
      where posts.id = post_likes.post_id
        and (
          posts.visibility = 'public'
          or auth.uid() = posts.author_id
        )
    )
  );

-- Writes are scoped to the session, NOT to a user_id passed from the client. The
-- RLS `with check` is the enforcement; the action merely stops an honest mistake
-- before it becomes a policy violation error.
drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own" on public.post_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own" on public.post_likes
  for delete using (auth.uid() = user_id);