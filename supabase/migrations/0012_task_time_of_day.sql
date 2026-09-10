-- Optional time-of-day for tasks.
--
-- Until now a task had a due *date* only, so a calendar could not place it in
-- an hour and week/day views had nothing to lay out against. This adds an
-- optional clock time alongside the existing date.
--
-- Nullable on purpose: a task with no time is an "all-day" item, which is what
-- every existing row becomes. That keeps the whole dataset valid without a
-- backfill and matches how calendars normally separate all-day items from
-- timed ones. `due_date` stays the source of truth for *whether* something is
-- scheduled; `due_time` only refines *when* within that day.

alter table tasks
  add column if not exists due_time      time,
  -- How long the task is expected to occupy, for rendering a block rather than
  -- a point. Falls back to estimated_minutes, then a default, at render time.
  add column if not exists duration_minutes integer;

comment on column tasks.due_time is
  'Optional clock time on due_date. NULL = all-day task.';
comment on column tasks.duration_minutes is
  'Optional length of the scheduled block in minutes. NULL = use estimated_minutes.';

-- Timed tasks are queried per-day in the calendar's week and day views.
create index if not exists tasks_due_date_time_idx
  on tasks (user_id, due_date, due_time)
  where deleted_at is null;
