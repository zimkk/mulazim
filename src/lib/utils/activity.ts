import { supabase } from '@/lib/supabase'
import type { ActivityType } from '@/types/database'

interface LogActivityInput {
  userId: string
  activityType: ActivityType
  description?: string
  projectId?: string | null
  taskId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Best-effort activity write. Activity records are a convenience layer
 * (ARCHITECTURE.md §25) — a failure here must never fail the parent mutation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const { error } = await supabase.from('activity_logs').insert({
    user_id: input.userId,
    activity_type: input.activityType,
    description: input.description ?? null,
    project_id: input.projectId ?? null,
    task_id: input.taskId ?? null,
    metadata: input.metadata ?? null,
  })
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('activity log failed:', error.message)
  }
}
