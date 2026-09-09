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
