begin;
alter table public.kp_lesson_plans add column if not exists curriculum_payload jsonb;
commit;
