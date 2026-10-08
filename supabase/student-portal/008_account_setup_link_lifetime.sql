begin;

-- The email carries a random, revocable setup invitation. Supabase still issues
-- its short-lived, one-time Auth token only when the recipient submits the form.
alter table public.kp_account_invitations drop constraint if exists kp_account_invitations_token_type_check;
alter table public.kp_account_invitations add constraint kp_account_invitations_token_type_check
  check (token_type in ('invite','magiclink','setup'));
alter table public.kp_account_invitations drop constraint if exists kp_account_invitations_check;
alter table public.kp_account_invitations add constraint kp_account_invitations_check
  check (expires_at > created_at and expires_at <= created_at +
    case when token_type='setup' then interval '14 days' else interval '1 hour' end);
alter table public.kp_account_invitations add column if not exists exchange_count integer not null default 0;
alter table public.kp_account_invitations add column if not exists last_exchange_at timestamptz;

commit;
