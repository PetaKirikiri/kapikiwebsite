alter table public.kp_page_visits add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$');
