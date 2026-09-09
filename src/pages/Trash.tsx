import { FolderKanban, ListChecks, RotateCcw, Trash2, Users } from 'lucide-react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/Toast'
import { relativeTime } from '@/lib/utils/dates'
import { usePurge, useRestore, useTrash, type TrashKind } from '@/lib/api/trash'

const ICON: Record<TrashKind, typeof Users> = {
  client: Users,
  project: FolderKanban,
  task: ListChecks,
}

export default function Trash() {
  const { data, isLoading, isError, refetch } = useTrash()
  const restore = useRestore()
  const purge = usePurge()
  const { notify } = useToast()

  return (
    <Page>
      <PageHeader
        title="Trash"
        subtitle="Deleted items are kept here until you remove them for good."
      />
      {isError ? (
        <ErrorState message="Unable to load trash." onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonRows rows={4} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="Trash is empty" description="Deleted clients, projects and tasks show up here." />
        </Card>
      ) : (
        <Card>
          {data.map((item) => {
            const Icon = ICON[item.kind]
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className="flex items-center gap-3 border-b border-[--color-border] px-4 py-2.5 last:border-b-0"
              >
                <Icon className="size-4 shrink-0 text-[--color-text-subtle]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[--color-text]">{item.label}</p>
                  <p className="text-xs text-[--color-text-muted]">
                    {item.kind} · deleted {relativeTime(item.deleted_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={<RotateCcw className="size-3.5" />}
                  loading={restore.isPending && restore.variables?.id === item.id}
                  onClick={async () => {
                    await restore.mutateAsync({ kind: item.kind, id: item.id })
                    notify('Restored', 'success')
                  }}
                >
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="size-3.5" />}
                  loading={purge.isPending && purge.variables?.id === item.id}
                  onClick={async () => {
                    await purge.mutateAsync({ kind: item.kind, id: item.id })
                    notify('Permanently deleted', 'success')
                  }}
                >
                  Delete
                </Button>
              </div>
            )
          })}
        </Card>
      )}
    </Page>
  )
}
