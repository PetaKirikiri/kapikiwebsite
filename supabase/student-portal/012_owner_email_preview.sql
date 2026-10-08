begin;
alter table public.kp_account_setup_notifications add column if not exists owner_preview jsonb;
comment on column public.kp_account_setup_notifications.owner_preview is 'Trusted owner-only email preview. No client writes or recipient overrides.';
commit;
