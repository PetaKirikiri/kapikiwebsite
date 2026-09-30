begin;
create table if not exists public.kp_signup_notifications (
  signup_id uuid primary key references public.kp_course_interest(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','uncertain')),
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  attempted_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0,
  gmail_message_id text,
  error_code text
);
alter table public.kp_signup_notifications enable row level security;
revoke all on public.kp_signup_notifications from public, anon, authenticated;
create or replace function public.kp_queue_signup_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.kp_signup_notifications(signup_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.kp_queue_signup_notification() from public, anon, authenticated;
create or replace trigger kp_signup_notification_after_insert
after insert on public.kp_course_interest
for each row execute function public.kp_queue_signup_notification();
commit;
