-- ============================================================
-- 023: Likes, automated bot onboarding system, and user locations
-- ============================================================

begin;

-- 1) Likes: who liked whose profile (bots included).
create table if not exists public.profile_likes (
  id uuid primary key default gen_random_uuid(),
  liker_id uuid not null,
  liked_user_id uuid not null,
  is_bot boolean not null default false,
  is_blurred boolean not null default false,
  created_at timestamptz not null default now(),
  unique (liker_id, liked_user_id)
);

-- 2) One-time bot onboarding marker (idempotency guard).
create table if not exists public.bot_setup_log (
  user_id uuid primary key,
  processed_at timestamptz not null default now()
);

-- 3) Geolocation coordinates for worldwide "near me" distance sorting.
create table if not exists public.user_locations (
  user_id uuid primary key,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamptz not null default now()
);

create index if not exists profile_likes_liked_idx on public.profile_likes (liked_user_id, created_at desc);
create index if not exists profile_likes_liker_idx on public.profile_likes (liker_id);
create index if not exists user_locations_latlng_idx on public.user_locations (latitude, longitude);

alter table public.profile_likes enable row level security;
alter table public.bot_setup_log enable row level security;
alter table public.user_locations enable row level security;

revoke all on public.profile_likes, public.bot_setup_log, public.user_locations from anon, authenticated;
grant select on public.profile_likes, public.user_locations to authenticated;
grant all on public.profile_likes, public.bot_setup_log, public.user_locations to service_role;

drop policy if exists likes_owner_read on public.profile_likes;
create policy likes_owner_read on public.profile_likes
  for select to authenticated
  using (auth.uid() = liked_user_id);

drop policy if exists locations_owner_read on public.user_locations;
create policy locations_owner_read on public.user_locations
  for select to authenticated
  using (true);

-- ============================================================
-- Bot onboarding function
-- ============================================================
create or replace function public.process_bot_onboarding(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_bot_id uuid;
  v_processed integer := 0;
  v_i integer;
  v_seed_messages text[] := array[
    'Hey there! 👋 Saw your profile and had to say hi — how is your week going?',
    'Hi! I love your energy. What do you two enjoy doing together on weekends?',
    'Hello! 👋 Your smile in your photos is amazing. What is your story?',
    'Hey! We seem to have a few interests in common — coffee or long walks?',
    'Hi there! New here too — the community feels warm. How are you finding it?',
    'Hello 😊 What is the best trip you have ever taken together?'
  ];
  v_bot_names text[] := array[
    'Amara & Tunde', 'Sophie & James', 'Lena & Marco', 'Nadia & Omar', 'Grace & Daniel',
    'Chloe & Ryan', 'Maya & Ethan', 'Zara & Liam', 'Ivy & Noah', 'Ruby & Caleb',
    'Ella & Jonah', 'Aisha & Musa', 'Nora & Felix', 'Tara & Adrian', 'Bella & Victor',
    'Lucy & Henry', 'Ada & Chidi', 'Mila & Andre', 'Sade & Kunle', 'Emma & Oliver',
    'Kemi & Femi', 'Hana & Yosef', 'Nina & Paulo', 'Ifeoma & Emeka', 'Rosa & Diego',
    'Tola & Segun', 'Ava & Jack', 'Lola & Wale', 'Zoe & Max', 'Funke & Dapo'
  ];
  v_bios text[] := array[
    'Married couple exploring life one adventure at a time. 🌍',
    'We love cooking, road trips and deep conversations.',
    'Partners in crime since 2019 — looking for genuine friends.',
    'Weekend hikers, board-game lovers, and hopeless romantics.',
    'Building our little corner of the world together. 💛',
    'Foodies, film buffs, and Sunday-market people.'
  ];
  v_occupations text[] := array[
    'Teacher', 'Software Engineer', 'Nurse', 'Photographer', 'Chef',
    'Architect', 'Marketing Lead', 'Physiotherapist', 'Farmer', 'Designer'
  ];
  v_interest_sets text[][] := array[
    array['travel', 'food'],
    array['music', 'family'],
    array['photography', 'fitness'],
    array['movies', 'art']
  ];
begin
  FOR v_user IN
    SELECT au.id
    FROM auth.users au
    WHERE au.created_at <= now() - interval '2 days'
      AND NOT EXISTS (SELECT 1 FROM public.bot_setup_log b WHERE b.user_id = au.id)
    LIMIT p_limit
  LOOP
    BEGIN
      FOR v_i IN 1..30 LOOP
        v_bot_id := gen_random_uuid();

        DECLARE
          v_conv_id uuid := gen_random_uuid();
          v_name text := v_bot_names[1 + ((v_i - 1) % array_length(v_bot_names, 1))];
          v_bio text := v_bios[1 + ((v_i - 1) % array_length(v_bios, 1))];
          v_occupation text := v_occupations[1 + ((v_i - 1) % array_length(v_occupations, 1))];
          v_msg text := v_seed_messages[1 + ((v_i - 1) % array_length(v_seed_messages, 1))];
          v_interests text[] := v_interest_sets[1 + ((v_i - 1) % array_length(v_interest_sets, 1))];
        BEGIN
          INSERT INTO public.profiles (
            id, user_id, display_name, bio, occupation, interests, photos,
            visibility, discoverable, preferences, created_at, updated_at
          )
          VALUES (
            v_bot_id, v_bot_id, v_name, v_bio, v_occupation,
            v_interests,
            '[]'::jsonb,
            'public', true,
            jsonb_build_object('is_bot', true, 'owner_user_id', v_user.id),
            now() - (random() * (interval '30 days')), now()
          )
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO public.conversations (
            id, type, participant_user_ids, created_by_id,
            last_message_at, created_at, updated_at
          )
          VALUES (
            v_conv_id, 'person', ARRAY[v_user.id, v_bot_id]::uuid[], v_user.id,
            now() - (random() * (interval '36 hours')),
            now() - (random() * (interval '48 hours')), now()
          )
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO public.messages (
            conversation_id, sender_id, type, body,
            read_at, created_at, updated_at
          )
          VALUES (
            v_conv_id, v_bot_id, 'text', v_msg,
            NULL, now() - (random() * (interval '36 hours')), now()
          );
        END;
      END LOOP;

      INSERT INTO public.profile_likes (liker_id, liked_user_id, is_bot, is_blurred, created_at)
      SELECT b.user_id, v_user.id, true, true, now() - (random() * interval '2 days')
      FROM public.profiles b
      WHERE b.preferences ->> 'is_bot' = 'true'
        AND b.user_id <> v_user.id
      LIMIT 10
      ON CONFLICT (liker_id, liked_user_id) DO NOTHING;

      INSERT INTO public.bot_setup_log (user_id) VALUES (v_user.id)
      ON CONFLICT (user_id) DO NOTHING;

      v_processed := v_processed + 1;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'bot onboarding failed for %: %', v_user.id, sqlerrm;
    END;
  END LOOP;

  RETURN v_processed;
END;
$$;

grant execute on function public.process_bot_onboarding(integer) to service_role;
revoke execute on function public.process_bot_onboarding(integer) from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('couples-corner-bot-onboarding')
    where exists (select 1 from cron.job where jobname = 'couples-corner-bot-onboarding');
    perform cron.schedule(
      'couples-corner-bot-onboarding',
      '0 * * * *',
      'select public.process_bot_onboarding(50);'
    );
  end if;
end $$;

notify pgrst, 'reload schema';
commit;