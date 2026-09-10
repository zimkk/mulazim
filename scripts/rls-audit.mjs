/**
 * Tenant-isolation audit against the live Supabase project.
 *
 *   node scripts/rls-audit.mjs
 *
 * Creates two real users, has user A populate every table, then has user B try
 * every way of reaching that data: read it, update it, delete it, and insert
 * rows owned by A. Row Level Security is the only thing standing between two
 * accounts (ARCHITECTURE.md §11) — frontend filtering is not a security
 * boundary — so this asserts the boundary empirically rather than trusting the
 * migration files.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.
 * Set SUPABASE_SERVICE_ROLE_KEY in the environment to auto-delete the test users.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  (() => {
    try {
      return readFileSync(new URL('../.env', import.meta.url), 'utf8')
    } catch {
      console.error('This script needs a .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).')
      process.exit(1)
    }
  })()
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const URL_ = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const stamp = Date.now()

let pass = 0
let fail = 0
function ok(name, cond, detail = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

async function signUp(tag) {
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signUp({
    email: `gm-rls-${stamp}-${tag}@example.com`,
    password: `rls-Passw0rd!${tag}`,
    options: { data: { display_name: `RLS ${tag}` } },
  })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error(`signUp ${tag}: no session (email confirmation on?)`)
  return { sb, id: data.user.id }
}

async function main() {
  console.log(`\nRLS / tenant-isolation audit against ${URL_}\n`)
  const A = await signUp('a')
  const B = await signUp('b')
  console.log(`user A ${A.id}\nuser B ${B.id}\n`)
  await new Promise((r) => setTimeout(r, 600)) // let handle_new_user finish

  // ---- user A creates one row in every user-owned table ----
  const mk = async (table, row) => {
    const { data, error } = await A.sb.from(table).insert({ ...row, user_id: A.id }).select('*').single()
    if (error) throw new Error(`seed ${table}: ${error.message}`)
    return data
  }

  const client = await mk('clients', { name: 'RLS Co' })
  const project = await mk('projects', {
    name: 'RLS Project', type: 'client', status: 'active', priority: 'medium', client_id: client.id,
  })
  const task = await mk('tasks', {
    title: 'RLS Task', project_id: project.id, status: 'todo', priority: 'medium',
  })
  const subtask = await mk('subtasks', { task_id: task.id, title: 'RLS Subtask' })
  const tag = await mk('tags', { name: `rls-${stamp}`, color: 'slate' })
  const taskTag = await mk('task_tags', { task_id: task.id, tag_id: tag.id })
  const activity = await mk('activity_logs', {
    project_id: project.id, task_id: task.id, activity_type: 'task_created', description: 'seed',
  })
  const notification = await mk('notifications', { kind: 'due_soon', title: 'RLS note' })
  const timeEntry = await mk('time_entries', { task_id: task.id, project_id: project.id, started_at: new Date().toISOString() })
  const dailyPlan = await mk('daily_plans', { date: new Date().toISOString().slice(0, 10), task_ids: [task.id] })

  // [table, primary-key predicate]. task_tags and daily_plans use composite
  // keys; profiles and user_settings are keyed by the user id itself.
  const rows = [
    ['clients', { id: client.id }],
    ['projects', { id: project.id }],
    ['tasks', { id: task.id }],
    ['subtasks', { id: subtask.id }],
    ['tags', { id: tag.id }],
    ['task_tags', { task_id: taskTag.task_id, tag_id: taskTag.tag_id }],
    ['activity_logs', { id: activity.id }],
    ['notifications', { id: notification.id }],
    ['time_entries', { id: timeEntry.id }],
    ['daily_plans', { user_id: dailyPlan.user_id, date: dailyPlan.date }],
    ['profiles', { id: A.id }],
    ['user_settings', { id: A.id }],
  ]
  const at = (q, key) => Object.entries(key).reduce((acc, [k, v]) => acc.eq(k, v), q)
  console.log(`user A seeded ${rows.length} tables\n`)

  // ---- 1. B cannot READ any of A's rows ----
  console.log('user B cannot read user A rows')
  for (const [table] of rows) {
    const { data, error } = await B.sb.from(table).select('*')
    ok(`${table}: select returns none of A's rows`,
      !error && (data ?? []).every((r) => r.user_id !== A.id && r.id !== A.id),
      error ? error.message : `leaked ${(data ?? []).length} row(s)`)
  }

  // ---- 2. B cannot READ a specific row by primary key ----
  console.log('\nuser B cannot read user A rows addressed by id')
  for (const [table, key] of rows) {
    const { data, error } = await at(B.sb.from(table).select('*'), key)
    ok(`${table}: targeted select by key is empty`, !error && (data ?? []).length === 0,
      error ? error.message : `leaked ${(data ?? []).length} row(s)`)
  }

  // ---- 3. B cannot UPDATE A's rows ----
  console.log('\nuser B cannot update user A rows')
  const patch = {
    clients: { name: 'hacked' }, projects: { name: 'hacked' }, tasks: { title: 'hacked' },
    subtasks: { title: 'hacked' }, tags: { name: `hacked-${stamp}` }, task_tags: {},
    activity_logs: { description: 'hacked' }, notifications: { title: 'hacked' },
    time_entries: { notes: 'hacked' }, daily_plans: { task_ids: [] },
    profiles: { display_name: 'hacked' }, user_settings: {},
  }
  for (const [table, key] of rows) {
    const p = patch[table]
    if (!p || Object.keys(p).length === 0) continue
    const { data, error } = await at(B.sb.from(table).update(p), key).select('*')
    ok(`${table}: update affects 0 rows`, (data ?? []).length === 0,
      error ? error.message : `modified ${(data ?? []).length} row(s)`)
  }

  // ---- 4. B cannot DELETE A's rows ----
  console.log('\nuser B cannot delete user A rows')
  for (const [table, key] of rows) {
    const { data } = await at(B.sb.from(table).delete(), key).select('*')
    ok(`${table}: delete affects 0 rows`, (data ?? []).length === 0, `deleted ${(data ?? []).length} row(s)`)
  }

  // ---- 5. B cannot INSERT rows owned by A ----
  console.log('\nuser B cannot insert rows owned by user A')
  const spoof = {
    clients: { name: 'spoof' },
    projects: { name: 'spoof', type: 'personal', status: 'active', priority: 'low' },
    tags: { name: `spoof-${stamp}`, color: 'slate' },
    notifications: { kind: 'due_soon', title: 'spoof' },
    daily_plans: { date: '2030-01-01', task_ids: [] },
  }
  for (const [table, body] of Object.entries(spoof)) {
    const { data, error } = await B.sb.from(table).insert({ ...body, user_id: A.id }).select('*')
    ok(`${table}: insert with user_id=A is rejected`, !!error || (data ?? []).length === 0,
      'insert unexpectedly succeeded')
  }

  // ---- 6. A's data is still intact after all of B's attempts ----
  console.log('\nuser A data survived every attempt')
  for (const [table, key] of rows) {
    const { data, error } = await at(A.sb.from(table).select('*'), key)
    ok(`${table}: A's row still present`, !error && (data ?? []).length === 1, error?.message)
  }

  // ---- cleanup ----
  console.log('\ncleanup')
  await A.sb.from('projects').delete().eq('id', project.id)
  await A.sb.from('clients').delete().eq('id', client.id)
  await A.sb.from('tags').delete().eq('id', tag.id)
  if (SERVICE) {
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
    for (const u of [A.id, B.id]) await admin.auth.admin.deleteUser(u)
    ok('test users deleted', true)
  } else {
    console.log(`  (left test users ${A.id}, ${B.id} — set SUPABASE_SERVICE_ROLE_KEY to auto-delete)`)
  }

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error('\nFATAL', e)
  process.exit(1)
})
