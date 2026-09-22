-- 027: corrected process_bot_onboarding (FK-safe, CHECK-safe).
-- Same name+signature as 023 so /api/cron/bot-injection is unchanged.
-- Gating (created_at + 2 days) + bot_setup_log idempotency preserved.
create or replace function public.process_bot_onboarding(p_limit integer default 50)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_user record; v_peer_id uuid; v_conv_id uuid; v_processed integer := 0;
  v_msgs text[] := array[
    'Hey there! Saw your profile and had to say hi — how is your week going?',
    'Hi! What do you two enjoy doing together on weekends?',
    'Hello! Your photos are amazing. What is your story?',
    'Hey! Coffee or long walks?',
    'Hi there! How are you finding the community?',
    'Hello! Best trip you have taken together?'];
begin
  for v_user in
    select au.id from auth.users au
    where au.created_at <= now() - interval '2 days'
      and not exists (select 1 from public.bot_setup_log b where b.user_id = au.id)
    order by au.created_at limit p_limit
  loop
    begin
      insert into public.profile_likes (liker_id, liked_user_id, is_bot, is_blurred, created_at)
      select p.id, v_user.id, true, true, now() - (random() * interval '2 days')
      from public.bot_personas p order by p.display_name limit 10
      on conflict (liker_id, liked_user_id) do nothing;
      -- (b) 30 interactive bot threads (3 openers x 10 personas).
      -- bot_messages has no unique constraint, so no ON CONFLICT clause.
      INSERT INTO public.bot_messages (owner_user_id, persona_id, sender, body, created_at)
      SELECT v_user.id, p.id, 'bot',
        v_msgs[1 + ((row_number() over () - 1) % array_length(v_msgs, 1))],
        now() - (random() * interval '36 hours')
      FROM public.bot_personas p cross join generate_series(1, 3) g
      ORDER BY p.display_name, g limit 30;
      select au.id into v_peer_id from auth.users au
      where au.id <> v_user.id order by au.created_at limit 1;
      if v_peer_id is not null then
        v_conv_id := gen_random_uuid();
        begin
          insert into public.conversations
            (id, type, participant_user_ids, created_by_id, last_message_at, created_at, updated_at)
          values (v_conv_id, 'direct', array[v_user.id, v_peer_id], v_user.id, now(), now(), now())
          on conflict (id) do nothing;
          insert into public.messages
            (conversation_id, sender_id, type, body, content, status, created_at, updated_at)
          values (v_conv_id, v_user.id, 'text',
            'Welcome to Couples Corner! Say hello and introduce yourselves.',
            'Welcome to Couples Corner! Say hello and introduce yourselves.',
            'sent', now(), now());
        exception when others then
          raise warning 'welcome thread failed for %: %', v_user.id, sqlerrm;
        end;
      end if;
      insert into public.bot_setup_log (user_id) values (v_user.id)
      on conflict (user_id) do nothing;
      v_processed := v_processed + 1;
    exception when others then
      raise warning 'bot onboarding failed for %: %', v_user.id, sqlerrm;
    end;
  end loop;
  return v_processed;
end; $$;
grant execute on function public.process_bot_onboarding(integer) to service_role;
revoke execute on function public.process_bot_onboarding(integer) from anon, authenticated;
do $$ declare v_jobid integer; begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for v_jobid in select jobid from cron.job where jobname = 'couples-corner-bot-onboarding' loop
      perform cron.unschedule(v_jobid);
    end loop;
    perform cron.schedule('couples-corner-bot-onboarding','0 * * * *','select public.process_bot_onboarding(50);');
  end if;
end $$;
notify pgrst, 'reload schema';
