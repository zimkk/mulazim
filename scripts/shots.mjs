/** Quick visual capture of key screens for review. node scripts/shots.mjs */
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const BASE = 'http://localhost:4173'
const OUT = fileURLToPath(new URL('../.artifacts/', import.meta.url))
mkdirSync(OUT, { recursive: true })
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1360, height: 900 })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (n) => page.screenshot({ path: `${OUT}shot-${n}.png` })
const type = async (sel, t) => {
  await page.waitForSelector(sel)
  await page.type(sel, t)
}
const clickText = async (sel, text) => {
  const h = await page.evaluateHandle(
    (s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent?.includes(t)),
    sel,
    text,
  )
  await h.asElement().click()
}

await page.goto(BASE, { waitUntil: 'networkidle2' })
await page.waitForSelector('#root *')
await clickText('button', "Don't have an account? Sign up")
await page.waitForFunction(() => [...document.querySelectorAll('h1')].some((h) => h.textContent?.includes('Create your account')))
const email = `gm-shots-${Date.now()}@example.com`
await type('input[type="email"]', email)
await type('input[type="password"]', 'Passw0rd!shots')
await clickText('button', 'Sign up')
await page.waitForFunction(() => location.hash === '#/' || document.body.innerText.includes('Good '), { timeout: 15000 })
await sleep(1500)

// seed a bit of data via the UI quick-add
await sleep(500)
await shot('01-dashboard-empty')

await clickText('a', 'Projects')
await sleep(400)
await clickText('button', 'New project')
await sleep(400)
await type('#project-form input', 'Acme Website Revamp')
await clickText('button[form="project-form"]', 'Create')
await sleep(800)
await clickText('a', 'Acme Website Revamp')
await sleep(600)
const q = await page.$('input[placeholder="Add a task and press Enter"]')
for (const t of ['Design homepage', 'Wire up checkout', 'Fix mobile nav', 'Write copy']) {
  await q.type(t)
  await q.press('Enter')
  await sleep(500)
}
await shot('02-project-detail')

await clickText('a', 'Today')
await sleep(600)
await shot('03-today')

await clickText('a', 'Settings')
await sleep(400)
await clickText('a', 'Appearance')
await sleep(400)
await shot('04-settings-appearance')
await clickText('a', 'Notifications')
await sleep(400)
await shot('05-settings-notifications')
await clickText('a', 'Workflow')
await sleep(400)
await shot('06-settings-workflow')

// dark -> light
await clickText('a', 'Appearance')
await sleep(300)
await clickText('button', 'Light')
await sleep(500)
await clickText('a', 'Dashboard')
await sleep(600)
await shot('07-dashboard-light')

// cleanup
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  const u = data.users.find((x) => x.email === email)
  if (u) await admin.auth.admin.deleteUser(u.id)
}
await browser.close()
console.log('shots written to .artifacts/')
