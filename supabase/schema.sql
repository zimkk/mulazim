-- Combined schema for the Supabase SQL Editor (migrations 0001-0007).

-- === supabase/migrations/0001_initial_schema.sql ===
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

-- === supabase/migrations/0002_rls_policies.sql ===
-- Row Level Security — every user-owned row is scoped to auth.uid()
-- ARCHITECTURE.md §11. Frontend filtering is NOT a security boundary.

alter table profiles      enable row level security;
alter table clients       enable row level security;
alter table projects      enable row level security;
alter table tasks         enable row level security;
alter table activity_logs enable row level security;

-- profiles: a user sees and edits only their own row
create policy "own profile — select" on profiles
  for select using (auth.uid() = id);
create policy "own profile — update" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile — insert" on profiles
  for insert with check (auth.uid() = id);

-- Generic owner policies for the data tables
create policy "clients — all" on clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "projects — all" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks — all" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity_logs — all" on activity_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- === supabase/migrations/0003_indexes.sql ===
-- Indexes for common query columns — ARCHITECTURE.md §14

create index clients_user_id_idx        on clients (user_id);

create index projects_user_id_idx       on projects (user_id);
create index projects_client_id_idx     on projects (client_id);
create index projects_status_idx        on projects (status);
create index projects_last_activity_idx on projects (last_activity_at desc);
create index projects_deadline_idx      on projects (deadline);

create index tasks_user_id_idx          on tasks (user_id);
create index tasks_project_id_idx       on tasks (project_id);
create index tasks_status_idx           on tasks (status);
create index tasks_due_date_idx         on tasks (due_date);

create index activity_user_id_idx       on activity_logs (user_id);
create index activity_project_id_idx    on activity_logs (project_id);
create index activity_task_id_idx       on activity_logs (task_id);
create index activity_created_at_idx    on activity_logs (created_at desc);

-- === supabase/migrations/0004_triggers.sql ===
-- Triggers: profile bootstrap, updated_at maintenance, project activity bump
-- ARCHITECTURE.md §13.1 / §25

-- ---------- Create a profile row when a user signs up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on profiles
  for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on clients
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on projects
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on tasks
  for each row execute function public.set_updated_at();

-- ---------- Bump projects.last_activity_at on task + activity writes ----------
create or replace function public.bump_project_activity()
returns trigger
language plpgsql
as $$
declare
  target_project uuid;
begin
  target_project := coalesce(new.project_id, old.project_id);
  if target_project is not null then
    update public.projects
      set last_activity_at = now()
      where id = target_project;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger tasks_bump_activity
  after insert or update or delete on tasks
  for each row execute function public.bump_project_activity();

create trigger activity_bump_activity
  after insert on activity_logs
  for each row execute function public.bump_project_activity();

-- === supabase/migrations/0005_fix_bump_activity_security.sql ===
-- Fix: deleting an auth user failed with "Database error deleting user".
--
-- Cause: cascading a delete from auth.users runs as role `supabase_auth_admin`,
-- which has no privileges on the `public` schema. The AFTER DELETE trigger on
-- `tasks` then ran `update public.projects ...` and hit permission denied,
-- aborting the whole delete.
--
-- Make the trigger function run with the definer's rights (postgres) and no-op
-- safely when the parent project is already gone.

create or replace function public.bump_project_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project uuid;
begin
  target_project := coalesce(new.project_id, old.project_id);
  if target_project is not null then
    update public.projects
      set last_activity_at = now()
      where id = target_project;
  end if;
  return coalesce(new, old);
end;
$$;

-- handle_new_user is already SECURITY DEFINER; set an explicit owner-safe search_path
-- on the updated_at helper too, for consistency.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- === supabase/migrations/0006_user_settings.sql ===
-- Synced user preferences: one JSONB row per user. Shape is owned by the client
-- (src/lib/api/settings.ts) and deep-merged over defaults, so adding keys later
-- needs no migration.

create table user_settings (
  id         uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "user_settings — all" on user_settings
  for all using (auth.uid() = id) with check (auth.uid() = id);

create trigger user_settings_set_updated_at
  before update on user_settings
  for each row execute function public.set_updated_at();

-- Give every new user an empty settings row alongside their profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.user_settings (id) values (new.id);
  return new;
end;
$$;

-- === supabase/migrations/0007_task_depth_and_soft_delete.sql ===
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

