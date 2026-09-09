-- Local dev seed. Replace the UID below with your auth user's id
-- (Supabase Studio → Authentication → Users) before running:
--   psql "$DATABASE_URL" -f supabase/seed.sql
\set uid '00000000-0000-0000-0000-000000000000'

insert into clients (user_id, name, company_name, email, status) values
  (:'uid', 'Urban Crust', 'Urban Crust Pizzeria', 'owner@urbancrust.example', 'active'),
  (:'uid', 'Meridian Law', 'Meridian & Co', 'it@meridian.example', 'active'),
  (:'uid', 'Foxglove Studio', null, 'hello@foxglove.example', 'inactive');

insert into projects (user_id, client_id, name, type, status, priority, deadline, last_activity_at)
select :'uid', c.id, 'Urban Crust Website', 'client', 'active', 'high', current_date + 5, now() - interval '8 days'
from clients c where c.name = 'Urban Crust' and c.user_id = :'uid';

insert into projects (user_id, name, type, status, priority, last_activity_at) values
  (:'uid', 'Internal Deploy Pipeline', 'company', 'active', 'urgent', now() - interval '1 day'),
  (:'uid', 'Personal Budget App', 'personal', 'on_hold', 'low', now() - interval '30 days');

insert into tasks (user_id, project_id, title, status, priority, due_date)
select :'uid', p.id, 'Fix checkout flow', 'in_progress', 'high', current_date - 1
from projects p where p.name = 'Urban Crust Website' and p.user_id = :'uid';

insert into tasks (user_id, project_id, title, status, priority, due_date)
select :'uid', p.id, 'Review company deployment', 'todo', 'urgent', current_date + 1
from projects p where p.name = 'Internal Deploy Pipeline' and p.user_id = :'uid';
