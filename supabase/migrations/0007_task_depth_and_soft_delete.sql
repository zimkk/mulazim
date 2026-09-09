-- Epic C (task depth) + Epic E (review) + Epic H (soft delete) schema.

-- ---------- Enums ----------
create type recurrence as enum ('none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly');

-- ---------- tasks: new columns ----------
alter table tasks
  add column start_date       date,
  add column sort_order       double precision not null default 0,
  add column recurrence       recurrence not null default 'none',
  add column recurrence_until date,
  add column deleted_at       timestamptz;

-- ---------- projects: review + organisation ----------
alter table projects
  add column review_interval_days integer,           -- null = no review cadence
  add column last_reviewed_at      timestamptz,
  add column pinned                boolean not null default false,
  add column color                 text,
  add column sort_order            double precision not null default 0,
  add column deleted_at            timestamptz;

-- ---------- clients: soft delete ----------
alter table clients add column deleted_at timestamptz;

-- ---------- subtasks / checklist ----------
create table subtasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  task_id    uuid not null references tasks (id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- tags ----------
create table tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default 'slate',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table task_tags (
  task_id uuid not null references tasks (id) on delete cascade,
  tag_id  uuid not null references tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (task_id, tag_id)
);

-- ---------- RLS ----------
alter table subtasks  enable row level security;
alter table tags      enable row level security;
alter table task_tags enable row level security;

create policy "subtasks — all"  on subtasks  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tags — all"      on tags      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "task_tags — all" on task_tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- updated_at triggers ----------
create trigger subtasks_set_updated_at before update on subtasks
  for each row execute function public.set_updated_at();

-- ---------- indexes ----------
create index tasks_start_date_idx    on tasks (start_date);
create index tasks_deleted_at_idx    on tasks (deleted_at);
create index tasks_sort_order_idx    on tasks (project_id, sort_order);
create index projects_deleted_at_idx on projects (deleted_at);
create index projects_pinned_idx     on projects (pinned) where pinned;
create index clients_deleted_at_idx  on clients (deleted_at);
create index subtasks_task_id_idx    on subtasks (task_id, sort_order);
create index tags_user_id_idx        on tags (user_id);
create index task_tags_tag_id_idx    on task_tags (tag_id);
