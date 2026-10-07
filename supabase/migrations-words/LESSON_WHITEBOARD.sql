begin;
-- Live lesson rooms can hold a teacher and their class; game rooms remain capped in the API.
alter table public.classroom_live_member drop constraint if exists classroom_live_member_seat_check;
alter table public.classroom_live_member add constraint classroom_live_member_seat_check check (seat between 0 and 31);
commit;
