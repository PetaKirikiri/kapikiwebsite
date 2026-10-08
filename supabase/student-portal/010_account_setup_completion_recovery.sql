begin;

-- Recover a saved result when the client misses the completion response. This
-- returns no profile data, and only the signed-in invitation owner can read it.
create or replace function public.kp_account_invitation_completed(setup_token text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.kp_account_invitations i
    join auth.users u on u.id=i.user_id and lower(btrim(u.email))=i.email
    where i.user_id=auth.uid() and i.completed_at is not null
      and length(setup_token) between 32 and 256
      and i.token_digest=encode(sha256(convert_to(setup_token, 'UTF8')), 'hex')
  );
$$;
revoke all on function public.kp_account_invitation_completed(text) from public, anon;
grant execute on function public.kp_account_invitation_completed(text) to authenticated;

commit;
