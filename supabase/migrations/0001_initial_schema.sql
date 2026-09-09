-- Personal Project Tracker — initial schema
-- ARCHITECTURE.md §12–§14

-- ---------- Enums ----------
create type client_status  as enum ('active', 'inactive', 'archived');
create type project_type    as enum ('client', 'company', 'personal', 'maintenance', 'other');
create type project_status  as enum ('active', 'on_hold', 'completed', 'archived');
create type priority_level  as enum ('low', 'medium', 'high', 'urgent');
create type task_status      as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');
create type activity_type    as enum (
  'task_created', 'task_completed', 'task_updated', 'task_reopened',
  'project_created', 'project_updated', 'status_changed', 'note_added', 'manual_activity'
);

-- ---------- profiles ----------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- clients ----------
create table clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  company_name text,
  email        text,
  notes        text,
  status       client_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- projects ----------
create table projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  client_id        uuid references clients (id) on delete set null,
  name             text not null,
  description      text,
  type             project_type not null default 'client',
  status           project_status not null default 'active',
  priority         priority_level not null default 'medium',
  deadline         date,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- tasks ----------
create table tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  project_id        uuid not null references projects (id) on delete cascade,
  title             text not null,
  description       text,
  status            task_status not null default 'todo',
  priority          priority_level not null default 'medium',
  due_date          date,
  completed_at      timestamptz,
  estimated_minutes integer,
  actual_minutes    integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------- activity_logs ----------
create table activity_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid references projects (id) on delete cascade,
  task_id       uuid references tasks (id) on delete cascade,
  activity_type activity_type not null,
  description   text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
