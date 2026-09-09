-- In-app notification centre (Epic G).

create type notification_kind as enum (
  'overdue', 'due_soon', 'stale_project', 'needs_review', 'daily_digest'
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       notification_kind not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
create policy "notifications — all" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index notifications_user_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_created_idx on notifications (user_id, created_at desc);
