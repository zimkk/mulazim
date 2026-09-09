import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { cn } from '@/lib/utils/cn'
import { ProjectRow } from '@/components/projects/ProjectRow'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { useProjects } from '@/lib/api/projects'
import { useUiStore } from '@/stores/uiStore'
import { projectHealth } from '@/lib/utils/health'
import { isStale } from '@/lib/utils/staleness'
import {
  PROJECT_FILTERS,
  PROJECT_FILTER_LABEL,
  type ProjectFilter,
} from '@/lib/constants'

export default function Projects() {
  const { data, isLoading, isError, refetch } = useProjects()
  const thresholds = useUiStore((s) => s.staleThresholds)
  const [filter, setFilter] = useState<ProjectFilter>('active')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const list = data ?? []
    const term = q.trim().toLowerCase()
    return list.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term) && !(p.client?.name ?? '').toLowerCase().includes(term)) {
        return false
      }
      const h = projectHealth(p, thresholds).health
      switch (filter) {
        case 'all':
          return true
        case 'active':
          return p.status === 'active'
        case 'attention':
          return h === 'attention'
        case 'stale':
          return isStale(p, thresholds)
        case 'overdue':
          return h === 'overdue'
        case 'completed':
          return p.status === 'completed'
        case 'on_hold':
          return p.status === 'on_hold'
        default:
          return true
      }
    })
  }, [data, q, filter, thresholds])

  return (
    <Page>
      <PageHeader
        title="Projects"
        subtitle="Every active piece of work in one list."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New project
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-[--color-text-subtle]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects or clients"
            className="w-64 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {PROJECT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-[--color-accent] text-[--color-accent-fg]'
                  : 'bg-[--color-surface] text-[--color-text-muted] hover:bg-[--color-surface-2]',
              )}
            >
              {PROJECT_FILTER_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <ErrorState message="Unable to load projects." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={6} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={data && data.length > 0 ? 'No projects match this filter' : 'No projects yet'}
            description={
              data && data.length > 0
                ? 'Try a different filter or search term.'
                : 'Create your first project to start tracking your work.'
            }
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                Create project
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          {filtered.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </Card>
      )}

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </Page>
  )
}
