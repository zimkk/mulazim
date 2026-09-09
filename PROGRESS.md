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
- [x] `plugins.updater` endpoint + pubkey placeholders
- [x] `src-tauri/src/lib.rs` minimal (plugin registration only)
- [x] Default scaffold icons in place (replace with branded set later)
- [!] `cargo check` — blocked on missing pkg-config / webkit2gtk system libs (see Phase 0)

## Phase 13 — Updates & CI/CD
- [x] `.github/workflows/release.yml` — tag-driven (`v*`), `tauri-action`, Windows matrix (mac/linux commented, ready)
- [x] Secrets wired: `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)`, `VITE_SUPABASE_URL/ANON_KEY`
- [x] `createUpdaterArtifacts` → `latest.json` generated by tauri-action
- [x] `UpdateManager` — check → available → download progress → install → relaunch, dynamic import so browser dev still works
- [x] Update-failure copy ("current version keeps working")
- [x] Release runbook in `README.md`

## Phase 14 — Polish & Performance
- [x] Lazy-loaded route bundles (`React.lazy` per page)
- [x] Skeletons on every async surface; no full-screen spinners
- [x] Empty states carry a next action
- [x] Error boundary + retry on every page
- [x] SemVer 0.1.0 in `package.json` + `tauri.conf.json`
- [ ] Keyboard shortcuts (Ctrl+K / Ctrl+N …) — deferred (architecture §47: not MVP-blocking)
- [ ] Connection-state / offline indicator — deferred

## Phase 15 — Verification
- [x] `npm run typecheck` clean
- [x] `npm run lint` (oxlint) — no errors, 4 style warnings
- [x] `npm run build` (frontend) succeeds
- [ ] `npm run tauri dev` smoke test — blocked on Linux system libs
- [ ] Apply migrations to a real Supabase project; sign up + full CRUD round-trip
- [ ] Verify dashboard health/staleness/recommendations against seeded data
- [ ] Dry-run the release workflow on a tag

---

## Remaining before this is "done"
1. `sudo apt install` the Tauri Linux deps (one line in README), then `npm run tauri dev`.
2. Create a Supabase project, set `.env`, apply `supabase/migrations/*` in order.
3. Replace updater `pubkey` + `endpoints` placeholders and add GitHub secrets (README release section).
4. Optional polish: keyboard shortcuts, offline indicator, branded icons, dedicated "in-progress" dashboard card.

## Notes / deviations from the spec
- Data hooks live in `src/lib/api/<entity>.ts` (queries + mutations together) rather than split `queries/` + `mutations/` dirs — architecture §7 explicitly allows the structure to evolve.
- Router uses hash history (`createHashRouter`) — safest under the Tauri asset protocol.
- Tailwind v4 CSS-first config (no `tailwind.config.js`).
- Project health is derived on the client, never stored (§15).
