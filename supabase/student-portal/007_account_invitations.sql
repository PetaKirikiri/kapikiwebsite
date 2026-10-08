begin;

-- Only a trusted preparation script issues invitations. Never store a usable
-- Auth token here or accept an email/registration identity from the browser.
create table if not exists public.kp_account_invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  interest_ids uuid[] not null check (cardinality(interest_ids) > 0),
  token_digest text not null unique check (token_digest ~ '^[a-f0-9]{64}$'),
  token_type text not null check (token_type in ('invite', 'magiclink')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  completed_at timestamptz,
  selected_interest_id uuid references public.kp_course_interest(id),
  check (expires_at > created_at and expires_at <= created_at + interval '1 hour'),
  check ((completed_at is null) = (selected_interest_id is null))
);
create index if not exists kp_account_invitations_user on public.kp_account_invitations(user_id);
alter table public.kp_account_invitations enable row level security;
revoke all on public.kp_account_invitations from public, anon, authenticated;

create or replace function public.kp_account_invitation_details(setup_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare invitation public.kp_account_invitations; registration public.kp_course_interest; levels integer[]; department text;
begin
  if setup_token is null or length(setup_token) not between 32 and 256 then return null; end if;
  select * into invitation from public.kp_account_invitations
    where token_digest = encode(sha256(convert_to(setup_token, 'UTF8')), 'hex')
      and expires_at > now() and revoked_at is null and completed_at is null;
  if not found then return null; end if;
  if not exists (select 1 from auth.users where id=invitation.user_id and lower(btrim(email))=invitation.email) then return null; end if;
  select * into registration from public.kp_course_interest
    where id = any(invitation.interest_ids) and lower(btrim(email)) = invitation.email
    order by created_at desc, id desc limit 1;
  if not found then return null; end if;
  select array_agg(distinct selected_level order by selected_level) into levels from public.kp_course_interest
    where id = any(invitation.interest_ids) and lower(btrim(email)) = invitation.email;
  select department_group into department from public.kp_course_interest
    where id = any(invitation.interest_ids) and lower(btrim(email)) = invitation.email
      and nullif(btrim(department_group), '') is not null order by created_at desc, id desc limit 1;
  return jsonb_build_object('userId',invitation.user_id, 'tokenType',invitation.token_type,
    'name',registration.name, 'email',invitation.email, 'selectedLevel',registration.selected_level,
    'registeredLevels',levels, 'departmentGroup',coalesce(department,''));
end;
$$;
revoke all on function public.kp_account_invitation_details(text) from public;
grant execute on function public.kp_account_invitation_details(text) to anon, authenticated;

create or replace function public.kp_complete_account_invitation(setup_token text, student_name text, department_group text, chosen_level integer)
returns void language plpgsql security definer set search_path = '' as $$
declare invitation public.kp_account_invitations; registration public.kp_course_interest;
begin
  if setup_token is null or length(setup_token) not between 32 and 256 then raise exception 'This setup link is invalid or expired.'; end if;
  select * into invitation from public.kp_account_invitations
    where token_digest = encode(sha256(convert_to(setup_token, 'UTF8')), 'hex') for update;
  if not found or invitation.expires_at <= now() or invitation.revoked_at is not null or invitation.completed_at is not null
    or invitation.user_id is distinct from auth.uid() then raise exception 'This setup link is invalid or expired.'; end if;
  if not exists (select 1 from auth.users where id=auth.uid() and lower(btrim(email))=invitation.email
    and email_confirmed_at is not null and coalesce(encrypted_password,'') <> '') then
    raise exception 'Verify your email and set your password first.';
  end if;
  if student_name is null or length(btrim(student_name)) not between 1 and 160
    or department_group is null or length(btrim(department_group)) not between 1 and 160 then
    raise exception 'Please complete your name and department / group.';
  end if;
  select * into registration from public.kp_course_interest
    where id = any(invitation.interest_ids) and lower(btrim(email)) = invitation.email and selected_level=chosen_level
    order by created_at desc, id desc limit 1;
  if not found then raise exception 'Please choose one of your registered levels.'; end if;

  update public.kp_course_interest i set name=btrim(student_name), department_group=btrim(kp_complete_account_invitation.department_group)
    where i.id=any(invitation.interest_ids) and lower(btrim(i.email))=invitation.email;
  insert into public.kp_profiles(user_id,name,selected_level)
    values(invitation.user_id,btrim(student_name),chosen_level)
    on conflict(user_id) do update set name=excluded.name,selected_level=excluded.selected_level,updated_at=now();
  update public.kp_account_invitations set completed_at=now(),selected_interest_id=registration.id where id=invitation.id;
  update public.kp_account_invitations set revoked_at=now() where user_id=invitation.user_id and id<>invitation.id and completed_at is null and revoked_at is null;
  -- Keep the existing onboarding flag in sync. No roles/enrolments are granted.
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object(
    'name',btrim(student_name),'selected_level',chosen_level,'password_setup_complete',true) where id=invitation.user_id;
end;
$$;
revoke all on function public.kp_complete_account_invitation(text,text,text,integer) from public, anon;
grant execute on function public.kp_complete_account_invitation(text,text,text,integer) to authenticated;

-- Preserve the original registrations, but show the confirmed choice in learning.
create or replace function public.kp_my_course_interest()
returns table(id uuid, selected_level integer, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with confirmed as (
    select selected_interest_id,interest_ids from public.kp_account_invitations
    where user_id=auth.uid() and completed_at is not null order by completed_at desc, id desc limit 1
  )
  select i.id,i.selected_level,i.created_at from public.kp_course_interest i
    join auth.users u on u.id=auth.uid()
  where u.email_confirmed_at is not null and lower(btrim(i.email))=lower(btrim(u.email))
    and not exists(select 1 from confirmed c where i.id=any(c.interest_ids) and i.id<>c.selected_interest_id)
  order by i.created_at desc;
$$;
revoke all on function public.kp_my_course_interest() from public, anon;
grant execute on function public.kp_my_course_interest() to authenticated;
commit;
