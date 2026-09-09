import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react'
import { useClients } from '@/lib/api/clients'
import { useProjects } from '@/lib/api/projects'
import { useUiStore } from '@/stores/uiStore'
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
    return [...nav, ...proj, ...cli]
  }, [projects, clients, navigate, setOverlay])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items.slice(0, 8)
    return items.filter((i) => i.label.toLowerCase().includes(t)).slice(0, 12)
  }, [items, q])

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])
  useEffect(() => setActive(0), [q])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-6 pt-[12vh]"
      onMouseDown={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-[--color-border] bg-[--color-surface] shadow-xl"
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
        <div className="flex items-center gap-2 border-b border-[--color-border] px-3">
          <Search className="size-4 text-[--color-text-subtle]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to… or type a command"
            className="w-full bg-transparent py-3 text-sm text-[--color-text] outline-none placeholder:text-[--color-text-subtle]"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-[--color-text-muted]">No matches</li>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => item.run()}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm',
                    i === active ? 'bg-[--color-surface-2]' : '',
                  )}
                >
                  <Icon className="size-4 shrink-0 text-[--color-text-muted]" />
                  <span className="flex-1 truncate text-[--color-text]">{item.label}</span>
                  {item.hint && (
                    <span className="text-xs text-[--color-text-subtle]">{item.hint}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
