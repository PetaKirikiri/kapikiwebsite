create table if not exists public.kp_invitation_mail (
 invitation_id uuid primary key references public.kp_account_invitations(id),
 recipient text not null, subject text not null, text text not null, html text not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','uncertain')),
 attempts integer not null default 0, attempted_at timestamptz, sent_at timestamptz,
 gmail_message_id text, error_code text, created_at timestamptz not null default now()
);
alter table public.kp_invitation_mail enable row level security;
revoke all on public.kp_invitation_mail from anon,authenticated;
