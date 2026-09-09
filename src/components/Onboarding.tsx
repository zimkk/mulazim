import { useState } from 'react'
import { Rocket } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/Toast'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { useProfile, useUpdateProfile } from '@/lib/api/profile'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'

export function Onboarding() {
  const { notify } = useToast()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [creating, setCreating] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function seed() {
    if (!userId) return
    setSeeding(true)
    try {
      const { data: client } = await supabase
        .from('clients')
        .insert({ user_id: userId, name: 'Acme Studio', company_name: 'Acme', status: 'active' })
        .select('id')
        .single()
      const today = new Date()
      const iso = (d: number) => {
        const x = new Date(today)
        x.setDate(x.getDate() + d)
        return x.toISOString().slice(0, 10)
      }
      const { data: projects } = await supabase
        .from('projects')
        .insert([
          {
            user_id: userId,
            client_id: client?.id,
            name: 'Acme Website',
            type: 'client',
            status: 'active',
            priority: 'high',
            deadline: iso(10),
          },
          {
            user_id: userId,
            name: 'Personal — Blog',
            type: 'personal',
            status: 'active',
            priority: 'low',
          },
        ])
        .select('id, name')
      const web = projects?.find((p) => p.name === 'Acme Website')
      const blog = projects?.find((p) => p.name === 'Personal — Blog')
      if (web) {
        await supabase.from('tasks').insert([
          { user_id: userId, project_id: web.id, title: 'Design the homepage', priority: 'high', due_date: iso(-1), status: 'in_progress' },
          { user_id: userId, project_id: web.id, title: 'Set up the CMS', priority: 'medium', due_date: iso(3) },
          { user_id: userId, project_id: web.id, title: 'Wire up the contact form', priority: 'medium' },
        ])
      }
      if (blog) {
        await supabase.from('tasks').insert([
          { user_id: userId, project_id: blog.id, title: 'Write "hello world" post', priority: 'low', due_date: iso(7) },
        ])
      }
      await qc.invalidateQueries()
      notify('Sample data added — explore, then delete it from Trash or Settings.', 'success')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to add sample data', 'error')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Card className="mb-5 border-[--color-accent]/40">
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <Rocket className="mt-0.5 size-5 text-[--color-accent]" />
          <div>
            <h2 className="text-sm font-semibold">Welcome to Grid Manager</h2>
            <p className="text-xs text-[--color-text-muted]">
              Your command center for every client, project and task. Let’s get you started.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[--color-text-muted]">
              What should we call you?
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-48"
              placeholder={profile?.display_name ?? 'Your name'}
            />
          </div>
          <Button
            onClick={async () => {
              await updateProfile.mutateAsync({ display_name: name.trim() })
              notify('Nice to meet you', 'success')
            }}
            disabled={!name.trim() || name.trim() === profile?.display_name}
            loading={updateProfile.isPending}
          >
            Save
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setCreating(true)}>
            Create your first project
          </Button>
          <Button onClick={seed} loading={seeding}>
            Add sample data
          </Button>
        </div>
      </CardBody>
      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </Card>
  )
}
