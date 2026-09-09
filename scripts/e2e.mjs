/**
 * End-to-end check against the live Supabase project.
 * Exercises the same calls the app makes: auth, CRUD, triggers, RLS isolation.
 *
 *   node scripts/e2e.mjs
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.
 * If SUPABASE_SERVICE_ROLE_KEY is present in the environment, test users are
 * deleted at the end (otherwise they're left in place and their ids printed).
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// --- tiny .env loader (no dependency) ---
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const URL_ = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stamp = Date.now()
const mkEmail = (s) => `gm-e2e-${stamp}-${s}@example.com`
const PW = 'e2e-Passw0rd!'

const clientFor = () => createClient(URL_, ANON, { auth: { persistSession: false } })

async function signUp(tag) {
  const sb = clientFor()
  const { data, error } = await sb.auth.signUp({
    email: mkEmail(tag),
    password: PW,
    options: { data: { display_name: `E2E ${tag}` } },
  })
  if (error) throw new Error(`signUp ${tag}: ${error.message}`)
  if (!data.session) throw new Error(`signUp ${tag}: no session (email confirmation still on?)`)
  return { sb, user: data.user }
}

async function main() {
  console.log(`\nE2E against ${URL_}\n`)

  console.log('auth + profile trigger')
  const A = await signUp('a')
  ok('user A signed up with a session', !!A.user?.id)
  await sleep(400)
  {
    const { data, error } = await A.sb.from('profiles').select('*').eq('id', A.user.id).single()
    ok('handle_new_user created a profile row', !error && data?.id === A.user.id, error?.message)
    ok('profile display_name from metadata', data?.display_name === 'E2E a', data?.display_name)
  }

  console.log('\nclients / projects / tasks CRUD')
  const { data: client, error: cErr } = await A.sb
    .from('clients')
    .insert({ name: 'Acme Co', company_name: 'Acme', user_id: A.user.id })
    .select('*')
    .single()
  ok('insert client', !cErr && !!client?.id, cErr?.message)
  ok('client scoped to user A', client?.user_id === A.user.id)

  const { data: project, error: pErr } = await A.sb
    .from('projects')
    .insert({
      name: 'Acme Website',
      type: 'client',
      status: 'active',
      priority: 'high',
      client_id: client.id,
      user_id: A.user.id,
    })
    .select('*')
    .single()
  ok('insert project linked to client', !pErr && project?.client_id === client.id, pErr?.message)
  const la0 = project.last_activity_at

  await sleep(1200)
  const { data: task, error: tErr } = await A.sb
    .from('tasks')
    .insert({
      title: 'Ship homepage',
      project_id: project.id,
      user_id: A.user.id,
      status: 'todo',
      priority: 'medium',
      due_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    })
    .select('*')
    .single()
  ok('insert task', !tErr && !!task?.id, tErr?.message)

  {
    const { data: p2 } = await A.sb.from('projects').select('last_activity_at, updated_at').eq('id', project.id).single()
    ok('trigger bumped projects.last_activity_at on task insert', new Date(p2.last_activity_at) > new Date(la0),
      `${la0} -> ${p2?.last_activity_at}`)
  }

  console.log('\nactivity log + joined reads')
  {
    const { error } = await A.sb.from('activity_logs').insert({
      user_id: A.user.id,
      project_id: project.id,
      task_id: task.id,
      activity_type: 'task_created',
      description: 'Created task "Ship homepage"',
    })
    ok('insert activity_log', !error, error?.message)
  }
  {
    const { data, error } = await A.sb
      .from('tasks')
      .select('*, project:projects(id, name, type, status)')
      .eq('project_id', project.id)
    ok('read tasks with project join', !error && data?.[0]?.project?.name === 'Acme Website', error?.message)
  }
  {
    const { data, error } = await A.sb
      .from('activity_logs')
      .select('*, project:projects(id, name), task:tasks(id, title)')
      .order('created_at', { ascending: false })
      .limit(10)
    ok('read activity with project+task joins', !error && data?.[0]?.task?.title === 'Ship homepage', error?.message)
  }

  console.log('\nupdate + updated_at trigger')
  {
    const before = task.updated_at
    await sleep(1100)
    const { data, error } = await A.sb
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', task.id)
      .select('status, completed_at, updated_at')
      .single()
    ok('task marked done', !error && data?.status === 'done', error?.message)
    ok('set_updated_at trigger fired', new Date(data.updated_at) > new Date(before),
      `${before} -> ${data?.updated_at}`)
  }

  console.log('\nRLS isolation')
  const B = await signUp('b')
  {
    const { data, error } = await B.sb.from('clients').select('*')
    ok('user B sees none of user A clients', !error && (data?.length ?? 0) === 0, `got ${data?.length}`)
  }
  {
    const { data, error } = await B.sb.from('projects').select('*')
    ok('user B sees none of user A projects', !error && (data?.length ?? 0) === 0, `got ${data?.length}`)
  }
  {
    const { data } = await B.sb.from('clients').update({ name: 'hacked' }).eq('id', client.id).select('*')
    ok('user B cannot update user A client (0 rows)', (data?.length ?? 0) === 0)
  }
  {
    const { error } = await B.sb.from('projects').insert({
      name: 'spoof', type: 'client', status: 'active', priority: 'low', user_id: A.user.id,
    })
    ok('user B cannot insert a row owned by user A', !!error, 'insert unexpectedly succeeded')
  }

  console.log('\ncleanup')
  await A.sb.from('projects').delete().eq('id', project.id) // cascades tasks + activity
  await A.sb.from('clients').delete().eq('id', client.id)
  {
    const { data } = await A.sb.from('projects').select('id').eq('id', project.id)
    ok('project + cascade deleted', (data?.length ?? 0) === 0)
  }

  if (SERVICE) {
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } })
    for (const u of [A.user.id, B.user.id]) await admin.auth.admin.deleteUser(u)
    ok('test auth users deleted', true)
  } else {
    console.log(`  (left test users: ${A.user.id}, ${B.user.id} — set SUPABASE_SERVICE_ROLE_KEY to auto-delete)`)
  }

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error('\nFATAL', e)
  process.exit(1)
})
