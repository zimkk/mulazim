import { useEffect, useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { SettingRow, Segmented, Toggle } from '@/components/ui/Controls'
import { UpdateManager } from '@/components/updates/UpdateManager'
import { useToast } from '@/components/Toast'
import { useProfile, useUpdateProfile } from '@/lib/api/profile'
import { useSettings, useUpdateSettings } from '@/lib/api/settings'
import { useProjects } from '@/lib/api/projects'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { exportData, type ExportFormat } from '@/lib/export'
import { appVersion, isAutostartEnabled, isTauri, setAutostart } from '@/lib/tauri'
import { DEFAULT_SETTINGS, DASHBOARD_CARD_IDS, DASHBOARD_CARD_LABEL } from '@/lib/settings'
import type { DashboardCardId } from '@/lib/settings'
import { PRIORITIES } from '@/lib/constants'
import type { Priority } from '@/types/database'

const ACCENTS = ['blue', 'violet', 'green', 'amber', 'rose', 'slate'] as const
const ACCENT_HEX: Record<string, string> = {
  blue: '#2563eb',
  violet: '#7c3aed',
  green: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  slate: '#475569',
}

/* ----------------------------- Account ----------------------------- */
export function AccountSection() {
  const { notify } = useToast()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const email = useAuthStore((s) => s.user?.email ?? '')
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [wipeText, setWipeText] = useState('')
  const [wiping, setWiping] = useState(false)
  useEffect(() => setName(profile?.display_name ?? ''), [profile?.display_name])

  async function changePassword() {
    if (pw.length < 6) return
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) notify(error.message, 'error')
    else {
      setPw('')
      notify('Password updated', 'success')
    }
  }

  async function wipeAll() {
    setWiping(true)
    try {
      // Order respects FKs; activity + tasks cascade from projects but be explicit.
      for (const t of ['activity_logs', 'tasks', 'projects', 'clients'] as const) {
        const { error } = await supabase.from(t).delete().not('id', 'is', null)
        if (error) throw error
      }
      notify('All clients, projects, tasks and activity deleted', 'success')
      setWipeText('')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed', 'error')
    } finally {
      setWiping(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Profile" />
        <CardBody>
          <SettingRow
            title="Email"
            description="Your sign-in address. Data syncs to any device using this account."
            control={<span className="text-sm text-[--color-text-muted]">{email}</span>}
          />
          <SettingRow
            title="Display name"
            description="Shown in the dashboard greeting."
            control={
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
                <Button
                  onClick={async () => {
                    await updateProfile.mutateAsync({ display_name: name.trim() })
                    notify('Saved', 'success')
                  }}
                  loading={updateProfile.isPending}
                  disabled={name.trim() === (profile?.display_name ?? '')}
                >
                  Save
                </Button>
              </div>
            }
          />
          <SettingRow
            title="Change password"
            description="At least 6 characters."
            control={
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="New password"
                  className="w-48"
                />
                <Button onClick={changePassword} loading={pwBusy} disabled={pw.length < 6}>
                  Update
                </Button>
              </div>
            }
          />
          <SettingRow
            title="Sign out"
            description="End the session on this device."
            control={
              <Button variant="secondary" onClick={() => void supabase.auth.signOut()}>
                Sign out
              </Button>
            }
          />
        </CardBody>
      </Card>

      <Card className="border-[--color-stale]/40">
        <CardHeader
          title={
            <span className="flex items-center gap-1.5 text-[--color-stale]">
              <AlertTriangle className="size-4" /> Danger zone
            </span>
          }
        />
        <CardBody>
          <SettingRow
            title="Delete all data"
            description="Permanently removes every client, project, task and activity record. Your account stays."
            stacked
            control={
              <div className="flex items-center gap-2">
                <Input
                  value={wipeText}
                  onChange={(e) => setWipeText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-56"
                />
                <Button
                  variant="danger"
                  disabled={wipeText !== 'DELETE'}
                  loading={wiping}
                  onClick={wipeAll}
                >
                  Delete everything
                </Button>
              </div>
            }
          />
        </CardBody>
      </Card>
    </div>
  )
}

/* ----------------------------- Appearance ----------------------------- */
export function AppearanceSection() {
  const s = useSettings()
  const update = useUpdateSettings()
  const a = s.appearance
  const set = (patch: Partial<typeof a>) => update({ appearance: patch })

  return (
    <Card>
      <CardHeader title="Appearance" />
      <CardBody>
        <SettingRow
          title="Theme"
          control={
            <Segmented
              value={a.theme}
              onChange={(v) => set({ theme: v })}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          }
        />
        <SettingRow
          title="Accent colour"
          control={
            <div className="flex gap-1.5">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  onClick={() => set({ accent: c })}
                  className="flex size-6 items-center justify-center rounded-full border border-[--color-border]"
                  style={{ background: ACCENT_HEX[c] }}
                >
                  {a.accent === c && <Check className="size-3.5 text-white" />}
                </button>
              ))}
            </div>
          }
        />
        <SettingRow
          title="Density"
          control={
            <Segmented
              value={a.density}
              onChange={(v) => set({ density: v })}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          }
        />
        <SettingRow
          title="Font size"
          control={
            <Segmented
              value={a.fontSize}
              onChange={(v) => set({ fontSize: v })}
              options={[
                { value: 'sm', label: 'S' },
                { value: 'md', label: 'M' },
                { value: 'lg', label: 'L' },
              ]}
            />
          }
        />
        <SettingRow
          title="Reduce motion"
          description="Minimise animations and transitions."
          control={<Toggle checked={a.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />}
        />
        <SettingRow
          title="First day of week"
          control={
            <Segmented
              value={String(a.firstDayOfWeek) as '0' | '1'}
              onChange={(v) => set({ firstDayOfWeek: Number(v) as 0 | 1 })}
              options={[
                { value: '0', label: 'Sunday' },
                { value: '1', label: 'Monday' },
              ]}
            />
          }
        />
      </CardBody>
    </Card>
  )
}

/* ----------------------------- General ----------------------------- */
export function GeneralSection() {
  const s = useSettings()
  const update = useUpdateSettings()
  const g = s.general
  const { data: projects } = useProjects()
  const set = (patch: Partial<typeof g>) => update({ general: patch })

  return (
    <Card>
      <CardHeader title="General" />
      <CardBody>
        <SettingRow
          title="Open on launch"
          control={
            <Select
              value={g.landingView}
              onChange={(e) => set({ landingView: e.target.value as typeof g.landingView })}
              className="w-40"
            >
              <option value="dashboard">Dashboard</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="projects">Projects</option>
            </Select>
          }
        />
        <SettingRow
          title="Default task priority"
          control={
            <Select
              value={g.defaultTaskPriority}
              onChange={(e) => set({ defaultTaskPriority: e.target.value as Priority })}
              className="w-32"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          }
        />
        <SettingRow
          title="Default project for quick-add"
          control={
            <Select
              value={g.defaultProjectId ?? ''}
              onChange={(e) => set({ defaultProjectId: e.target.value || null })}
              className="w-48"
            >
              <option value="">Ask each time</option>
              {(projects ?? [])
                .filter((p) => p.status === 'active')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          }
        />
        <SettingRow
          title="Date display"
          control={
            <Segmented
              value={g.dateStyle}
              onChange={(v) => set({ dateStyle: v })}
              options={[
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
              ]}
            />
          }
        />
        <SettingRow
          title="Confirm before deleting"
          control={
            <Toggle checked={g.confirmBeforeDelete} onChange={(v) => set({ confirmBeforeDelete: v })} />
          }
        />
        <SettingRow
          title="Upcoming view range"
          description="How many days the Upcoming screen shows."
          control={
            <Input
              type="number"
              min={1}
              max={30}
              value={g.upcomingDays}
              onChange={(e) => set({ upcomingDays: Math.max(1, Number(e.target.value)) })}
              className="w-20"
            />
          }
        />
      </CardBody>
    </Card>
  )
}

/* ----------------------------- Notifications ----------------------------- */
export function NotificationsSection() {
  const s = useSettings()
  const update = useUpdateSettings()
  const n = s.notifications
  const set = (patch: Partial<typeof n>) => update({ notifications: patch })
  const { notify } = useToast()
  const [perm, setPerm] = useState<string>('unknown')

  useEffect(() => {
    void (async () => {
      if (!isTauri()) return setPerm(Notification?.permission ?? 'unsupported')
      const { isPermissionGranted } = await import('@tauri-apps/plugin-notification')
      setPerm((await isPermissionGranted()) ? 'granted' : 'denied')
    })()
  }, [])

  async function requestPerm() {
    if (isTauri()) {
      const { requestPermission } = await import('@tauri-apps/plugin-notification')
      setPerm(await requestPermission())
    } else if ('Notification' in window) {
      setPerm(await Notification.requestPermission())
    }
    notify('Permission updated', 'success')
  }

  return (
    <Card>
      <CardHeader title="Notifications" />
      <CardBody>
        <SettingRow
          title="Desktop notifications"
          description={`OS permission: ${perm}`}
          control={
            <div className="flex items-center gap-2">
              {perm !== 'granted' && (
                <Button size="sm" onClick={requestPerm}>
                  Allow
                </Button>
              )}
              <Toggle checked={n.enabled} onChange={(v) => set({ enabled: v })} />
            </div>
          }
        />
        <SettingRow
          title="Overdue tasks"
          control={<Toggle checked={n.overdue} onChange={(v) => set({ overdue: v })} />}
        />
        <SettingRow
          title="Due soon"
          description="Warn this many days before a task is due (0 = off)."
          control={
            <Input
              type="number"
              min={0}
              max={14}
              value={n.dueSoonLeadDays}
              onChange={(e) => set({ dueSoonLeadDays: Math.max(0, Number(e.target.value)) })}
              className="w-20"
            />
          }
        />
        <SettingRow
          title="Stale projects"
          control={<Toggle checked={n.staleProjects} onChange={(v) => set({ staleProjects: v })} />}
        />
        <SettingRow
          title="Projects needing review"
          control={<Toggle checked={n.needsReview} onChange={(v) => set({ needsReview: v })} />}
        />
        <SettingRow
          title="Daily digest"
          description="A once-a-day summary of what needs attention."
          control={
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={n.dailyDigestTime}
                onChange={(e) => set({ dailyDigestTime: e.target.value })}
                className="w-28"
                disabled={!n.dailyDigest}
              />
              <Toggle checked={n.dailyDigest} onChange={(v) => set({ dailyDigest: v })} />
            </div>
          }
        />
        <SettingRow
          title="Quiet hours"
          description="No notifications between these times."
          control={
            <div className="flex items-center gap-1.5">
              <Input
                type="time"
                value={n.quietHoursStart}
                onChange={(e) => set({ quietHoursStart: e.target.value })}
                className="w-28"
              />
              <span className="text-xs text-[--color-text-muted]">to</span>
              <Input
                type="time"
                value={n.quietHoursEnd}
                onChange={(e) => set({ quietHoursEnd: e.target.value })}
                className="w-28"
              />
            </div>
          }
        />
      </CardBody>
    </Card>
  )
}

/* ----------------------------- Workflow ----------------------------- */
export function WorkflowSection() {
  const s = useSettings()
  const update = useUpdateSettings()
  const w = s.workflow

  function moveCard(id: DashboardCardId, dir: -1 | 1) {
    const list = [...w.dashboardCards] as DashboardCardId[]
    const i = list.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j]!, list[i]!]
    update({ workflow: { dashboardCards: list } })
  }
  function toggleCard(id: DashboardCardId, on: boolean) {
    const set = new Set(w.dashboardCards)
    if (on) set.add(id)
    else set.delete(id)
    update({
      workflow: { dashboardCards: DASHBOARD_CARD_IDS.filter((c) => set.has(c)) as string[] },
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Stale-project thresholds" />
        <CardBody>
          <p className="mb-2 text-xs text-[--color-text-muted]">
            Days of inactivity before an active project is flagged.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(['active', 'normal', 'attention'] as const).map((k) => (
              <label key={k} className="text-xs text-[--color-text-muted]">
                {k} ≤
                <Input
                  type="number"
                  min={0}
                  value={w.staleThresholds[k]}
                  onChange={(e) =>
                    update({
                      workflow: {
                        staleThresholds: { ...w.staleThresholds, [k]: Number(e.target.value) },
                      },
                    })
                  }
                  className="mt-1"
                />
              </label>
            ))}
          </div>
          <Button
            size="sm"
            className="mt-3"
            onClick={() =>
              update({ workflow: { staleThresholds: DEFAULT_SETTINGS.workflow.staleThresholds } })
            }
          >
            Reset
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Dashboard cards" />
        <CardBody>
          <p className="mb-2 text-xs text-[--color-text-muted]">
            Choose which cards appear and their order.
          </p>
          <ul className="divide-y divide-[--color-border]">
            {(DASHBOARD_CARD_IDS as readonly DashboardCardId[]).map((id) => {
              const on = w.dashboardCards.includes(id)
              return (
                <li key={id} className="flex items-center gap-3 py-2">
                  <Toggle checked={on} onChange={(v) => toggleCard(id, v)} />
                  <span className="flex-1 text-sm">{DASHBOARD_CARD_LABEL[id]}</span>
                  <button
                    className="px-1 text-xs text-[--color-text-muted] hover:text-[--color-text] disabled:opacity-30"
                    disabled={!on}
                    onClick={() => moveCard(id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="px-1 text-xs text-[--color-text-muted] hover:text-[--color-text] disabled:opacity-30"
                    disabled={!on}
                    onClick={() => moveCard(id, 1)}
                  >
                    ↓
                  </button>
                </li>
              )
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}

/* ----------------------------- Keyboard ----------------------------- */
const SHORTCUTS: [string, string][] = [
  ['Command palette / search', '⌘ / Ctrl + K'],
  ['New task', '⌘ / Ctrl + N'],
  ['New project', '⌘ / Ctrl + ⇧ + P'],
  ['Keyboard shortcuts', '⌘ / Ctrl + /'],
  ['Settings', '⌘ / Ctrl + ,'],
  ['Close dialog', 'Esc'],
]

export function KeyboardSection() {
  return (
    <Card>
      <CardHeader title="Keyboard shortcuts" />
      <CardBody>
        <ul className="divide-y divide-[--color-border]">
          {SHORTCUTS.map(([what, keys]) => (
            <li key={what} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-[--color-text-muted]">{what}</span>
              <kbd className="rounded border border-[--color-border] bg-[--color-surface-2] px-1.5 py-0.5 text-xs">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[--color-text-subtle]">Rebindable shortcuts are planned.</p>
      </CardBody>
    </Card>
  )
}

/* ----------------------------- Data ----------------------------- */
export function DataSection() {
  const { notify } = useToast()
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  async function run(format: ExportFormat) {
    setBusy(format)
    try {
      const r = await exportData(format)
      if (r === 'saved') notify(`Exported as ${format.toUpperCase()}`, 'success')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Export failed', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader title="Export your data" />
      <CardBody className="space-y-3">
        <p className="text-xs text-[--color-text-muted]">
          Download every client, project, task and activity record. Your data always belongs to you.
        </p>
        <div className="flex gap-2">
          {(['json', 'csv', 'markdown'] as ExportFormat[]).map((f) => (
            <Button key={f} onClick={() => run(f)} loading={busy === f}>
              {f.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

/* ----------------------------- Updates ----------------------------- */
export function UpdatesSection() {
  const s = useSettings()
  const update = useUpdateSettings()
  const [autostart, setA] = useState(false)
  useEffect(() => {
    void isAutostartEnabled().then(setA)
  }, [])

  return (
    <Card>
      <CardHeader title="Updates & startup" />
      <CardBody className="space-y-1">
        <p className="pb-2 text-xs text-[--color-text-muted]">
          The app checks for updates on launch. When one is available you’ll be asked before it
          installs.
        </p>
        {isTauri() && (
          <>
            <SettingRow
              title="Launch at login"
              control={
                <Toggle
                  checked={autostart}
                  onChange={async (v) => {
                    await setAutostart(v)
                    setA(v)
                    update({ desktop: { autostart: v } })
                  }}
                />
              }
            />
            <SettingRow
              title="Start minimised"
              control={
                <Toggle
                  checked={s.desktop.startMinimized}
                  onChange={(v) => update({ desktop: { startMinimized: v } })}
                />
              }
            />
          </>
        )}
        <div className="pt-3">
          <UpdateManager />
        </div>
      </CardBody>
    </Card>
  )
}

/* ----------------------------- About ----------------------------- */
export function AboutSection() {
  const [version, setVersion] = useState('0.1.0')
  useEffect(() => {
    void appVersion().then(setVersion)
  }, [])

  return (
    <Card>
      <CardHeader title="About Grid Manager" />
      <CardBody className="space-y-2 text-sm">
        <p>
          <span className="text-[--color-text-muted]">Version</span> {version}
        </p>
        <p className="text-[--color-text-muted]">
          A personal, cross-platform project & task command center. Cloud-backed by Supabase,
          self-updating via GitHub Releases.
        </p>
        <p className="text-xs text-[--color-text-subtle]">
          Built with Tauri, React, TypeScript and Tailwind. See ARCHITECTURE.md in the repo.
        </p>
      </CardBody>
    </Card>
  )
}
