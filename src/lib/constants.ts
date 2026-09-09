import type {
  Priority,
  ProjectStatus,
  ProjectType,
  TaskStatus,
} from '@/types/database'

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
export const PROJECT_TYPES: ProjectType[] = [
  'client',
  'company',
  'personal',
  'maintenance',
  'other',
]
export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed', 'archived']
export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done', 'cancelled']

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
}

export const PROJECT_FILTERS = [
  'all',
  'active',
  'attention',
  'stale',
  'overdue',
  'completed',
  'on_hold',
] as const
export type ProjectFilter = (typeof PROJECT_FILTERS)[number]

export const PROJECT_FILTER_LABEL: Record<ProjectFilter, string> = {
  all: 'All',
  active: 'Active',
  attention: 'Needs attention',
  stale: 'Stale',
  overdue: 'Overdue',
  completed: 'Completed',
  on_hold: 'On hold',
}
