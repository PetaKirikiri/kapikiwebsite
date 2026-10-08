begin;
create table if not exists public.kp_account_setup_notifications (
  invitation_id uuid primary key references public.kp_account_invitations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  department_group text not null,
  selected_level integer not null,
  completed_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','uncertain')),
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  attempted_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0,
  gmail_message_id text,
  error_code text
);
alter table public.kp_account_setup_notifications enable row level security;
revoke all on public.kp_account_setup_notifications from public, anon, authenticated;
create or replace function public.kp_queue_account_setup_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kp_account_setup_notifications
    (invitation_id,user_id,student_name,student_email,department_group,selected_level,completed_at)
    select new.id,new.user_id,r.name,new.email,coalesce(r.department_group,''),r.selected_level,new.completed_at
    from public.kp_course_interest r where r.id=new.selected_interest_id
    on conflict (invitation_id) do nothing;
  return new;
end;
$$;
revoke all on function public.kp_queue_account_setup_notification() from public, anon, authenticated;
create or replace trigger kp_account_setup_notification_after_complete
  after update of completed_at on public.kp_account_invitations
  for each row when (old.completed_at is null and new.completed_at is not null)
  execute function public.kp_queue_account_setup_notification();
commit;
