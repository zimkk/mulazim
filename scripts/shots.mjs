/** Visual capture of key screens. node scripts/shots.mjs */
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
const byText = (sel, text) =>
  page.waitForFunction(
    (s, t) => [...document.querySelectorAll(s)].some((e) => e.textContent?.includes(t)),
    { timeout: 15000 },
    sel,
    text,
  )
const clickText = async (sel, text) => {
  await byText(sel, text)
  const h = await page.evaluateHandle(
    (s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent?.includes(t)),
    sel,
    text,
  )
  await h.asElement().click()
}

await page.goto(BASE, { waitUntil: 'networkidle2' })
await clickText('button', "Don't have an account? Sign up")
await byText('h1', 'Create your account')
const email = `gm-shots-${Date.now()}@example.com`
await page.type('input[type="email"]', email)
await page.type('input[type="password"]', 'Passw0rd!shots')
await clickText('button', 'Sign up')
await byText('h1', 'Good ')
await sleep(1200)
await shot('01-onboarding')

// seed via onboarding
await clickText('button', 'Add sample data')
await sleep(2500)
await shot('02-dashboard')

await clickText('a', 'Today')
await byText('h1', 'Today')
await sleep(1200)
await shot('03-today')

await clickText('a', 'Projects')
await byText('h1', 'Projects')
await sleep(800)
await clickText('a', 'Acme Website')
await byText('h1', 'Acme Website')
await sleep(1000)
await shot('04-project-detail')
await clickText('button', 'board')
await sleep(900)
await shot('05-board')

await clickText('a', 'Review')
await byText('h1', 'Weekly review')
await sleep(1200)
await shot('06-review')

await clickText('a', 'Settings')
await byText('h1', 'Settings')
await clickText('a', 'Appearance')
await byText('h2', 'Appearance')
await sleep(500)
await shot('07-settings-appearance')

// switch to light + violet
await clickText('button', 'Light')
await sleep(400)
const violet = await page.$('button[aria-label="violet"]')
if (violet) await violet.click()
await sleep(500)
await clickText('a', 'Dashboard')
await byText('h1', 'Good ')
await sleep(1200)
await shot('08-dashboard-light-violet')

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
console.log('shots written')
