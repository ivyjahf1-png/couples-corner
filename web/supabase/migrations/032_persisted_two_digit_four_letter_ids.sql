-- Permanent public profile codes: exactly two digits followed by four uppercase letters.
alter table public.profiles add column if not exists user_code text;
create or replace function public.generate_user_code()
returns text language plpgsql security definer set search_path = public as $$
declare candidate text; begin
  loop
    candidate := lpad((floor(random() * 90) + 10)::integer::text, 2, '0')
      || upper(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::integer, 4));
    exit when not exists (select 1 from public.profiles where user_code = candidate);
  end loop; return candidate;
end $$;
alter table public.profiles alter column user_code set default public.generate_user_code();
update public.profiles set user_code = public.generate_user_code() where user_code is null or user_code !~ '^[0-9]{2}[A-Z]{4}$';
do $$ begin
  if exists (select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_user_code_format') then alter table public.profiles drop constraint profiles_user_code_format; end if;
  alter table public.profiles add constraint profiles_user_code_format check (user_code ~ '^[0-9]{2}[A-Z]{4}$');
  if exists (select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_user_code_key') then alter table public.profiles drop constraint profiles_user_code_key; end if;
  alter table public.profiles add constraint profiles_user_code_key unique (user_code);
end $$;
create index if not exists profiles_user_code_idx on public.profiles(user_code);
