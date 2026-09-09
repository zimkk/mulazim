import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormRow, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/Toast'
import { useCreateClient, useUpdateClient } from '@/lib/api/clients'
import type { Client, ClientStatus } from '@/types/database'

const STATUSES: ClientStatus[] = ['active', 'inactive', 'archived']

export function ClientFormModal({
  open,
  onClose,
  client,
}: {
  open: boolean
  onClose: () => void
  client?: Client
}) {
  const { notify } = useToast()
  const create = useCreateClient()
  const update = useUpdateClient()
  const editing = Boolean(client)

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ClientStatus>('active')

  useEffect(() => {
    if (open) {
      setName(client?.name ?? '')
      setCompanyName(client?.company_name ?? '')
      setEmail(client?.email ?? '')
      setNotes(client?.notes ?? '')
      setStatus(client?.status ?? 'active')
    }
  }, [open, client])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const payload = {
      name: name.trim(),
      company_name: companyName.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
      status,
    }
    try {
      if (editing && client) {
        await update.mutateAsync({ id: client.id, ...payload })
        notify('Client updated', 'success')
      } else {
        await create.mutateAsync(payload)
        notify('Client created', 'success')
      }
      onClose()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit client' : 'New client'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="client-form"
            loading={create.isPending || update.isPending}
          >
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={onSubmit} className="space-y-3">
        <FormRow label="Name *">
          <Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </FormRow>
        <FormRow label="Company">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </FormRow>
        <FormRow label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormRow>
      </form>
    </Modal>
  )
}
