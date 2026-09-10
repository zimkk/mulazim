import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react'
import { useClients } from '@/lib/api/clients'
import { useProjects } from '@/lib/api/projects'
import { useAllOpenTasks } from '@/lib/api/tasks'
import { useUiStore } from '@/stores/uiStore'
import { AnimatePresence, backdrop, m, modalPanel } from '@/lib/motion'
import { cn } from '@/lib/utils/cn'

interface Item {
  id: string
  label: string
  hint?: string
  icon: typeof Search
  run: () => void
}

/** Ctrl/Cmd-K palette: jump to a screen, a project or client, or start a create flow. */
export function CommandPalette() {
  const open = useUiStore((s) => s.overlay) === 'palette'
  const setOverlay = useUiStore((s) => s.setOverlay)
  const navigate = useNavigate()
  const { data: projects } = useProjects()
  const { data: clients } = useClients()
  const { data: tasks } = useAllOpenTasks()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => setOverlay('none'), [setOverlay])

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      navigate(to)
      setOverlay('none')
    }
    const nav: Item[] = [
      { id: 'nav-dash', label: 'Dashboard', icon: LayoutDashboard, run: go('/') },
      { id: 'nav-proj', label: 'Projects', icon: FolderKanban, run: go('/projects') },
      { id: 'nav-cli', label: 'Clients', icon: Users, run: go('/clients') },
      { id: 'nav-act', label: 'Activity', icon: Activity, run: go('/activity') },
      { id: 'nav-set', label: 'Settings', icon: SettingsIcon, run: go('/settings') },
      {
        id: 'new-proj',
        label: 'New project',
        hint: '⌘⇧P',
        icon: Plus,
        run: () => setOverlay('newProject'),
      },
      { id: 'new-task', label: 'New task', hint: '⌘N', icon: Plus, run: () => setOverlay('newTask') },
    ]
    const proj: Item[] = (projects ?? []).map((p) => ({
      id: `p-${p.id}`,
      label: p.name,
      hint: 'Project',
      icon: FolderKanban,
      run: go(`/projects/${p.id}`),
    }))
    const cli: Item[] = (clients ?? []).map((c) => ({
      id: `c-${c.id}`,
      label: c.name,
      hint: 'Client',
      icon: Users,
      run: go(`/clients/${c.id}`),
    }))
    const tsk: Item[] = (tasks ?? []).map((t) => ({
      id: `t-${t.id}`,
      label: t.title,
      hint: t.project?.name ?? 'Task',
      icon: ListChecks,
      run: t.project ? go(`/projects/${t.project.id}`) : () => setOverlay('none'),
    }))
    return [...nav, ...proj, ...cli, ...tsk]
  }, [projects, clients, tasks, navigate, setOverlay])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items.slice(0, 8)
    return items.filter((i) => i.label.toLowerCase().includes(t)).slice(0, 15)
  }, [items, q])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])
  useEffect(() => setActive(0), [q])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-6 pt-[12vh] backdrop-blur-sm"
          variants={backdrop}
          initial="hidden"
          animate="show"
          exit="exit"
          onMouseDown={close}
        >
          <m.div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, filtered.length - 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                filtered[active]?.run()
              }
            }}
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4">
              <Search className="size-4 text-[var(--color-text-subtle)]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Jump to… or type a command"
                className="w-full bg-transparent py-3.5 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">No matches</li>
              )}
              {filtered.map((item, i) => {
                const Icon = item.icon
                const isActive = i === active
                return (
                  <li key={item.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => item.run()}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-subtle)]',
                        )}
                      />
                      <span className="flex-1 truncate text-[var(--color-text)]">{item.label}</span>
                      {item.hint && (
                        <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--color-text-subtle)]">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
