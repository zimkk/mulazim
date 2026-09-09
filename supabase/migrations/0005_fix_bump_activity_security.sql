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
