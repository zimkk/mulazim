import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, CheckCircle2, Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { Badge, HealthBadge, PriorityBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/Toast'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { QuickAddTask } from '@/components/tasks/QuickAddTask'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import {
  useArchiveProject,
  useDeleteProject,
  useProject,
  useSetProjectFields,
} from '@/lib/api/projects'
import { useReorderTasks, useTasksByProject } from '@/lib/api/tasks'
import { GripVertical } from 'lucide-react'
import { useAddNote, useProjectActivity } from '@/lib/api/activity'
import { useUiStore } from '@/stores/uiStore'
import { useSettings, useStaleThresholds } from '@/lib/api/settings'
import { confirmDialog } from '@/lib/confirm'
import { projectHealth } from '@/lib/utils/health'
import { daysSince, dueLabel, relativeTime } from '@/lib/utils/dates'
import { PROJECT_STATUS_LABEL } from '@/lib/constants'
import type { Task } from '@/types/database'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notify } = useToast()
  const setLastProjectId = useUiStore((s) => s.setLastProjectId)
  const thresholds = useStaleThresholds()
  const { general } = useSettings()

  const project = useProject(id)
  const tasks = useTasksByProject(id)
  const activity = useProjectActivity(id)
  const archive = useArchiveProject()
  const del = useDeleteProject()
  const reorder = useReorderTasks()
  const [dragId, setDragId] = useState<string | null>(null)
  const setFields = useSetProjectFields()
  const addNote = useAddNote()

  const [editing, setEditing] = useState(false)
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [taskView, setTaskView] = useState<'list' | 'board'>('list')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (id) setLastProjectId(id)
  }, [id, setLastProjectId])

  if (project.isError) {
    return (
      <Page>
        <ErrorState message="Project not found." onRetry={project.refetch} />
      </Page>
    )
  }
  if (project.isLoading || !project.data) {
    return (
      <Page>
        <SkeletonRows rows={8} />
      </Page>
    )
  }

  const p = project.data
  const health = projectHealth(p, thresholds)
  const openTasks = (tasks.data ?? []).filter((t) => t.status !== 'done' && t.status !== 'cancelled')
  const doneTasks = (tasks.data ?? []).filter((t) => t.status === 'done' || t.status === 'cancelled')

  function onDropReorder(targetId: string) {
    if (!dragId || dragId === targetId) return setDragId(null)
    const order = openTasks.map((t) => t.id).filter((x) => x !== dragId)
    const at = order.indexOf(targetId)
    order.splice(at, 0, dragId)
    reorder.mutate({
      projectId: p.id,
      updates: order.map((id, i) => ({ id, sort_order: i })),
    })
    setDragId(null)
  }

  async function onArchive() {
    await archive.mutateAsync(p.id)
    notify('Project archived', 'success')
  }

  async function onDelete() {
    if (general.confirmBeforeDelete) {
      const yes = await confirmDialog(`Move "${p.name}" and its tasks to Trash?`)
      if (!yes) return
    }
    await del.mutateAsync(p.id)
    notify('Project moved to trash', 'success')
    navigate('/projects')
  }

  const reviewDue =
    p.review_interval_days != null &&
    daysSince(p.last_reviewed_at ?? p.created_at) >= p.review_interval_days

  async function onAddNote() {
    if (!note.trim()) return
    await addNote.mutateAsync({ projectId: p.id, text: note.trim() })
    setNote('')
    notify('Note added', 'success')
  }

  return (
    <Page>
      <Link
        to="/projects"
        className="mb-3 inline-flex items-center gap-1 text-xs text-[--color-text-muted] hover:text-[--color-text]"
      >
        <ArrowLeft className="size-3.5" /> Projects
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{p.name}</h1>
            <HealthBadge health={health.health} label={health.label} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[--color-text-muted]">
            <Badge tone="neutral">{p.type}</Badge>
            <Badge tone="neutral">{PROJECT_STATUS_LABEL[p.status]}</Badge>
            <PriorityBadge priority={p.priority} />
            {p.client && (
              <Link to={`/clients/${p.client.id}`} className="hover:text-[--color-text]">
                {p.client.name}
              </Link>
            )}
            {p.deadline && <span>{dueLabel(p.deadline)}</span>}
            <span>Active {relativeTime(p.last_activity_at)}</span>
          </div>
          {health.reasons.length > 0 && (
            <p className="mt-1.5 text-xs text-[--color-text-muted]">{health.reasons.join(' · ')}</p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            icon={<Pin className={p.pinned ? 'size-3.5 fill-current' : 'size-3.5'} />}
            onClick={() => setFields.mutate({ id: p.id, pinned: !p.pinned })}
          >
            {p.pinned ? 'Pinned' : 'Pin'}
          </Button>
          {p.review_interval_days != null && (
            <Button
              icon={<CheckCircle2 className="size-3.5" />}
              onClick={() => {
                setFields.mutate({ id: p.id, last_reviewed_at: new Date().toISOString() })
                notify('Marked reviewed', 'success')
              }}
            >
              {reviewDue ? 'Review now' : 'Reviewed'}
            </Button>
          )}
          <Button icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            icon={<Archive className="size-3.5" />}
            onClick={onArchive}
            loading={archive.isPending}
            disabled={p.status === 'archived'}
          >
            Archive
          </Button>
          <Button variant="danger" icon={<Trash2 className="size-3.5" />} onClick={onDelete} loading={del.isPending}>
            Delete
          </Button>
        </div>
      </div>

      {p.description && (
        <Card className="mb-4">
          <CardBody className="text-sm whitespace-pre-wrap text-[--color-text-muted]">
            {p.description}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Tasks"
              count={openTasks.length}
              action={
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border border-[--color-border] p-0.5 text-xs">
                    {(['list', 'board'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setTaskView(v)}
                        className={
                          'rounded px-2 py-0.5 capitalize ' +
                          (taskView === v
                            ? 'bg-[--color-accent] text-[--color-accent-fg]'
                            : 'text-[--color-text-muted]')
                        }
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    icon={<Plus className="size-3.5" />}
                    onClick={() => setTaskModal({ open: true })}
                  >
                    Add
                  </Button>
                </div>
              }
            />
            <div className="border-b border-[--color-border] p-3">
              <QuickAddTask projectId={p.id} />
            </div>
            {tasks.isLoading ? (
              <div className="p-3">
                <SkeletonRows rows={4} />
              </div>
            ) : taskView === 'board' ? (
              <TaskBoard
                tasks={tasks.data ?? []}
                onEdit={(task) => setTaskModal({ open: true, task })}
              />
            ) : openTasks.length === 0 ? (
              <EmptyState title="No open tasks" description="Add a task to get started." />
            ) : (
              openTasks.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropReorder(t.id)}
                  className={
                    'group flex items-center ' + (dragId === t.id ? 'opacity-40' : '')
                  }
                >
                  <GripVertical className="ml-1 size-3.5 shrink-0 cursor-grab text-[--color-text-subtle] opacity-0 group-hover:opacity-100" />
                  <div className="min-w-0 flex-1">
                    <TaskRow task={t} onEdit={(task) => setTaskModal({ open: true, task })} />
                  </div>
                </div>
              ))
            )}
            {taskView === 'list' && doneTasks.length > 0 && (
              <details className="px-3 py-2">
                <summary className="cursor-pointer text-xs text-[--color-text-muted]">
                  {doneTasks.length} completed
                </summary>
                <div className="mt-1">
                  {doneTasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onEdit={(task) => setTaskModal({ open: true, task })}
                    />
                  ))}
                </div>
              </details>
            )}
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <ActivityTimeline
              items={activity.data}
              loading={activity.isLoading}
              showProject={false}
            />
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Notes" />
          <CardBody className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note to the activity log…"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={onAddNote}
              loading={addNote.isPending}
              disabled={!note.trim()}
            >
              Add note
            </Button>
          </CardBody>
        </Card>
      </div>

      <ProjectFormModal open={editing} onClose={() => setEditing(false)} project={p} />
      <TaskFormModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false })}
        projectId={p.id}
        task={taskModal.task}
      />
    </Page>
  )
}
