-- Keep registrations recoverable; removing one class signup never deletes the learner.
alter table public.kp_course_interest add column if not exists removed_at timestamptz;
