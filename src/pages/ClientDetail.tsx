import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, Mail, Pencil, Plus } from 'lucide-react'
import { Page } from '@/components/layout/AppShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States'
import { useToast } from '@/components/Toast'
import { ProjectRow } from '@/components/projects/ProjectRow'
import { ClientFormModal } from '@/components/clients/ClientFormModal'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { useArchiveClient, useClient } from '@/lib/api/clients'
import { useProjectsByClient } from '@/lib/api/projects'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const { notify } = useToast()
  const client = useClient(id)
  const projects = useProjectsByClient(id)
  const archive = useArchiveClient()
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

  return (
    <Page>
      <Link
        to="/clients"
        className="mb-3 inline-flex items-center gap-1 text-xs text-[--color-text-muted] hover:text-[--color-text]"
      >
        <ArrowLeft className="size-3.5" /> Clients
      </Link>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{c.name}</h1>
            {c.status !== 'active' && <Badge tone="neutral">{c.status}</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[--color-text-muted]">
            {c.company_name && <span>{c.company_name}</span>}
            {c.email && (
              <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-[--color-text]">
                <Mail className="size-3" /> {c.email}
              </a>
            )}
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
        </div>
      </div>

      {c.notes && (
        <Card className="mb-4">
          <CardBody className="text-sm whitespace-pre-wrap text-[--color-text-muted]">
            {c.notes}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Projects"
          count={projects.data?.length ?? 0}
          action={
            <Button
              size="sm"
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
