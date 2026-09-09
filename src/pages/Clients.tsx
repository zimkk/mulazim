import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { ClientFormModal } from '@/components/clients/ClientFormModal'
import { useClients } from '@/lib/api/clients'
import { relativeTime } from '@/lib/utils/dates'

export default function Clients() {
  const { data, isLoading, isError, refetch } = useClients()
  const [creating, setCreating] = useState(false)
  const visible = (data ?? []).filter((c) => c.status !== 'archived')

  return (
    <Page>
      <PageHeader
        title="Clients"
        subtitle="Your freelance and client relationships."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New client
          </Button>
        }
      />

      {isError ? (
        <ErrorState message="Unable to load clients." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={5} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title="No clients yet"
            description="Add a client to group their projects and tasks."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                Create client
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          {visible.map((c) => (
            <Link
              key={c.id}
              to={`/clients/${c.id}`}
              className="flex items-center gap-3 border-b border-[--color-border] px-4 py-3 last:border-b-0 hover:bg-[--color-surface-2]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{c.name}</span>
                  {c.company_name && (
                    <span className="text-xs text-[--color-text-muted]">{c.company_name}</span>
                  )}
                  {c.status !== 'active' && <Badge tone="neutral">{c.status}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-[--color-text-muted]">
                  {c.active_project_count} active project{c.active_project_count === 1 ? '' : 's'} ·{' '}
                  {c.open_task_count} open task{c.open_task_count === 1 ? '' : 's'}
                </p>
              </div>
              <span className="text-xs text-[--color-text-muted]">
                {c.last_activity_at ? `Active ${relativeTime(c.last_activity_at)}` : 'No activity'}
              </span>
            </Link>
          ))}
        </Card>
      )}

      <ClientFormModal open={creating} onClose={() => setCreating(false)} />
    </Page>
  )
}
