begin;
create table if not exists public.classroom_live_room (
 id text primary key,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '48 hours',
 closed boolean not null default false,
 state jsonb not null default '{"exercise":"guess-who","round":0,"completed":0,"statement":null,"reset":0}'::jsonb
);
create table if not exists public.classroom_live_member (
 room_id text not null references public.classroom_live_room(id) on delete cascade,
 token_hash text not null,
 seat smallint not null check(seat between 0 and 3),
 name text not null check(length(name) between 1 and 60),
 x double precision not null default 400,
 y double precision not null default 430,
 movement integer not null default 0,
 look text not null default 'female' check(look in ('male','female')),
 color text not null default '#398aa6',
 marks jsonb not null default '[]',
 eliminated jsonb not null default '[]',
 guess smallint check(guess between 0 and 11),
 correct boolean,
 last_seen timestamptz not null default now(),
 primary key(room_id, token_hash), unique(room_id, seat)
);
create table if not exists public.classroom_live_message (
 id uuid primary key,
 room_id text not null references public.classroom_live_room(id) on delete cascade,
 seat smallint not null,
 text text not null check(length(text) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists classroom_live_message_room on public.classroom_live_message(room_id,created_at);
alter table public.classroom_live_room enable row level security;
alter table public.classroom_live_member enable row level security;
alter table public.classroom_live_message enable row level security;
revoke all on public.classroom_live_room, public.classroom_live_member, public.classroom_live_message from anon, authenticated;
alter table public.classroom_live_member drop constraint if exists classroom_live_member_guess_check;
alter table public.classroom_live_member add constraint classroom_live_member_guess_check check(guess between 0 and 11);
commit;
