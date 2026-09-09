import { useEffect, useState } from 'react'
import { Page, PageHeader } from '@/components/layout/AppShell'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormRow, Input, Select } from '@/components/ui/Field'
import { UpdateManager } from '@/components/updates/UpdateManager'
import { useToast } from '@/components/Toast'
import { useProfile, useUpdateProfile } from '@/lib/api/profile'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { DEFAULT_STALE_THRESHOLDS } from '@/lib/utils/staleness'

const APP_VERSION = '0.1.0'

export default function Settings() {
  const email = useAuthStore((s) => s.user?.email ?? '')
  const signOut = useAuthStore((s) => s.signOut)
  const { theme, setTheme, staleThresholds, setStaleThresholds } = useUiStore()
  const { notify } = useToast()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const [name, setName] = useState('')
  useEffect(() => setName(profile?.display_name ?? ''), [profile?.display_name])

  async function saveName() {
    await updateProfile.mutateAsync({ display_name: name.trim() })
    notify('Name updated', 'success')
  }

  return (
    <Page>
      <PageHeader title="Settings" />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Account" />
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{email}</p>
                <p className="text-xs text-[--color-text-muted]">
                  Your data lives in Supabase and syncs to any computer you sign in from.
                </p>
              </div>
              <Button variant="danger" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
            <FormRow label="Display name">
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-xs"
                  placeholder="Shown in the dashboard greeting"
                />
                <Button
                  onClick={saveName}
                  loading={updateProfile.isPending}
                  disabled={name.trim() === (profile?.display_name ?? '')}
                >
                  Save
                </Button>
              </div>
            </FormRow>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Appearance" />
          <CardBody>
            <FormRow label="Theme">
              <Select
                value={theme}
                onChange={(e) => setTheme(e.target.value as typeof theme)}
                className="w-40"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </Select>
            </FormRow>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stale-project thresholds" />
          <CardBody className="space-y-3">
            <p className="text-xs text-[--color-text-muted]">
              Days of inactivity before an active project is flagged. Stored on this computer for now.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <FormRow label="Active ≤">
                <Input
                  type="number"
                  min={0}
                  value={staleThresholds.active}
                  onChange={(e) =>
                    setStaleThresholds({ ...staleThresholds, active: Number(e.target.value) })
                  }
                />
              </FormRow>
              <FormRow label="Normal ≤">
                <Input
                  type="number"
                  min={0}
                  value={staleThresholds.normal}
                  onChange={(e) =>
                    setStaleThresholds({ ...staleThresholds, normal: Number(e.target.value) })
                  }
                />
              </FormRow>
              <FormRow label="Attention ≤">
                <Input
                  type="number"
                  min={0}
                  value={staleThresholds.attention}
                  onChange={(e) =>
                    setStaleThresholds({ ...staleThresholds, attention: Number(e.target.value) })
                  }
                />
              </FormRow>
            </div>
            <Button size="sm" onClick={() => setStaleThresholds(DEFAULT_STALE_THRESHOLDS)}>
              Reset to defaults
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Updates" />
          <CardBody className="space-y-2">
            <p className="text-xs text-[--color-text-muted]">Current version {APP_VERSION}</p>
            <UpdateManager />
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
