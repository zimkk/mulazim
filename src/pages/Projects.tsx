import { useMemo, useState } from 'react'
import { FolderKanban, Plus } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FilterChips, SearchInput } from '@/components/ui/Toolbar'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { m, stagger, fadeUp } from '@/lib/motion'
import { ProjectRow } from '@/components/projects/ProjectRow'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { useProjects } from '@/lib/api/projects'
import { useStaleThresholds } from '@/lib/api/settings'
import { projectHealth } from '@/lib/utils/health'
import { isStale } from '@/lib/utils/staleness'
import {
  PROJECT_FILTERS,
  PROJECT_FILTER_LABEL,
  type ProjectFilter,
} from '@/lib/constants'

export default function Projects() {
  const { data, isLoading, isError, refetch } = useProjects()
  const thresholds = useStaleThresholds()
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={q}
          onValueChange={setQ}
          placeholder="Search projects or clients"
          className="w-64"
        />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={PROJECT_FILTERS.map((f) => ({ value: f, label: PROJECT_FILTER_LABEL[f] }))}
        />
      </div>

      {isError ? (
        <ErrorState message="Unable to load projects." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={6} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="size-5" />}
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
        <Card className="overflow-hidden">
          <m.div variants={stagger} initial="hidden" animate="show">
            {filtered.map((p) => (
              <m.div key={p.id} variants={fadeUp}>
                <ProjectRow project={p} />
              </m.div>
            ))}
          </m.div>
        </Card>
      )}

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </Page>
  )
}
