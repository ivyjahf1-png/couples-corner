-- 1. Create the bot_personas table if it doesn't already exist
create table if not exists public.bot_personas (
  id uuid primary key,
  display_name text not null,
  bio text,
  occupation text,
  interests text[],
  location text,
  created_at timestamptz default now()
);

-- 2. Insert the 10 shared bot personas catalog
insert into public.bot_personas
  (id, display_name, bio, occupation, interests, location)
select v.id, v.display_name, v.bio, v.occupation, v.interests, v.location
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid,'Amara & Tunde','Food tours and Sunday markets.','Nurse & Chef',array['food','travel','music'],'Lagos, Nigeria'),
  ('22222222-2222-4222-8222-222222222222'::uuid,'Sophie & James','Weekend hikers and coffee lovers.','Teacher & Engineer',array['hiking','coffee','photography'],'London, UK'),
  ('33333333-3333-4333-8333-333333333333'::uuid,'Lena & Marco','Salsa dancers who never skip dessert.','Designer & Architect',array['dancing','art','movies'],'Berlin, Germany'),
  ('44444444-4444-4444-8444-444444444444'::uuid,'Nadia & Omar','Newlyweds collecting sunsets.','Doctor & Pilot',array['travel','food','beach'],'Dubai, UAE'),
  ('55555555-5555-4555-8555-555555555555'::uuid,'Grace & Daniel','Board-game champions.','Writer & Developer',array['games','books','plants'],'New York, USA'),
  ('66666666-6666-4666-8666-666666666666'::uuid,'Chloe & Ryan','Road-trippers with playlists.','Photographer & Musician',array['music','road trips','camping'],'Sydney, Australia'),
  ('77777777-7777-4777-8777-777777777777'::uuid,'Maya & Ethan','Museum regulars.','Curator & Chef',array['art','picnics','history'],'Toronto, Canada'),
  ('88888888-8888-4888-8888-888888888888'::uuid,'Zara & Liam','Gym partners turned brunch critics.','Trainer & Banker',array['fitness','brunch','travel'],'Manchester, UK'),
  ('99999999-9999-4999-8999-999999999999'::uuid,'Ivy & Noah','Stargazers.','Scientist & Teacher',array['stargazing','hiking','reading'],'Denver, USA'),
  ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'::uuid,'Ruby & Caleb','Karaoke legends.','Nurse & Mechanic',array['karaoke','sports','movies'],'Atlanta, USA')
) as v (id, display_name, bio, occupation, interests, location)
on conflict (id) do nothing;

notify pgrst, 'reload schema';