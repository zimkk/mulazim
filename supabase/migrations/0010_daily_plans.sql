-- Epic E2: plan-my-day. One row per user per date holding an ordered task list.

create table daily_plans (
  user_id  uuid not null references auth.users (id) on delete cascade,
  date     date not null,
  task_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table daily_plans enable row level security;
create policy "daily_plans — all" on daily_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger daily_plans_set_updated_at
  before update on daily_plans
  for each row execute function public.set_updated_at();
