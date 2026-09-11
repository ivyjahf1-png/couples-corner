-- ============================================================
-- Migration: Broadcasts + Support tickets (admin modules)
-- ============================================================

-- Platform-wide broadcast / announcement announcements sent by admins.
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all',
  type text not null default 'announcement',
  created_by uuid,
  status text not null default 'draft',
  targeted_user_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

-- User-submitted support inquiries, answered by admins.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  category text not null default 'other',
  subject text not null,
  message text not null,
  status text not null default 'open',
  admin_user_id uuid,
  admin_reply text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: enabled for both (defense-in-depth; admin server client bypasses it).
alter table public.broadcasts enable row level security;
alter table public.support_tickets enable row level security;

-- Only admins / server writes. Simple RLS policies (service role bypasses via
-- Supabase; these are gateways for any client/anon access).
create policy if not exists "broadcasts are admin-only"
  on public.broadcasts for all
  using (false)
  with check (false);

create policy if not exists "support tickets are admin-only"
  on public.support_tickets for all
  using (false)
  with check (false);