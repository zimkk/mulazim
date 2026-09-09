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
