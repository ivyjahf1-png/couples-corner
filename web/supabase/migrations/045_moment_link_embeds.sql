-- 045: allow link-embedded moments (YouTube / TikTok / Instagram).
--
-- WHY: the Upload a Moment screen gains a second option alongside direct file
-- upload, where the member pastes a link to a video hosted elsewhere rather
-- than uploading the bytes. The feed then renders an embed player instead of a
-- <video> element.
--
-- WHY THIS NEEDS A MIGRATION: `moments` is constrained two ways that forbid it.
--
--   1. `media_type` has check (media_type in ('image','video')). A link is a
--      third kind of thing, so 'link' has to be admitted to the constraint.
--   2. `media_url` is NOT NULL. Rather than relaxing that (which would also
--      let a genuine upload row go missing its file), the embed URL is stored in
--      media_url itself. One column holds "where the media lives" for both
--      cases, so the existing feed query needs no change to keep working, and a
--      link moment is still addressable by a deep link exactly like any other.
--
-- IDEMPOTENT: safe to run on a database where this was never applied, and a
-- no-op on one where it already is.
--
-- The constraint is looked up by name via pg_constraint rather than assumed to
-- be called `moments_media_type_check`, because the auto-generated name
-- depends on how the table was created and differs between migration 034's
-- `create table` and a manual setup.

begin;

do $$
declare
  v_constraint text;
begin
  -- Find the existing check on media_type, whatever it is named.
  select con.conname into v_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'moments'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%media_type%'
  limit 1;

  if v_constraint is not null then
    -- Only rewrite if 'link' is not already permitted, so re-running does not
    -- churn the constraint.
    if not exists (
      select 1 from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'public'
        and rel.relname = 'moments'
        and con.conname = v_constraint
        and pg_get_constraintdef(con.oid) ilike '%link%'
    ) then
      execute format('alter table public.moments drop constraint %I', v_constraint);
      raise notice 'moment: dropped % to allow link embeds', v_constraint;
    end if;
  end if;

  -- Re-assert, so the end state is guaranteed whether or not a constraint
  -- existed above.
  if not exists (
    select 1 from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'moments'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%media_type%'
      and pg_get_constraintdef(con.oid) ilike '%link%'
  ) then
    alter table public.moments
      add constraint moments_media_type_check
      check (media_type in ('image', 'video', 'link'));
    raise notice 'moment: media_type now allows link';
  end if;
end
$$;

-- `moments_created_idx` already covers the feed's ordering. This index exists
-- for moderation: finding every link-embedded moment by type, which is the
-- review queue for a surface that pulls third-party content into the app.
create index if not exists moments_link_idx
  on public.moments (created_at desc)
  where media_type = 'link';

notify pgrst, 'reload schema';
commit;
