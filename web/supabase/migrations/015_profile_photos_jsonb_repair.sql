-- Repair legacy profiles.photos text[]; ADD COLUMN IF NOT EXISTS did not
-- convert that column to the JSONB array of ProfilePhoto objects the app uses.
-- Run in the Supabase SQL editor. Transactional and safe to rerun.
begin;

-- Temporary conversion helper; malformed data aborts rather than losing photos.
create or replace function pg_temp.normalize_profile_photos(value jsonb)
returns jsonb language plpgsql as $$
declare
  item jsonb;
  converted jsonb;
  raw text;
  result jsonb := '[]'::jsonb;
begin
  if value is null or value = 'null'::jsonb then return '[]'::jsonb; end if;
  if jsonb_typeof(value) <> 'array' then
    raise exception 'profiles.photos must contain an array; repair invalid rows first';
  end if;
  for item in select jsonb_array_elements(value) loop
    if jsonb_typeof(item) = 'string' then
      raw := item #>> '{}';
      -- Some text[] rows contain serialized ProfilePhoto objects.
      begin
        converted := raw::jsonb;
      exception when invalid_text_representation then
        converted := null;
      end;
      if jsonb_typeof(converted) = 'object' then
        item := converted;
      elsif raw like 'https://%' or raw like 'http://%' then
        item := jsonb_build_object('storagePath', '', 'publicUrl', raw,
          'isPrimary', jsonb_array_length(result) = 0);
      elsif raw like '/api/photos/%' then
        item := jsonb_build_object('storagePath', 'profiles/' || substr(raw, 13),
          'isPrimary', jsonb_array_length(result) = 0);
      else
        item := jsonb_build_object('storagePath', raw,
          'isPrimary', jsonb_array_length(result) = 0);
      end if;
    elsif jsonb_typeof(item) <> 'object' then
      raise exception 'Invalid profiles.photos entry; repair invalid rows first';
    end if;
    result := result || jsonb_build_array(item);
  end loop;
  return result;
end $$;

alter table public.profiles add column if not exists photos jsonb default '[]'::jsonb;
-- Drop the legacy text[] default before changing type.
alter table public.profiles alter column photos drop default;
alter table public.profiles alter column photos type jsonb
  using pg_temp.normalize_profile_photos(to_jsonb(photos));
alter table public.profiles alter column photos set default '[]'::jsonb;

alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- RLS controls rows, grants control columns. Do not grant writes to role or
-- identity_verified. The uploader writes photos, not avatar_url.
grant select (user_id, photos, updated_at) on public.profiles to authenticated;
grant update (photos, updated_at) on public.profiles to authenticated;

notify pgrst, 'reload schema';
commit;
