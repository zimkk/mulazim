import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAllOpenTasks } from '@/lib/api/tasks'
import { useProjects } from '@/lib/api/projects'
import { useSettings } from '@/lib/api/settings'
import { pushNotifications, type NotificationKind } from '@/lib/api/notifications'
import { useAuthStore } from '@/stores/authStore'
import { daysSince, daysUntil, isOverdue } from '@/lib/utils/dates'
import { projectHealth } from '@/lib/utils/health'
import { isStale } from '@/lib/utils/staleness'
import { isTauri } from '@/lib/tauri'

const CHECK_INTERVAL = 5 * 60_000

function withinQuietHours(now: Date, start: string, end: string): boolean {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  const s = (sh ?? 0) * 60 + (sm ?? 0)
  const e = (eh ?? 0) * 60 + (em ?? 0)
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e // wraps midnight
}

async function fireNative(title: string, body: string): Promise<void> {
  try {
    if (isTauri()) {
      const mod = await import('@tauri-apps/plugin-notification')
      if (!(await mod.isPermissionGranted())) {
        if ((await mod.requestPermission()) !== 'granted') return
      }
      mod.sendNotification({ title, body })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  } catch {
    /* notifications are best-effort */
  }
}

/** Background alert engine. Mount once in the app tree. */
export function NotificationEngine() {
  const userId = useAuthStore((s) => s.user?.id)
  const settings = useSettings()
  const projectsQ = useProjects()
  const tasksQ = useAllOpenTasks()
  const qc = useQueryClient()
  const running = useRef(false)

  const run = useCallback(async () => {
    if (running.current || !userId) return
    const n = settings.notifications
    if (!n.enabled) return
    const now = new Date()
    if (withinQuietHours(now, n.quietHoursStart, n.quietHoursEnd)) return

    running.current = true
    try {
      const projects = projectsQ.data ?? []
      const tasks = tasksQ.data ?? []
      const rows: { kind: NotificationKind; title: string; body?: string; link?: string }[] = []

      if (n.overdue) {
        const od = tasks.filter((t) => isOverdue(t.due_date))
        if (od.length) {
          rows.push({
            kind: 'overdue',
            title: `${od.length} overdue task${od.length === 1 ? '' : 's'}`,
            body: od.slice(0, 3).map((t) => t.title).join(', '),
            link: '/today',
          })
        }
      }
      if (n.dueSoonLeadDays > 0) {
        const soon = tasks.filter((t) => {
          if (isOverdue(t.due_date)) return false
          const d = daysUntil(t.due_date)
          return d !== null && d >= 0 && d <= n.dueSoonLeadDays
        })
        if (soon.length) {
          rows.push({
            kind: 'due_soon',
            title: `${soon.length} task${soon.length === 1 ? '' : 's'} due soon`,
            body: soon.slice(0, 3).map((t) => t.title).join(', '),
            link: '/upcoming',
          })
        }
      }
      if (n.staleProjects) {
        const stale = projects.filter((p) => isStale(p, settings.workflow.staleThresholds))
        for (const p of stale) {
          rows.push({
            kind: 'stale_project',
            title: `"${p.name}" has gone quiet`,
            body: `No activity for ${daysSince(p.last_activity_at)} days`,
            link: `/projects/${p.id}`,
          })
        }
      }
      if (n.needsReview) {
        const review = projects.filter(
          (p) =>
            p.status === 'active' &&
            p.review_interval_days != null &&
            daysSince(p.last_reviewed_at ?? p.created_at) >= p.review_interval_days,
        )
        for (const p of review) {
          rows.push({
            kind: 'needs_review',
            title: `"${p.name}" is due for review`,
            link: `/projects/${p.id}`,
          })
        }
      }

      void projectHealth // (kept imported for future per-health alerts)

      const added = await pushNotifications(userId, rows)
      if (added > 0) {
        void qc.invalidateQueries({ queryKey: ['notifications'] })
        const first = rows[0]!
        await fireNative(first.title, first.body ?? 'Open Grid Manager to review.')
      }

      // Daily digest
      if (n.dailyDigest) {
        const key = `gm-digest-${now.toISOString().slice(0, 10)}`
        const [dh, dm] = n.dailyDigestTime.split(':').map(Number)
        const target = (dh ?? 8) * 60 + (dm ?? 0)
        const cur = now.getHours() * 60 + now.getMinutes()
        if (cur >= target && !localStorage.getItem(key)) {
          localStorage.setItem(key, '1')
          const open = tasks.length
          const overdue = tasks.filter((t) => isOverdue(t.due_date)).length
          await pushNotifications(userId, [
            {
              kind: 'daily_digest',
              title: 'Your day at a glance',
              body: `${open} open task${open === 1 ? '' : 's'}${overdue ? `, ${overdue} overdue` : ''}.`,
              link: '/today',
            },
          ])
          void qc.invalidateQueries({ queryKey: ['notifications'] })
          await fireNative('Grid Manager — daily digest', `${open} open, ${overdue} overdue.`)
        }
      }
    } finally {
      running.current = false
    }
  }, [userId, settings, projectsQ.data, tasksQ.data, qc])

  useEffect(() => {
    const t = setTimeout(run, 4000) // shortly after launch
    const iv = setInterval(run, CHECK_INTERVAL)
    const onFocus = () => run()
    window.addEventListener('focus', onFocus)
    return () => {
      clearTimeout(t)
      clearInterval(iv)
      window.removeEventListener('focus', onFocus)
    }
  }, [run])

  return null
}
