-- ============================================================
-- Migration: User sessions — active device session tracking
-- Powers the "Active sessions" list on /settings. Each row is
-- one signed-in device (created at login, refreshed on activity).
-- Revocation (`revoked_at`) is enforced by the app's session
-- resolution in lib/server/session.ts, so "sign out device"
-- takes effect on that device's next request.
-- All statements are idempotent — safe to run repeatedly.
-- ============================================================

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  -- sha256 hash of the access token — never the raw token.
  token_hash text not null,
  user_agent text,
  ip_address text,
  device_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint user_sessions_user_token_key unique (user_id, token_hash)
);

alter table public.user_sessions enable row level security;

-- Users may see and delete only their own session rows (the app
-- itself always talks through the service-role server client).
drop policy if exists "user_sessions_select_own" on public.user_sessions;
create policy "user_sessions_select_own"
  on public.user_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "user_sessions_delete_own" on public.user_sessions;
create policy "user_sessions_delete_own"
  on public.user_sessions for delete
  using (auth.uid() = user_id);

create index if not exists user_sessions_user_idx
  on public.user_sessions (user_id, last_seen_at desc);

notify pgrst, 'reload schema';
