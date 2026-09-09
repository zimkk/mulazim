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
