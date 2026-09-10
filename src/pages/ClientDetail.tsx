import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, FolderKanban, Mail, Pencil, Plus, Trash2 } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/Toast'
import { ProjectRow } from '@/components/projects/ProjectRow'
import { ClientFormModal } from '@/components/clients/ClientFormModal'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { useArchiveClient, useClient, useDeleteClient } from '@/lib/api/clients'
import { useProjectsByClient } from '@/lib/api/projects'
import { useSettings } from '@/lib/api/settings'
import { confirmDialog } from '@/lib/confirm'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notify } = useToast()
  const client = useClient(id)
  const projects = useProjectsByClient(id)
  const archive = useArchiveClient()
  const del = useDeleteClient()
  const { general } = useSettings()
  const [editing, setEditing] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)

  if (client.isError) {
    return (
      <Page>
        <ErrorState message="Client not found." onRetry={client.refetch} />
      </Page>
    )
  }
  if (client.isLoading || !client.data) {
    return (
      <Page>
        <SkeletonRows rows={6} />
      </Page>
    )
  }

  const c = client.data

  async function onArchive() {
    await archive.mutateAsync(c.id)
    notify('Client archived', 'success')
  }

  async function onDelete() {
    if (general.confirmBeforeDelete) {
      const yes = await confirmDialog(`Move "${c.name}" to Trash? Its projects are kept.`)
      if (!yes) return
    }
    await del.mutateAsync(c.id)
    notify('Client moved to trash', 'success')
    navigate('/clients')
  }

  return (
    <Page>
      <Link
        to="/clients"
        className="mb-3 inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="size-3.5" /> Clients
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar name={c.name} className="size-12 text-sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[1.375rem] font-semibold tracking-tight">{c.name}</h1>
              {c.status !== 'active' && <Badge tone="neutral">{c.status}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
              {c.company_name && <span>{c.company_name}</span>}
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center gap-1 transition-colors hover:text-[var(--color-accent)]"
                >
                  <Mail className="size-3" /> {c.email}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            icon={<Archive className="size-3.5" />}
            onClick={onArchive}
            loading={archive.isPending}
            disabled={c.status === 'archived'}
          >
            Archive
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 className="size-3.5" />}
            onClick={onDelete}
            loading={del.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      {c.notes && (
        <Card className="mb-4">
          <CardBody className="text-sm whitespace-pre-wrap text-[var(--color-text-muted)]">
            {c.notes}
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title="Projects"
          icon={<FolderKanban className="size-3.5" />}
          count={projects.data?.length ?? 0}
          action={
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="size-3.5" />}
              onClick={() => setCreatingProject(true)}
            >
              New project
            </Button>
          }
        />
        {projects.isLoading ? (
          <div className="p-3">
            <SkeletonRows rows={3} />
          </div>
        ) : (projects.data ?? []).length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-5" />}
            title="No projects for this client"
            description="Create one to start tracking their work."
          />
        ) : (
          projects.data!.map((p) => <ProjectRow key={p.id} project={p} />)
        )}
      </Card>

      <ClientFormModal open={editing} onClose={() => setEditing(false)} client={c} />
      <ProjectFormModal
        open={creatingProject}
        onClose={() => setCreatingProject(false)}
        defaultClientId={c.id}
      />
    </Page>
  )
}
