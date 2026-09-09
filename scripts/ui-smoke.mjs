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
  (() => { try { return readFileSync(new URL('../.env', import.meta.url), 'utf8') } catch { console.error('This script needs a .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).'); process.exit(1) } })()
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
page.on('requestfailed', (r) => consoleErrors.push(`reqfail ${r.failure()?.errorText} ${r.url()}`))
page.on('response', async (r) => {
  if (r.status() < 400) return
  let body = ''
  try {
    body = (await r.text()).slice(0, 300)
  } catch {
    /* ignore */
  }
  const auth = r.request().headers()['authorization']
  consoleErrors.push(
    `HTTP ${r.status()} ${r.request().method()} ${r.url()}\n    auth=${auth ? auth.slice(0, 24) + '…' : 'NONE'}\n    body=${body}`,
  )
})

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
  const quick = await page.$('input[placeholder^="Add a task"]')
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
  await selects[1].select('urgent') // Status, Priority, Repeat -> [1] is Priority
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  // date inputs order: [0] Start date, [1] Due date
  await page.evaluate((v) => {
    const el = document.querySelectorAll('#task-form input[type="date"]')[1]
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set
    setter.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.blur()
  }, yesterday)
  // confirm React accepted it before saving
  await page.waitForFunction(
    (v) => document.querySelectorAll('#task-form input[type="date"]')[1]?.value === v,
    { timeout: 5000 },
    yesterday,
  )
  await clickText('button[form="task-form"]', 'Save')
  await page.waitForFunction(() => !document.querySelector('#task-form'), { timeout: 20000 })
  // due_date must round-trip: reopen and read it back. (Generous timeout — this
  // dev box's clock runs ahead of Supabase, so a request can 401 and retry with
  // backoff before the write lands.)
  await new Promise((r) => setTimeout(r, 1500))
  await clickText('button', 'First task from UI')
  await byText('h2', 'Edit task')
  await page.waitForFunction(
    (v) => document.querySelectorAll('#task-form input[type="date"]')[1]?.value === v,
    { timeout: 20000 },
    yesterday,
  )
  ok('task due_date persisted through edit', true)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('#task-form'), { timeout: 10000 })
  await shot('04-task-added')

  // --- Board view toggle ---
  await clickText('button', 'board')
  await byText('div, span', 'In progress')
  const hasColumns = await page.evaluate(
    () => ['To do', 'In progress', 'Blocked', 'Done'].every((l) => document.body.innerText.includes(l)),
  )
  ok('board view shows status columns', hasColumns)
  await clickText('button', 'list')

  // --- Time tracking: start a timer on the task, see the pill, stop it ---
  {
    const startBtn = await page.$('button[aria-label="Start timer"]')
    await startBtn.click()
    await page.waitForFunction(() => !!document.querySelector('button[aria-label="Stop timer"]'), {
      timeout: 6000,
    })
    ok('starting a timer shows the running pill', true)
    await (await page.$('button[aria-label="Stop timer"]')).click()
    await page.waitForFunction(() => !document.querySelector('button[aria-label="Stop timer"]'), {
      timeout: 6000,
    })
    ok('stopping a timer clears it', true)
  }

  // --- All tasks page: filters + natural-language quick-add + bulk ---
  await clickText('a', 'All tasks')
  await byText('h1', 'All tasks')
  ok('All tasks view renders', true)
  {
    const nl = await page.$('input[placeholder^="Add a task"]')
    await nl.type('Review analytics #metrics !high tomorrow')
    await nl.press('Enter')
    await page.waitForFunction(() => document.body.innerText.includes('Review analytics'), { timeout: 8000 })
    // the clean title (tokens stripped) is what renders
    const titleClean = await page.evaluate(
      () =>
        !document.body.innerText.includes('#metrics') &&
        !document.body.innerText.includes('!high tomorrow'),
    )
    ok('quick-add strips NL tokens from the title', titleClean)
    // tag chip appears on the row within a couple seconds
    await page
      .waitForFunction(
        () => {
          const row = [...document.querySelectorAll('div')].find((d) =>
            d.textContent?.includes('Review analytics'),
          )
          return row?.textContent?.includes('metrics')
        },
        { timeout: 8000 },
      )
      .then(() => ok('quick-add parses #tag and attaches it', true))
      .catch(() => ok('quick-add parses #tag and attaches it', false))
  }
  // bulk select + set priority
  {
    const boxes = await page.$$('input[aria-label="Select task"]')
    if (boxes.length >= 1) {
      await boxes[0].click()
      await byText('span', 'selected')
      ok('selecting a task shows the bulk bar', true)
    } else {
      ok('bulk selection checkboxes present', false, 'no checkboxes found')
    }
  }

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

  // --- Calendar ---
  await clickText('a', 'Calendar')
  await byText('h1', 'Calendar')
  const calGrid = await page.evaluate(
    () => document.querySelectorAll('.grid-cols-7 > *').length >= 35,
  )
  ok('Calendar renders a month grid', calGrid)

  // --- Today / Upcoming / Trash pages load ---
  await clickText('a', 'Today')
  await byText('h1', 'Today')
  ok('Today view renders', true)
  await byText('h2', 'Today’s plan')
  ok('Today shows the daily-plan card', true)
  await clickText('a', 'Upcoming')
  await byText('h1', 'Upcoming')
  ok('Upcoming view renders', true)
  await clickText('a', 'Trash')
  await byText('h1', 'Trash')
  ok('Trash view renders', true)
  const hasBell = await page.evaluate(() => !!document.querySelector('button[aria-label="Notifications"]'))
  ok('notification bell in the shell', hasBell)

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

  // --- Settings: categorized panel + theme + accent ---
  await clickText('a', 'Settings')
  await byText('h1', 'Settings')
  await byText('nav a, a', 'Appearance')
  ok('settings has a categorized left nav', true)
  await clickText('a', 'Appearance')
  await byText('h2', 'Appearance')

  // Theme segmented control
  await clickText('button', 'Light')
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'), { timeout: 6000 })
  ok('theme control flips <html>.dark off', true)
  await clickText('button', 'Dark')
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 6000 })
  ok('theme control flips <html>.dark on', true)

  // Accent colour writes data-accent
  const accentBtns = await page.$$('button[aria-label="violet"]')
  if (accentBtns[0]) await accentBtns[0].click()
  await page.waitForFunction(() => document.documentElement.dataset.accent === 'violet', { timeout: 6000 })
  ok('accent colour applies to <html data-accent>', true)

  // Density writes data-density
  await clickText('button', 'Compact')
  await page.waitForFunction(() => document.documentElement.dataset.density === 'compact', { timeout: 6000 })
  ok('density applies to <html data-density>', true)

  // A setting persists across reload (it is synced, not just local)
  await clickText('a', 'Workflow')
  await byText('h2', 'Dashboard cards')
  ok('settings sections render (Workflow)', true)
  await shot('06-settings')

  // --- Reload keeps the session + restores synced appearance ---
  await new Promise((r) => setTimeout(r, 900)) // let the settings persist debounce flush
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('#root *', { timeout: 15000 })
  const bouncedToLogin = await page.evaluate(() => location.hash.includes('login'))
  ok('session persists across reload', !bouncedToLogin)
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.accent === 'violet' &&
      document.documentElement.dataset.density === 'compact',
    { timeout: 8000 },
  )
  ok('synced appearance settings survive a reload', true)

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
  if (consoleErrors.length) console.error('network/console:\n  ' + consoleErrors.join('\n  '))
  await shot('99-failure')
} finally {
  await browser.close()
  process.exit(fail ? 1 : 0)
}
