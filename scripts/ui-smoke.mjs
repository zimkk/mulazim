/**
 * Headless-browser smoke test of the real UI against the live Supabase project.
 * Assumes a server is running at BASE (default http://localhost:4173).
 *
 *   npm run build && npm run preview -- --port 4173 &
 *   node scripts/ui-smoke.mjs
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE || 'http://localhost:4173'
const CHROME = process.env.CHROME || '/usr/bin/chromium'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

let pass = 0,
  fail = 0
const ok = (n, c, d = '') => (c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`)))
const email = `gm-ui-${Date.now()}@example.com`
const PW = 'ui-Passw0rd!'

const ARTIFACTS = fileURLToPath(new URL('../.artifacts/', import.meta.url))
mkdirSync(ARTIFACTS, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1400,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })

const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))

const shot = (name) => page.screenshot({ path: `${ARTIFACTS}${name}.png` })
const byText = async (sel, text) => {
  await page.waitForFunction(
    (s, t) => [...document.querySelectorAll(s)].some((e) => e.textContent?.includes(t)),
    { timeout: 15000 },
    sel,
    text,
  )
}
// Set a value on a React-controlled input (bypasses React's value-setter shim).
const setNativeValue = (selector, value) =>
  page.$eval(
    selector,
    (el, val) => {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    value,
  )
const clickText = async (sel, text) => {
  const h = await page.evaluateHandle(
    (s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent?.trim() === t || e.textContent?.includes(t)),
    sel,
    text,
  )
  const el = h.asElement()
  if (!el) throw new Error(`no ${sel} with text "${text}"`)
  await el.click()
}

try {
  console.log(`\nUI smoke against ${BASE}\n`)

  await page.goto(BASE, { waitUntil: 'networkidle2' })
  await page.waitForSelector('#root *', { timeout: 15000 })
  await byText('h1, button, label', 'Sign in')
  ok('login screen renders', true)
  await shot('01-login')

  // Switch to sign-up
  await clickText('button', "Don't have an account? Sign up")
  await byText('h1', 'Create your account')
  ok('sign-up form shown', true)

  await page.type('input[type="email"]', email)
  await page.type('input[type="password"]', PW)
  const nameInput = await page.$('input[autocomplete="name"]')
  if (nameInput) await nameInput.type('UI Tester')
  await Promise.all([clickText('button', 'Sign up')])

  // Land on dashboard
  await byText('h1', 'Good ')
  ok('authenticated → dashboard greeting', true)
  await shot('02-dashboard')

  // Navigate to Projects and create one
  await clickText('a', 'Projects')
  await byText('h1', 'Projects')
  await clickText('button', 'New project')
  await byText('h2', 'New project')
  await page.type('#project-form input', `UI Project ${Date.now()}`)
  await clickText('button[form="project-form"]', 'Create')
  await page.waitForFunction(() => !document.querySelector('#project-form'), { timeout: 10000 })
  await byText('a, span', 'UI Project')
  ok('created project appears in list', true)
  await shot('03-project-created')

  // Open it, add a task via quick-add
  await clickText('a', 'UI Project')
  await byText('h1', 'UI Project')
  ok('project detail opens', true)
  const quick = await page.$('input[placeholder="Add a task and press Enter"]')
  await quick.type('First task from UI')
  await quick.press('Enter')
  await byText('button, span', 'First task from UI')
  // The title must be actually visible, not collapsed to 0px by a CSS conflict.
  const titleWidth = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((b) => b.textContent === 'First task from UI')
    return el ? el.getBoundingClientRect().width : 0
  })
  ok('quick-add task shows on project detail', true)
  ok('task title is visibly rendered (not width-collapsed)', titleWidth > 80, `width=${titleWidth}px`)

  // Edit it: make it urgent + due yesterday, so it must land in Overdue + the queue.
  await clickText('button', 'First task from UI')
  await byText('h2', 'Edit task')
  const selects = await page.$$('#task-form select')
  await selects[1].select('urgent') // Priority is the 2nd select (Status, Priority, ...)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  await setNativeValue('#task-form input[type="date"]', yesterday)
  await clickText('button[form="task-form"]', 'Save')
  await page.waitForFunction(() => !document.querySelector('#task-form'), { timeout: 10000 })
  // due_date must round-trip: reopen and read the date input back.
  await clickText('button', 'First task from UI')
  await byText('h2', 'Edit task')
  const savedDate = await page.$eval('#task-form input[type="date"]', (el) => el.value)
  ok('task due_date persisted through edit', savedDate === yesterday, `got "${savedDate}"`)
  await clickText('button[form="task-form"]', 'Cancel').catch(() => clickText('button', 'Cancel'))
  await page.waitForFunction(() => !document.querySelector('#task-form'), { timeout: 10000 })
  await shot('04-task-added')

  // Back to the dashboard — it should now show real sections, not a blank grid.
  await clickText('a', 'Dashboard')
  await byText('h1', 'Good ')
  await byText('h2', 'Recommended focus')
  await byText('h2', 'Overdue')
  ok('dashboard renders its section cards', true)

  // The urgent, past-due task must appear under the Overdue card and the queue.
  // Card structure: div.Card > div.CardHeader > div > h2  -> walk up 3 to the Card.
  const cardHasTask = (heading) =>
    page.evaluate((h) => {
      const head = [...document.querySelectorAll('h2')].find((e) => e.textContent?.includes(h))
      const card = head?.parentElement?.parentElement?.parentElement
      return !!card && card.innerText.includes('First task from UI')
    }, heading)
  await page.waitForFunction(
    () => {
      const head = [...document.querySelectorAll('h2')].find((e) => e.textContent?.includes('Overdue'))
      const card = head?.parentElement?.parentElement?.parentElement
      return !!card && card.innerText.includes('First task from UI')
    },
    { timeout: 10000 },
  )
  ok('overdue task appears in the Overdue card', await cardHasTask('Overdue'))
  ok('overdue task appears in Recommended focus', await cardHasTask('Recommended focus'))
  const overdueCopy = await page.evaluate(() => document.body.innerText.match(/Overdue by \d+d/)?.[0] || '')
  ok('overdue shows a day count', /Overdue by \d+d/.test(overdueCopy), overdueCopy)
  await shot('05-dashboard-populated')

  // --- Clients ---
  await clickText('a', 'Clients')
  await byText('h1', 'Clients')
  await clickText('button', 'New client')
  await byText('h2', 'New client')
  await page.type('#client-form input', 'Northwind Ltd')
  await clickText('button[form="client-form"]', 'Create')
  await page.waitForFunction(() => !document.querySelector('#client-form'), { timeout: 10000 })
  await byText('a, span', 'Northwind Ltd')
  ok('client created and listed', true)

  // --- Activity page ---
  await clickText('a', 'Activity')
  await byText('h1', 'Activity')
  await page.waitForFunction(() => document.body.innerText.includes('Created project'), { timeout: 10000 })
  ok('activity page shows logged events', true)

  // --- Command palette (Ctrl+K) ---
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyK')
  await page.keyboard.up('Control')
  await page.waitForSelector('input[placeholder="Jump to… or type a command"]', { timeout: 5000 })
  ok('Ctrl+K opens the command palette', true)
  await page.type('input[placeholder="Jump to… or type a command"]', 'Northwind')
  await page.waitForFunction(
    () => document.querySelector('input[placeholder="Jump to… or type a command"]') &&
      [...document.querySelectorAll('li button')].some((b) => b.textContent?.includes('Northwind')),
    { timeout: 5000 },
  )
  await page.keyboard.press('Enter')
  await byText('h1', 'Northwind Ltd')
  ok('palette navigates to a matched client', true)

  // --- Settings: theme toggle ---
  await clickText('a', 'Settings')
  await byText('h1', 'Settings')
  const darkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  await page.select('select', 'light')
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'), { timeout: 5000 })
  const lightNow = await page.evaluate(() => !document.documentElement.classList.contains('dark'))
  ok('theme toggle switches <html> class', darkBefore && lightNow)
  await page.select('select', 'dark')
  await shot('06-settings')

  // --- Reload keeps the session (persisted auth) ---
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('#root *', { timeout: 15000 })
  await byText('h1', 'Settings') // hash route survives; still authenticated (not bounced to /login)
  const bouncedToLogin = await page.evaluate(() => location.hash.includes('login'))
  ok('session persists across reload', !bouncedToLogin)

  ok('no console/page errors during flow', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

  // Cleanup the auth user (best effort)
  if (SERVICE) {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(env.VITE_SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
    const { data } = await admin.auth.admin.listUsers()
    const u = data?.users?.find((x) => x.email === email)
    if (u) await admin.auth.admin.deleteUser(u.id) // cascades all rows
    ok('UI test user + data cleaned up', !!u)
  } else {
    console.log(`  (left UI test user ${email})`)
  }

  console.log(`\n${pass} passed, ${fail} failed\n`)
} catch (e) {
  fail++
  console.error('\nFATAL', e.message)
  await shot('99-failure')
} finally {
  await browser.close()
  process.exit(fail ? 1 : 0)
}
