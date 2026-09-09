import { useMemo } from 'react'
import { useStaleThresholds } from '@/lib/api/settings'
import { daysUntil, isOverdue } from '@/lib/utils/dates'
import { projectHealth } from '@/lib/utils/health'
import { staleLevel } from '@/lib/utils/staleness'
import { recommendTasks, type ScoredTask } from '@/lib/utils/recommendations'
import type { ProjectWithStats, TaskWithProject } from '@/types/database'
import { useProjects } from './projects'
import { useAllOpenTasks } from './tasks'

export interface DashboardData {
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  overdueTasks: TaskWithProject[]
  dueSoonTasks: TaskWithProject[]
  highPriorityTasks: TaskWithProject[]
  inProgressTasks: TaskWithProject[]
  staleProjects: ProjectWithStats[]
  attentionProjects: ProjectWithStats[]
  recommendations: ScoredTask[]
}

export function useDashboard(): DashboardData {
  const thresholds = useStaleThresholds()
  const projectsQuery = useProjects()
  const tasksQuery = useAllOpenTasks()

  return useMemo(() => {
    const projects = projectsQuery.data ?? []
    const tasks = tasksQuery.data ?? []
    const activeProjectIds = new Set(
      projects.filter((p) => p.status === 'active' || p.status === 'on_hold').map((p) => p.id),
    )
    const liveTasks = tasks.filter((t) => activeProjectIds.has(t.project_id))

    const overdueTasks = liveTasks
      .filter((t) => isOverdue(t.due_date))
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

    const dueSoonTasks = liveTasks
      .filter((t) => {
        if (isOverdue(t.due_date)) return false
        const d = daysUntil(t.due_date)
        return d !== null && d <= 3
      })
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))

    const highPriorityTasks = liveTasks
      .filter(
        (t) =>
          (t.priority === 'high' || t.priority === 'urgent') &&
          !isOverdue(t.due_date) &&
          (daysUntil(t.due_date) === null || daysUntil(t.due_date)! > 3),
      )
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))

    const inProgressTasks = liveTasks.filter((t) => t.status === 'in_progress')

    const staleProjects = projects.filter((p) => staleLevel(p, thresholds) === 'stale')

    const attentionProjects = projects.filter((p) => {
      const h = projectHealth(p, thresholds).health
      return h === 'attention' || h === 'overdue'
    })

    return {
      isLoading: projectsQuery.isLoading || tasksQuery.isLoading,
      isError: projectsQuery.isError || tasksQuery.isError,
      error: projectsQuery.error ?? tasksQuery.error,
      refetch: () => {
        void projectsQuery.refetch()
        void tasksQuery.refetch()
      },
      overdueTasks,
      dueSoonTasks,
      highPriorityTasks,
      inProgressTasks,
      staleProjects,
      attentionProjects,
      recommendations: recommendTasks(liveTasks, 5),
    }
  }, [projectsQuery, tasksQuery, thresholds])
}

function priorityRank(p: string): number {
  return p === 'urgent' ? 3 : p === 'high' ? 2 : p === 'medium' ? 1 : 0
}
