import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAllTasks } from '@/lib/api/tasks'
import { logActivity } from '@/lib/utils/activity'
import { autoMoveDescription, tasksToAutoStart } from '@/lib/autoRules'

/**
 * Runs the date-driven automatic rule.
 *
 * The timer and subtask rules fire inside their own mutations, where the
 * trigger is a user action. A start date arriving has no such moment — nobody
 * clicks anything — so it is swept here: once when the app opens, and again
 * whenever the date rolls over while the app stays open (common for a desktop
 * app left running overnight).
 *
 * Renders nothing.
 */
export function AutoRuleEngine() {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: tasks } = useAllTasks(false)
  const qc = useQueryClient()
  // Tasks already promoted this session; prevents a re-run racing itself while
  // the invalidated query is still refetching.
  const promoted = useRef(new Set<string>())
  const lastRunDate = useRef<string>('')

  useEffect(() => {
    if (!userId || !tasks?.length) return

    const run = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const due = tasksToAutoStart(tasks).filter((t) => !promoted.current.has(t.id))
      if (due.length === 0) {
        lastRunDate.current = today
        return
      }
      for (const task of due) promoted.current.add(task.id)

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .in('id', due.map((t) => t.id))
      if (error) {
        for (const task of due) promoted.current.delete(task.id)
        return
      }

      await Promise.all(
        due.map((task) =>
          logActivity({
            userId,
            activityType: 'status_changed',
            projectId: task.project_id,
            taskId: task.id,
            description: autoMoveDescription(task.title, 'start-date', 'in_progress'),
            metadata: { automatic: true, rule: 'start-date' },
          }),
        ),
      )
      lastRunDate.current = today
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    }

    void run()

    // Re-check on the hour: cheap, and catches midnight without a precise timer.
    const iv = setInterval(() => {
      const today = new Date().toISOString().slice(0, 10)
      if (today !== lastRunDate.current) {
        promoted.current.clear()
        void run()
      }
    }, 60 * 60 * 1000)
    return () => clearInterval(iv)
  }, [userId, tasks, qc])

  return null
}
