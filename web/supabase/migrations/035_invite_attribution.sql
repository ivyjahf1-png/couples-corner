-- 035: invite attribution.
--
-- Records who referred a signup so /invite/[code] -> /register?invite=CODE
-- actually converts. `referred_by` is deliberately plain text rather than a
-- self-referencing foreign key: the inviter may later be deleted, and losing
-- the referral record is preferable to blocking or cascading the account row.
--
-- Self-referral is filtered in application code (app/api/auth/register),
-- where the code is resolved and the signed-in uid is known.
begin;

alter table public.users add column if not exists referred_by text;

create index if not exists users_referred_by_idx
  on public.users(referred_by)
  where referred_by is not null;

notify pgrst, 'reload schema';
commit;