begin;
alter table public.kp_course_interest
  add column if not exists department_group text
  check (department_group is null or length(department_group) <= 160);
-- Preserve the existing direct-insert path used by local previews.
grant insert (department_group) on public.kp_course_interest to anon, authenticated;
commit;
