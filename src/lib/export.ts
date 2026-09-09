import { supabase } from '@/lib/supabase'
import { isTauri } from '@/lib/tauri'
import type { ActivityLog, Client, Project, Task } from '@/types/database'

export type ExportFormat = 'json' | 'csv' | 'markdown'

interface Bundle {
  exported_at: string
  clients: unknown[]
  projects: unknown[]
  tasks: unknown[]
  activity_logs: unknown[]
}

async function fetchAll(): Promise<Bundle> {
  const [clients, projects, tasks, activity] = await Promise.all([
    supabase.from('clients').select('*').order('created_at'),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('tasks').select('*').order('created_at'),
    supabase.from('activity_logs').select('*').order('created_at'),
  ])
  for (const r of [clients, projects, tasks, activity]) if (r.error) throw r.error
  return {
    exported_at: new Date().toISOString(),
    clients: clients.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    activity_logs: activity.data ?? [],
  }
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const esc = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

function toMarkdown(b: Bundle): string {
  const lines: string[] = [`# Grid Manager export`, ``, `_${b.exported_at}_`, ``]
  const projById = new Map((b.projects as Record<string, unknown>[]).map((p) => [p.id as string, p]))
  const tasksByProj = new Map<string, Record<string, unknown>[]>()
  for (const t of b.tasks as Record<string, unknown>[]) {
    const k = t.project_id as string
    tasksByProj.set(k, [...(tasksByProj.get(k) ?? []), t])
  }
  lines.push(`## Projects (${b.projects.length})`, ``)
  for (const p of b.projects as Record<string, unknown>[]) {
    lines.push(`### ${p.name}  \`${p.type}/${p.status}/${p.priority}\``)
    if (p.deadline) lines.push(`- Deadline: ${p.deadline}`)
    const ts = tasksByProj.get(p.id as string) ?? []
    for (const t of ts) {
      const done = t.status === 'done' ? 'x' : ' '
      lines.push(`- [${done}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`)
    }
    lines.push('')
  }
  lines.push(`## Clients (${b.clients.length})`, ``)
  for (const c of b.clients as Record<string, unknown>[]) {
    lines.push(`- **${c.name}**${c.company_name ? ` — ${c.company_name}` : ''}${c.email ? ` <${c.email}>` : ''}`)
  }
  void projById
  return lines.join('\n')
}

function render(bundle: Bundle, format: ExportFormat): { text: string; ext: string } {
  if (format === 'json') return { text: JSON.stringify(bundle, null, 2), ext: 'json' }
  if (format === 'markdown') return { text: toMarkdown(bundle), ext: 'md' }
  // CSV → one concatenated file with a section header per table
  const parts = (['clients', 'projects', 'tasks', 'activity_logs'] as const).map(
    (k) => `# ${k}\n${toCsv(bundle[k] as Record<string, unknown>[])}`,
  )
  return { text: parts.join('\n\n'), ext: 'csv' }
}

/** Fetch everything and hand the user a file. Uses the native save dialog under Tauri. */
export async function exportData(format: ExportFormat): Promise<'saved' | 'cancelled'> {
  const bundle = await fetchAll()
  const { text, ext } = render(bundle, format)
  const name = `grid-manager-export-${new Date().toISOString().slice(0, 10)}.${ext}`

  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({ defaultPath: name, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
    if (!path) return 'cancelled'
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, text)
    return 'saved'
  }

  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  return 'saved'
}

export interface ImportResult {
  clients: number
  projects: number
  tasks: number
  activity: number
}

/**
 * Import a JSON bundle previously produced by `exportData('json')`. Rows are
 * re-inserted under the current user with fresh ids; old→new id maps keep the
 * client→project→task→activity links intact. Existing data is left untouched.
 */
export async function importData(json: string, userId: string): Promise<ImportResult> {
  const bundle = JSON.parse(json) as {
    clients?: Client[]
    projects?: Project[]
    tasks?: Task[]
    activity_logs?: ActivityLog[]
  }
  const res: ImportResult = { clients: 0, projects: 0, tasks: 0, activity: 0 }
  const clientMap = new Map<string, string>()
  const projectMap = new Map<string, string>()
  const taskMap = new Map<string, string>()

  for (const c of bundle.clients ?? []) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name: c.name,
        company_name: c.company_name ?? null,
        email: c.email ?? null,
        notes: c.notes ?? null,
        status: c.status ?? 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    clientMap.set(c.id, data.id)
    res.clients++
  }

  for (const p of bundle.projects ?? []) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        client_id: p.client_id ? (clientMap.get(p.client_id) ?? null) : null,
        name: p.name,
        description: p.description ?? null,
        type: p.type ?? 'other',
        status: p.status ?? 'active',
        priority: p.priority ?? 'medium',
        deadline: p.deadline ?? null,
        review_interval_days: p.review_interval_days ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    projectMap.set(p.id, data.id)
    res.projects++
  }

  const taskRows = (bundle.tasks ?? [])
    .filter((t) => projectMap.has(t.project_id))
    .map((t) => ({
      user_id: userId,
      project_id: projectMap.get(t.project_id)!,
      title: t.title,
      description: t.description ?? null,
      status: t.status ?? 'todo',
      priority: t.priority ?? 'medium',
      due_date: t.due_date ?? null,
      start_date: t.start_date ?? null,
      estimated_minutes: t.estimated_minutes ?? null,
      recurrence: t.recurrence ?? 'none',
      recurrence_until: t.recurrence_until ?? null,
      completed_at: t.completed_at ?? null,
    }))
  if (taskRows.length) {
    const { data, error } = await supabase.from('tasks').insert(taskRows).select('id')
    if (error) throw error
    ;(bundle.tasks ?? [])
      .filter((t) => projectMap.has(t.project_id))
      .forEach((t, i) => taskMap.set(t.id, data[i]!.id))
    res.tasks = data.length
  }

  const noteRows = (bundle.activity_logs ?? [])
    .filter((a) => a.activity_type === 'note_added' && a.description)
    .map((a) => ({
      user_id: userId,
      project_id: a.project_id ? (projectMap.get(a.project_id) ?? null) : null,
      task_id: a.task_id ? (taskMap.get(a.task_id) ?? null) : null,
      activity_type: 'note_added' as const,
      description: a.description,
    }))
  if (noteRows.length) {
    const { error } = await supabase.from('activity_logs').insert(noteRows)
    if (error) throw error
    res.activity = noteRows.length
  }

  return res
}
