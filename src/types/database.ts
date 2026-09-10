/**
 * Hand-written database types mirroring `supabase/migrations`.
 * Replace with `supabase gen types typescript` output once the CLI is wired up.
 */

export type ClientStatus = 'active' | 'inactive' | 'archived'

export type ProjectType = 'client' | 'company' | 'personal' | 'maintenance' | 'other'
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'

export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly'

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'task_reopened'
  | 'project_created'
  | 'project_updated'
  | 'status_changed'
  | 'note_added'
  | 'manual_activity'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  company_name: string | null
  email: string | null
  notes: string | null
  status: ClientStatus
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  client_id: string | null
  name: string
  description: string | null
  type: ProjectType
  status: ProjectStatus
  priority: Priority
  deadline: string | null
  last_activity_at: string
  review_interval_days: number | null
  last_reviewed_at: string | null
  pinned: boolean
  color: string | null
  sort_order: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  /** Optional clock time on due_date, "HH:MM:SS". NULL = all-day. */
  due_time: string | null
  /** Length of the scheduled block. Falls back to estimated_minutes. */
  duration_minutes: number | null
  start_date: string | null
  completed_at: string | null
  estimated_minutes: number | null
  actual_minutes: number | null
  sort_order: number
  recurrence: Recurrence
  recurrence_until: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  user_id: string
  task_id: string
  title: string
  done: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  project_id: string | null
  task_id: string | null
  activity_type: ActivityType
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

/* ---- Composed shapes used by the UI ---- */

export interface ProjectWithStats extends Project {
  client: Pick<Client, 'id' | 'name' | 'company_name'> | null
  open_task_count: number
  overdue_task_count: number
  total_task_count: number
}

export interface TaskWithProject extends Task {
  project: Pick<Project, 'id' | 'name' | 'type' | 'status'> | null
  tags?: Tag[]
}

export interface ClientWithStats extends Client {
  active_project_count: number
  open_task_count: number
  last_activity_at: string | null
}

export interface ActivityLogWithRefs extends ActivityLog {
  project: Pick<Project, 'id' | 'name'> | null
  task: Pick<Task, 'id' | 'title'> | null
}
