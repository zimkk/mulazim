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
