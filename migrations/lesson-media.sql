begin;
create table if not exists public.classroom_media_session (
 session_id text primary key,
 room_id text not null,
 token_hash text not null,
 publisher boolean not null default false,
 tracks jsonb not null default '[]',
 created_at timestamptz not null default now(),
 last_seen timestamptz not null default now(),
 closed boolean not null default false,
 foreign key(room_id, token_hash) references public.classroom_live_member(room_id,token_hash) on delete cascade
);
create index if not exists classroom_media_room on public.classroom_media_session(room_id, last_seen);
alter table public.classroom_media_session enable row level security;
revoke all on public.classroom_media_session from anon, authenticated;
commit;
