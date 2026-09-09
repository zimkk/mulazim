# Build Progress — Personal Project Tracker

Living checklist for implementing the app described in `ARCHITECTURE.md`.
Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Environment & Tooling
- [x] Install Node.js LTS (v24, via nvm)
- [x] Install Rust toolchain (1.98, via rustup)
- [!] Install Tauri Linux system deps (webkit2gtk-4.1, libgtk-3, librsvg2, patchelf, pkg-config, build-essential) — **needs `sudo`; run the apt line in README**
- [ ] `git init` + commit
- [x] Toolchain confirmed on PATH (nvm/rustup wrote shell profiles)

## Phase 1 — Project Scaffold
- [x] Vite + React 19 + TypeScript app at repo root
- [x] `tsconfig.app.json` with `strict: true` (+ noUncheckedIndexedAccess, path alias `@/*`)
- [x] Tailwind CSS v4 (`@tailwindcss/vite`) + light/dark theme tokens in `src/index.css`
- [x] Tauri 2 init → `src-tauri/`
- [x] Deps installed: supabase-js, tanstack/react-query, zustand, lucide-react, react-router-dom, date-fns, clsx
- [x] Tauri plugins: updater, process, notification, dialog, opener (JS + Rust + capabilities)
- [x] Prettier config; oxlint from scaffold (lint clean — 4 style warnings only)
- [x] Directory structure per architecture
- [x] `.env.example`
- [x] `esbuild` devDep added (Vite 8 / rolldown needs it for the prod transpile)

## Phase 2 — Supabase Backend
- [x] `supabase/config.toml`
- [x] `0001_initial_schema.sql` — enums + profiles, clients, projects, tasks, activity_logs
- [x] `0002_rls_policies.sql` — RLS on every table, `auth.uid() = user_id`
- [x] `0003_indexes.sql` — FK + query-column indexes
- [x] `0004_triggers.sql` — handle_new_user, set_updated_at, bump_project_activity
- [x] `supabase/seed.sql`
- [x] Backend setup documented in `README.md`

## Phase 3 — Core Frontend Infrastructure
- [x] `src/lib/supabase.ts` client (anon key, persisted session)
- [x] `src/types/database.ts` (hand-written row/enum + composed types)
- [x] `src/lib/queryClient.ts` + `QueryClientProvider` in `main.tsx`
- [x] `src/stores/authStore.ts` (session bootstrap + onAuthStateChange)
- [x] `src/stores/uiStore.ts` (sidebar, theme, stale thresholds, last project — persisted)
- [x] Hash router + `RequireAuth` protected wrapper + lazy routes
- [x] App shell: sidebar nav + content area + Suspense/ErrorBoundary
- [x] UI primitives: Button, Field (Input/Textarea/Select), Card, Badge, Modal, States (Skeleton/Empty/Error/Spinner)
- [x] `ErrorBoundary` + toast system (`Toast.tsx`)

## Phase 4 — Authentication
- [x] `pages/Login.tsx` — email/password sign in + sign up, error surface
- [x] Session bootstrap on app start + auth-state subscription
- [x] Sign out (Settings)
- [x] Redirect logic (authed → Dashboard, none → Login, unconfigured → Setup)

## Phase 5 — Data Layer & Domain Logic
- [x] `lib/api/clients.ts` `projects.ts` `tasks.ts` `activity.ts` `dashboard.ts` — query + mutation hooks w/ invalidation
- [x] `lib/utils/health.ts` — derived project health + reasons
- [x] `lib/utils/staleness.ts` — configurable thresholds, respects `on_hold`
- [x] `lib/utils/recommendations.ts` — deterministic work-queue score
- [x] `lib/utils/activity.ts` — best-effort activity writer (wired into project/task mutations)
- [x] `lib/utils/dates.ts` — due/overdue/relative-time/greeting helpers

## Phase 6 — Clients Module
- [x] `pages/Clients.tsx` — list with project/task counts + last activity
- [x] `ClientFormModal` create/edit
- [x] `pages/ClientDetail.tsx` — info, notes, related projects, add project
- [x] Archive client
- [x] Empty / loading / error states

## Phase 7 — Projects Module
- [x] `pages/Projects.tsx` — search + filter chips (all/active/attention/stale/overdue/completed/on_hold)
- [x] `ProjectFormModal` (type, status, priority, deadline, client)
- [x] `pages/ProjectDetail.tsx` — meta + health + reasons, Tasks / Activity / Notes sections
- [x] `ProjectRow` with `HealthBadge`
- [x] Archive project
- [x] Empty / loading / error states

## Phase 8 — Tasks Module
- [x] `TaskRow` (inline complete toggle + status select)
- [x] `QuickAddTask` (inline; project picker when used from Dashboard)
- [x] `TaskFormModal` (title, status, priority, due date, estimate, description, delete)
- [x] Complete / reopen / status transition → sets `completed_at`, writes activity
- [x] Completed-tasks disclosure on project detail

## Phase 9 — Dashboard
- [x] Time-of-day greeting
- [x] Quick task capture
- [x] Recommended focus (scored queue with factor chips)
- [x] Overdue / Due soon / High & urgent task cards
- [x] Stale projects / Needs attention project cards
- [x] Recent activity (limited)
- [ ] "In-progress work" as its own card (currently folded into recommendations) — nice-to-have

## Phase 10 — Activity Module
- [x] Auto-logging in project + task create/update/complete/reopen mutations
- [x] `ActivityTimeline` component (icons per type)
- [x] Manual notes → `note_added` activity (project detail)
- [x] `pages/ActivityPage.tsx` global feed + load-more; project-scoped feed on detail

## Phase 11 — Settings
- [x] `pages/Settings.tsx`
- [x] Account (email, sign out)
- [x] Theme toggle (system/light/dark), persisted + applied to `<html>`
- [x] Stale-threshold editor (local)
- [x] Updates section (version + UpdateManager)

## Phase 12 — Desktop / Tauri
- [x] `tauri.conf.json` — identifier `com.gridmanager.app`, 1280×820 min 960×640, CSP allowing Supabase + GitHub
- [x] `bundle.targets` nsis/msi/app/dmg/deb/appimage + `createUpdaterArtifacts`
- [x] `capabilities/desktop.json` — updater/process/notification/dialog/opener permissions
- [x] `plugins.updater` — real pubkey wired, endpoint = `github.com/zimkk/mulazim/releases/latest/download/latest.json`
- [x] `src-tauri/src/lib.rs` minimal (plugin registration only)
- [x] Default scaffold icons in place (replace with branded set later)
- [x] `cargo check` clean; `npm run tauri build` produces an optimized release binary
  (`src-tauri/target/release/app`, ~2m) — the full webkit + updater/notification/
  dialog/opener stack compiles and links on Linux. Windows installer still comes
  from the CI job.

## Phase 13 — Updates & CI/CD
- [x] `.github/workflows/release.yml` — tag-driven (`v*`), `tauri-action`, Windows runner, Node 22 (mac/linux commented, ready)
- [x] Updater signing keypair generated → `.secrets/tauri-updater.key(.pub)` (git-ignored, no password); pubkey in `tauri.conf.json`
- [x] `createUpdaterArtifacts` → `latest.json` generated by tauri-action
- [x] `UpdateManager` — check → available → download progress → install → relaunch, dynamic import so browser dev still works
- [x] Update-failure copy ("current version keeps working")
- [x] Full release runbook in `RELEASE.md` (secret names + ready values)
- [!] GitHub Actions secrets not set — needs a GitHub PAT / `gh` (only SSH auth available here). Values are listed in `RELEASE.md`.
- [ ] Tag a `v0.1.0` and confirm the Windows build + Release publish (after secrets are set)

## Phase 14 — Polish & Performance
- [x] Lazy-loaded route bundles (`React.lazy` per page)
- [x] Skeletons on every async surface; no full-screen spinners
- [x] Empty states carry a next action
- [x] Error boundary + retry on every page
- [x] SemVer 0.1.0 in `package.json` + `tauri.conf.json`
- [x] Keyboard shortcuts (§47): `⌘/Ctrl+K` command palette (jump to screen / project / client),
  `⌘/Ctrl+N` new task, `⌘/Ctrl+⇧+P` new project, `⌘/Ctrl+/` shortcut list, `Esc` closes
- [x] Command palette doubles as global search over projects + clients (§46)
- [x] Connection-state banner — shows when `navigator.onLine` is false, with a Retry that refetches
- [x] Dashboard "In progress" card (§17)

## Phase 15 — Verification
- [x] `npm run typecheck` clean
- [x] `npm run lint` (oxlint) — no errors, 4 style warnings
- [x] `npm run build` (frontend) succeeds
- [ ] `npm run tauri dev` smoke test — blocked on Linux system libs
- [x] Migrations applied to the live Supabase project `mulazim` (ztmedzpbvsabzfjpyzll) via `supabase db push`; all 6 migrations, all 5 tables reachable
- [x] `npm run test:e2e` — 19 checks vs live Supabase: auth, profile trigger, CRUD, last_activity_at + updated_at triggers, joined reads, RLS read+write isolation, cascade delete
- [x] `npm run test:ui` — 18 checks, headless Chromium vs the built app + live backend: sign up → dashboard → project → task → due-date edit → Overdue/queue surfacing → clients → activity → theme toggle → session persists on reload → zero console errors
- [x] Dashboard health / overdue / recommendation queue verified against real data (screenshots in `.artifacts/`)
- [ ] Tag `v0.1.0` and confirm the Windows Release build (after CI secrets)

## Supabase project
- Project: `mulazim` / ref `ztmedzpbvsabzfjpyzll` / region ap-southeast-1 / Postgres 17
- `.env` (gitignored) holds `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
  `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` for CLI/Management use.
- CLI is linked (`supabase link`) and logged in (`~/.supabase`).
- Never add the `service_role` secret here or to the client bundle.

---

## Remaining before this is "done"
Everything that can be done without a GitHub API token or `sudo` on this machine is done and verified.

1. **CI secrets** — set the 4 GitHub Actions secrets from `RELEASE.md`, then push a `v0.1.0`
   tag. That produces the signed Windows installer + `latest.json`. (Blocked here: only
   SSH auth is available, no PAT / `gh`.)
2. **Local desktop run (optional)** — `sudo apt install libwebkit2gtk-4.1-dev
   libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf pkg-config
   build-essential`, then `npm run tauri dev`. Not needed for the Windows deliverable.
3. **Optional polish** — keyboard shortcuts, offline indicator, branded app icons,
   a dedicated "in-progress" dashboard card.

## Notes / deviations from the spec
- Data hooks live in `src/lib/api/<entity>.ts` (queries + mutations together) rather than split `queries/` + `mutations/` dirs — architecture §7 explicitly allows the structure to evolve.
- Router uses hash history (`createHashRouter`) — safest under the Tauri asset protocol.
- Tailwind v4 CSS-first config (no `tailwind.config.js`).
- Project health is derived on the client, never stored (§15).
