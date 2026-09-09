import { supabase } from '@/lib/supabase'
import { isTauri } from '@/lib/tauri'

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
