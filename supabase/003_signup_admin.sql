begin;
create table if not exists public.kp_signup_admins (
  email text primary key check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);
alter table public.kp_signup_admins enable row level security;
revoke all on public.kp_signup_admins from anon, authenticated;
-- Access is provisioned by the database owner; no public API can add administrators.
commit;
