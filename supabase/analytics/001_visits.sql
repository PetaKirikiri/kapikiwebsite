create table if not exists public.kp_page_visits (
 id uuid primary key,
 visitor_id uuid not null,
 session_id uuid not null,
 visited_at timestamptz not null default now(),
 path text not null check (length(path) <= 200),
 referrer text,
 device text not null check (device in ('phone','tablet','desktop')),
 user_id uuid,
 email text,
 environment text not null check (environment in ('local','live'))
);
create index if not exists kp_page_visits_recent on public.kp_page_visits(environment, visited_at desc);
create index if not exists kp_page_visits_visitor on public.kp_page_visits(visitor_id, visited_at desc);
alter table public.kp_page_visits enable row level security;
revoke all on public.kp_page_visits from anon, authenticated;
