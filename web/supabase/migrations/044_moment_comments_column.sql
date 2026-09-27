-- 044: reconcile moment_comments with the deployed schema.
--
-- WHY: migration 036 declares the comment text column as `body`, but the
-- column that actually exists in the deployed database is named `comment`.
-- Every write using `body` therefore failed with
--
--     PGRST204: Could not find the 'body' column of 'moment_comments'
--     in the schema cache
--
-- which the feed surfaced to members as "Could not post your comment". The
-- read path failed the same way, so existing comments never rendered either.
--
-- This migration is IDEMPOTENT and safe to re-run, and it renames `body` to
-- `comment` ONLY IF `comment` does not already exist. That handles both
-- directions of the drift:
--
--   • A database that already has `comment` (the live one) is left untouched.
--   • A fresh database built from 036, which has `body`, gets renamed to
--     `comment` so a rebuilt environment matches production.
--
-- Either way the end state is the same: the column is named `comment`.
--
-- Verified against the live database before writing this.

begin;

do $$
declare
  v_has_body    boolean;
  v_has_comment boolean;
begin
  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'moment_comments'
        and column_name = 'body'
    ),
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'moment_comments'
        and column_name = 'comment'
    )
  into v_has_body, v_has_comment;

  if v_has_body and not v_has_comment then
    -- Fresh build from 036: rename to match production.
    alter table public.moment_comments rename column body to comment;
    raise notice 'moment_comments: renamed body -> comment';
  elsif v_has_body and v_has_comment then
    -- Both present: fold `body` into `comment`, then drop the stale column.
    -- Prefer whichever holds real content rather than blindly overwriting.
    if exists (select 1 from public.moment_comments where body is not null and comment is null) then
      update public.moment_comments set comment = body where comment is null;
      raise notice 'moment_comments: copied body into comment';
    end if;
    alter table public.moment_comments drop column body;
    raise notice 'moment_comments: dropped redundant body column';
  end if;

  -- Whatever happened above, guarantee the column every code path expects.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'moment_comments'
      and column_name = 'comment'
  ) then
    raise exception 'moment_comments has neither body nor comment; needs manual review';
  end if;
end
$$;

notify pgrst, 'reload schema';
commit;
