import { useState } from 'react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { QuickAddTask } from '@/components/tasks/QuickAddTask'
import { useAllOpenTasks } from '@/lib/api/tasks'
import { greeting, isOverdue, toDate } from '@/lib/utils/dates'
import type { Task } from '@/types/database'

export default function Today() {
  const { data, isLoading, isError, refetch } = useAllOpenTasks()
  const [edit, setEdit] = useState<Task | null>(null)

  const tasks = data ?? []
  const todayStr = new Date().toISOString().slice(0, 10)
  const startedOrNoStart = (t: Task) => !t.start_date || t.start_date <= todayStr

  const overdue = tasks.filter((t) => isOverdue(t.due_date))
  const dueToday = tasks.filter((t) => {
    const d = toDate(t.due_date)
    return d && d.toISOString().slice(0, 10) === todayStr
  })
  const noDate = tasks.filter(
    (t) =>
      !t.due_date &&
      startedOrNoStart(t) &&
      (t.priority === 'high' || t.priority === 'urgent' || t.status === 'in_progress'),
  )

  return (
    <Page>
      <PageHeader title={`${greeting()} — Today`} subtitle="Everything worth doing today, in one list." />
      <div className="mb-5">
        <QuickAddTask />
      </div>

      {isError ? (
        <ErrorState message="Unable to load today." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="space-y-4">
          <Section title="Overdue" tasks={overdue} onEdit={setEdit} empty="Nothing overdue — nice." />
          <Section title="Due today" tasks={dueToday} onEdit={setEdit} empty="Nothing due today." />
          <Section
            title="Worth a look"
            tasks={noDate}
            onEdit={setEdit}
            empty="No high-priority or in-progress work without a date."
          />
        </div>
      )}

      {edit && (
        <TaskFormModal open onClose={() => setEdit(null)} projectId={edit.project_id} task={edit} />
      )}
    </Page>
  )
}

function Section({
  title,
  tasks,
  onEdit,
  empty,
}: {
  title: string
  tasks: Task[]
  onEdit: (t: Task) => void
  empty: string
}) {
  return (
    <Card>
      <CardHeader title={title} count={tasks.length} />
      {tasks.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        tasks
          .slice()
          .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
          .map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} showProject />)
      )}
    </Card>
  )
}
