-- Epic F: simple time tracking. One running entry per user at a time (app-enforced).

create table time_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  task_id    uuid not null references tasks (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  note       text,
  created_at timestamptz not null default now()
);

alter table time_entries enable row level security;
create policy "time_entries — all" on time_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index time_entries_user_running_idx
  on time_entries (user_id)
  where ended_at is null;
create index time_entries_task_idx    on time_entries (task_id);
create index time_entries_project_idx on time_entries (project_id, started_at desc);
