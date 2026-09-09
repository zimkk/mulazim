import { useMemo, useState } from 'react'
import { Search, Trash2, X } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/Toast'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { QuickAddTask } from '@/components/tasks/QuickAddTask'
import { useAllTasks, useBulkDeleteTasks, useBulkUpdateTasks } from '@/lib/api/tasks'
import { useProjects } from '@/lib/api/projects'
import { useTags, useTaskTagMap } from '@/lib/api/tags'
import { useSettings, useUpdateSettings } from '@/lib/api/settings'
import { PRIORITIES, TASK_STATUSES, TASK_STATUS_LABEL } from '@/lib/constants'
import { isOverdue, daysUntil } from '@/lib/utils/dates'
import type { Priority, Task, TaskStatus, TaskWithProject } from '@/types/database'

type GroupBy = 'none' | 'project' | 'priority' | 'due' | 'status'
type SortBy = 'due' | 'priority' | 'created' | 'title'
type DateFilter = 'any' | 'overdue' | 'today' | 'week' | 'nodate'

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export default function AllTasks() {
  const { data, isLoading, isError, refetch } = useAllTasks(true)
  const { data: projects } = useProjects()
  const { data: tags } = useTags()
  const tagMap = useTaskTagMap()
  const bulkUpdate = useBulkUpdateTasks()
  const bulkDelete = useBulkDeleteTasks()
  const { perspectives } = useSettings()
  const updateSettings = useUpdateSettings()
  const { notify } = useToast()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'open' | TaskStatus | 'all'>('open')
  const [priority, setPriority] = useState<'all' | Priority>('all')
  const [projectId, setProjectId] = useState('all')
  const [tagId, setTagId] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('any')
  const [groupBy, setGroupBy] = useState<GroupBy>('project')
  const [sortBy, setSortBy] = useState<SortBy>('due')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<Task | null>(null)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = (data ?? []).filter((t) => {
      if (term && !t.title.toLowerCase().includes(term) && !(t.description ?? '').toLowerCase().includes(term))
        return false
      if (status === 'open' && (t.status === 'done' || t.status === 'cancelled')) return false
      if (status !== 'open' && status !== 'all' && t.status !== status) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (projectId !== 'all' && t.project_id !== projectId) return false
      if (tagId !== 'all' && !(tagMap.get(t.id) ?? []).some((tag) => tag.id === tagId)) return false
      if (dateFilter === 'overdue' && !isOverdue(t.due_date)) return false
      if (dateFilter === 'nodate' && t.due_date) return false
      if (dateFilter === 'today') {
        const d = daysUntil(t.due_date)
        if (d !== 0) return false
      }
      if (dateFilter === 'week') {
        const d = daysUntil(t.due_date)
        if (d === null || d < 0 || d > 7) return false
      }
      return true
    })
    list = list.slice().sort((a, b) => {
      if (sortBy === 'due') return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
      if (sortBy === 'priority') return PRIORITY_RANK[a.priority]! - PRIORITY_RANK[b.priority]!
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return b.created_at.localeCompare(a.created_at)
    })
    return list
  }, [data, q, status, priority, projectId, tagId, dateFilter, sortBy, tagMap])

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'All tasks', tasks: filtered }]
    const projName = new Map((projects ?? []).map((p) => [p.id, p.name]))
    const map = new Map<string, TaskWithProject[]>()
    for (const t of filtered) {
      let key: string
      if (groupBy === 'project') key = projName.get(t.project_id) ?? 'Unknown project'
      else if (groupBy === 'priority') key = t.priority
      else if (groupBy === 'status') key = TASK_STATUS_LABEL[t.status]
      else key = t.due_date ? (isOverdue(t.due_date) ? 'Overdue' : t.due_date) : 'No date'
      map.set(key, [...(map.get(key) ?? []), t])
    }
    return [...map.entries()].map(([key, tasks]) => ({ key, tasks }))
  }, [filtered, groupBy, projects])

  const currentFilters = { q, status, priority, projectId, tagId, dateFilter, groupBy, sortBy }
  function applyPerspective(id: string) {
    const p = perspectives.find((x) => x.id === id)
    if (!p) return
    const f = p.filters
    setQ(f.q ?? '')
    setStatus((f.status as typeof status) ?? 'open')
    setPriority((f.priority as typeof priority) ?? 'all')
    setProjectId(f.projectId ?? 'all')
    setTagId(f.tagId ?? 'all')
    setDateFilter((f.dateFilter as DateFilter) ?? 'any')
    setGroupBy((f.groupBy as GroupBy) ?? 'project')
    setSortBy((f.sortBy as SortBy) ?? 'due')
  }
  function savePerspective() {
    const name = window.prompt('Name this view')?.trim()
    if (!name) return
    const next = [
      ...perspectives,
      { id: crypto.randomUUID(), name, filters: currentFilters },
    ]
    updateSettings({ perspectives: next })
    notify(`Saved "${name}"`, 'success')
  }
  function deletePerspective(id: string) {
    updateSettings({ perspectives: perspectives.filter((p) => p.id !== id) })
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const ids = [...selected]

  async function applyBulk(patch: Parameters<typeof bulkUpdate.mutateAsync>[0]['patch']) {
    await bulkUpdate.mutateAsync({ ids, patch })
    notify(`Updated ${ids.length} task${ids.length === 1 ? '' : 's'}`, 'success')
    setSelected(new Set())
  }

  return (
    <Page>
      <PageHeader title="All tasks" subtitle="Every task, filtered and grouped how you like." />

      <div className="mb-4">
        <QuickAddTask />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[--color-text-muted]">Views</span>
        {perspectives.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1 rounded-md border border-[--color-border] bg-[--color-surface] px-2 py-1 text-xs"
          >
            <button onClick={() => applyPerspective(p.id)} className="hover:text-[--color-accent]">
              {p.name}
            </button>
            <button
              onClick={() => deletePerspective(p.id)}
              className="text-[--color-text-subtle] hover:text-[--color-stale]"
              aria-label={`Delete ${p.name}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Button size="sm" onClick={savePerspective}>
          Save current view
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-[--color-text-subtle]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-52 pl-8" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-32">
          <option value="open">Open</option>
          <option value="all">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="w-28">
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-40">
          <option value="all">Any project</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select value={tagId} onChange={(e) => setTagId(e.target.value)} className="w-32">
          <option value="all">Any tag</option>
          {(tags ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="w-32">
          <option value="any">Any date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">This week</option>
          <option value="nodate">No date</option>
        </Select>
        <div className="ml-auto flex gap-2">
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="w-36">
            <option value="none">No grouping</option>
            <option value="project">By project</option>
            <option value="priority">By priority</option>
            <option value="status">By status</option>
            <option value="due">By due date</option>
          </Select>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="w-32">
            <option value="due">Sort: due</option>
            <option value="priority">Sort: priority</option>
            <option value="created">Sort: newest</option>
            <option value="title">Sort: title</option>
          </Select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[--color-accent]/40 bg-[--color-accent]/8 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Select
            className="h-8 w-32"
            value=""
            onChange={(e) => e.target.value && applyBulk({ status: e.target.value as TaskStatus })}
          >
            <option value="">Set status…</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select
            className="h-8 w-32"
            value=""
            onChange={(e) => e.target.value && applyBulk({ priority: e.target.value as Priority })}
          >
            <option value="">Set priority…</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="size-3.5" />}
            loading={bulkDelete.isPending}
            onClick={async () => {
              await bulkDelete.mutateAsync(ids)
              notify(`Moved ${ids.length} to trash`, 'success')
              setSelected(new Set())
            }}
          >
            Delete
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[--color-text-muted] hover:text-[--color-text]"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {isError ? (
        <ErrorState message="Unable to load tasks." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={8} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No tasks match" description="Loosen the filters or add a task." />
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader title={g.key} count={g.tasks.length} />
              {g.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  showProject={groupBy !== 'project'}
                  selected={selected.has(t.id)}
                  onSelect={toggleSelect}
                  onEdit={setEdit}
                />
              ))}
            </Card>
          ))}
        </div>
      )}

      {edit && (
        <TaskFormModal open onClose={() => setEdit(null)} projectId={edit.project_id} task={edit} />
      )}
    </Page>
  )
}
