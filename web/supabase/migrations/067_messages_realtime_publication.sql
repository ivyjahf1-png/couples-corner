-- Publish `messages` to the Supabase Realtime publication.
--
-- WHY THIS EXISTS. The chat thread's live updates are driven by
-- `useRealtimeMessages`, which subscribes to `postgres_changes` on
-- public.messages. Postgres changes are only delivered for tables that are
-- members of the `supabase_realtime` publication. `messages` was NOT in it, so
-- the subscription connected successfully and then received nothing at all:
-- a message sent from the composer never appeared for the other participant
-- until a manual refresh, and a photo message never appeared at all.
--
-- RLS IS ALREADY IN PLACE, which is the other half of the requirement:
-- realtime's postgres_changes honours the subscriber's RLS policies, so only
-- participants of a conversation receive its rows. `messages_select_participant`
-- (from migration 016) and `messages_insert_participant` are unchanged.
--
-- `alter publication ... add table` throws if the table is already a member, so
-- the membership is checked first and the statement only runs when needed.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;