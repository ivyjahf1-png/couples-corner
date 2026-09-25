-- 033: Store catalog, user inventory (bag), and Aristocracy tier activation.
-- Purchases are coin-based, recorded in the game_ledger, and grant 30-day
-- inventory rows that can be equipped as the active profile frame/effect.
begin;

-- Store catalog. Seeded per category; up to 50 items per category.
create table if not exists public.store_items (
  id text primary key,
  category text not null check (category in ('Frames','Vehicles','Room Entry Effects','Bubbles','Room Cards','Themes')),
  name text not null,
  description text,
  icon text,
  price integer not null check (price >= 0),
  duration_days integer not null default 30,
  gradient text,
  badge text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists store_items_category_idx on public.store_items(category, sort_order);

-- Which user owns which purchased item, and whether it is currently equipped.
create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.store_items(id) on delete cascade,
  kind text not null check (kind in ('purchase','aristocracy')),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists user_inventory_user_idx on public.user_inventory(user_id, equipped, expires_at desc);
create unique index if not exists user_inventory_user_item_idx
  on public.user_inventory(user_id, item_id, kind) where expires_at is null;
create unique index if not exists user_inventory_active_key_idx
  on public.user_inventory(user_id, kind) where equipped;

-- Aristocracy tier activations (30-day plans).
create table if not exists public.aristocracy_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null,
  coins_spent integer not null,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists aristocracy_activations_user_idx
  on public.aristocracy_activations(user_id, expires_at desc);

alter table public.store_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.aristocracy_activations enable row level security;

drop policy if exists "store_items public read" on public.store_items;
create policy "store_items public read" on public.store_items for select using (active = true);

drop policy if exists "users read own inventory" on public.user_inventory;
create policy "users read own inventory" on public.user_inventory
  for select using (auth.uid() = user_id);
drop policy if exists "users manage own inventory" on public.user_inventory;
create policy "users manage own inventory" on public.user_inventory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users read own aristocracy" on public.aristocracy_activations;
create policy "users read own aristocracy" on public.aristocracy_activations
  for select using (auth.uid() = user_id);
drop policy if exists "users manage own aristocracy" on public.aristocracy_activations;
create policy "users manage own aristocracy" on public.aristocracy_activations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
commit;
