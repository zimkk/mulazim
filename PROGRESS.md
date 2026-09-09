# Grid Manager — Build Plan & Progress

Living plan. `ARCHITECTURE.md` is the north star: a **personal, cross-platform,
cloud-first project & task command center** — fast, minimal, keyboard-first.
Not a Jira/Linear/team-PM clone.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## PART 1 — MVP (shipped & verified)

All 15 original phases are done. Highlights:

- Tauri 2 + React 19 + TS (strict) + Tailwind v4 + Zustand + TanStack Query.
- Auth (email/password, session persistence), Clients, Projects (type/status/
  priority/deadline/health), Tasks (status/priority/due/estimate), Dashboard
  (recommendation queue, overdue, due-soon, high-priority, in-progress, stale,
  needs-attention, recent activity), Activity feed, Settings.
- Derived project health + configurable staleness + deterministic work-queue score.
- Command palette (⌘K), hotkeys (⌘N / ⌘⇧P / ⌘/), offline banner, profile name.
- Supabase: 6 migrations on the live `mulazim` project, RLS on every table,
  triggers (profile bootstrap, updated_at, last_activity_at) — all `SECURITY DEFINER`.
- Verified: `tsc` clean, `oxlint` clean, `vite build`, `cargo check`,
  `npm run tauri build` (→ `app` + `.deb`), `npm run test:e2e` (19), `npm run
  test:ui` (20, headless Chromium vs live backend).
- Repo: `github.com/zimkk/mulazim`. CI workflow written; first tagged release
  pending GitHub Actions secrets.

---

## PART 2 — Roadmap to a "complete" personal productivity app

Researched against **Things 3, Todoist, TickTick, Linear, OmniFocus,
Superproductivity, Sunsama/Akiflow**. Feature notes at the bottom. We adopt the
personal-productivity depth (subtasks, tags, recurring, today/upcoming, review,
time tracking, notifications, real settings) and deliberately skip team/enterprise
features (assignees, comments@mentions, sprints, permissions, dependencies graphs).

### EPIC A — Cross-platform foundation  ✅ DONE
- [x] A1  Release CI matrix: macOS-universal + ubuntu-22.04 + windows-latest; per-OS updater artifacts
- [x] A2  Native app menu (Rust): App/File/Edit/View/Window/Help; Edit menu gives macOS webview clipboard+undo; ⌘, → Settings; menu clicks bridged to React (useMenuBridge)
- [x] A3  Plugins: single-instance (focuses running window), window-state, autostart (opt-in), os, fs
- [x] A4  Platform-aware ⌘/Ctrl labels (src/lib/tauri.ts)
- [x] A6  tauri.conf.json: bundle category, macOS min-version, deb depends
- [x] A7  `cargo check` + `npm run tauri build` green on Linux; RELEASE.md documents mac notarization / Windows Authenticode as later
- [~] A5  Kept native window decorations (deliberate; works on all three OSes). macOS traffic-light inset polish still open.

### EPIC B — Settings system  ✅ DONE
- [x] B1  user_settings synced JSONB table + useSettings/useUpdateSettings + <SettingsPersister/> (debounced) + deep-merge defaults
- [x] B2  Settings shell: left category nav + routed panes (/settings/:section)
- [x] B3  Account — email, display name, change password, sign out, danger-zone "delete all data"
- [x] B4  Appearance — theme, 6 accent presets, density, font size, reduce motion, first day of week
- [x] B5  General — landing view, default task priority, default project, date style, confirm-before-delete, upcoming range
- [x] B6  Notifications — master + per-category toggles, due-soon lead days, daily digest time, quiet hours, OS permission request
- [x] B7  Workflow — stale thresholds + dashboard cards show/hide + reorder
- [x] B8  Keyboard — shortcut reference
- [x] B9  Data — export JSON / CSV / Markdown via native save dialog
- [x] B10 Updates & startup — autostart, start-minimised, UpdateManager
- [x] B11 About — version + blurb
- [x] B12 density/font-size/accent applied via data-* on <html>; boot cache prevents FOUC
- [x] B3b avatar upload (public `avatars` bucket, own-folder RLS, top-bar avatar/initials)
- [ ] B9b JSON import · settings-search — deferred

### EPIC C — Task depth  ✅ DONE (C7 deferred)
- [x] C1  Subtasks/checklist editor in the task modal (add/toggle/delete + progress badge)
- [x] C2  Tags: create/assign inline, chips on rows
- [x] C3  Recurrence (daily/weekdays/weekly/biweekly/monthly + until) → next occurrence on complete
- [x] C4  start_date (defer) separate from due_date; Today respects it
- [x] C5  sort_order column + useReorderTasks (board drag uses status; list drag-reorder deferred)
- [x] C6  Task modal is the detail surface (dates, estimate/actual, checklist, tags, recurrence, description)
- [x] C7  Natural-language quick-add: `#tag`, `!high`/`p1`, and date phrases parsed from the title

### EPIC D — Views  ✅ mostly done
- [x] D1  Today page (overdue / due today / worth-a-look) + "time this week"
- [x] D2  Upcoming page (next N days grouped, + Later)
- [x] D4  Board (kanban by status) toggle on project detail, native drag between columns
- [x] Command palette also searches task titles (part of D3/H3)
- [x] D3  All Tasks page — search + status/priority/project/tag/date filters, group-by, sort, bulk multi-select
- [x] D5  Calendar month view (tasks by due date, day panel, first-day-of-week aware)
- [x] D6  Saved perspectives (named filter combos in user_settings)

### EPIC E — Review & planning  ✅ mostly done
- [x] E1  Project review interval + last_reviewed_at + "Mark reviewed" + "Needs review" dashboard card + pin
- [x] E3  Weekly Review page: done this week, time logged, overdue, next 2 weeks, projects to check
- [x] E4  Daily digest notification (in engine)
- [x] E2  Plan-my-day — `daily_plans` table; "Today's plan" card with add/remove + Auto-fill

### EPIC F — Time tracking  ✅ DONE
- [x] F1  Estimate + tracked minutes; start/stop timer; TimerPill in top bar; play/stop on every task row
- [x] F2  time_entries table (multiple sessions/task); stop rolls minutes into task.actual_minutes
- [x] F3  Time report by project (Today page + Weekly Review)

### EPIC G — Notifications & background  ✅ DONE
- [x] G1  Native notifications (Tauri plugin / Notification API); permission request in Settings + engine
- [x] G2  Alert engine: launch + focus + 5-min interval; overdue / due-soon / stale / needs-review; quiet hours; dedupe vs unread
- [x] G3  Daily digest at configured time (once/day)
- [x] G4  In-app notification centre: bell + dropdown + unread badge + mark-read + clear (notifications table)

### EPIC H — Polish & UX
- [x] H1  Soft delete (deleted_at) on clients/projects/tasks; Trash page (restore + purge); confirm-before-delete
- [x] H2  First-run onboarding card (name, create first project, sample data)
- [x] H3  Global search in ⌘K (task titles + projects + clients + nav + actions)
- [x] H6  focus-visible ring, aria-labels on icon buttons, prefers-reduced-motion + reduce-motion setting
- [x] H7  Branded icon set (grid mark) via `tauri icon`; matching favicon + Logo component
- [x] H4  Multi-select bulk actions on the All Tasks page (set status/priority, move to trash)
- [x] H5  skeletons + empty states on every screen (Trash, Today, Upcoming, All Tasks, Calendar, Review)
- [x] Rebindable keyboard shortcuts (settings.keybindings + record-keys UI)
- [x] JSON import (round-trips a JSON export, links preserved)
- [x] List drag-reorder for project tasks; board status-drag
- [x] Settings search over the section nav
- [ ] H8  list virtualisation — deliberately skipped (personal-scale data; premature)
- [ ] A5b macOS traffic-light inset polish — skipped (native decorations are complete on all 3 OSes)

### EPIC I — Verification (per epic)
- [x] tsc, oxlint (0 errors), vite build, cargo check, tauri build — all green after every epic
- [x] scripts/e2e.mjs — 19 checks (auth, triggers, RLS, cascade)
- [x] scripts/ui-smoke.mjs — 39 checks (every screen + flow: settings, board, timer, palette, trash, calendar, plan, NL quick-add, bulk)
- [x] dark/light + accent screenshot pass (`scripts/shots.mjs` → `.artifacts/`)

### Release
- [x] release.yml — mac/linux/windows matrix, tag-driven, signed updater artifacts
- [~] GitHub Actions secrets — 2 of 4 set (`VITE_SUPABASE_URL`,
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`); the two key-material secrets must be set
  by the user (the classifier blocks pushing key values). Commands in `RELEASE.md`.
- [ ] tag `v0.1.0` → first signed release for all three OSes


---

## Execution order
A → B → C → D → G → E → F → H, committing per phase with the verification gate.
(Notifications G is pulled forward because Settings B6 configures it.)

---

## Research notes — what comparable apps do that we're adopting

| Source | Ideas taken |
|---|---|
| **Things 3** | Areas→Projects→Tasks→Checklist; Today/Upcoming/Anytime/Someday; start-date vs deadline; headings in projects; global quick-entry; keyboard-first |
| **Todoist** | Natural-language dates; P1–P4 priorities; labels; saved filters; recurring; Today/Upcoming; templates; productivity stats |
| **TickTick** | Built-in calendar view; Pomodoro/timer; smart lists; Eisenhower matrix (as an optional grouping); multiple themes |
| **Linear** | ⌘K everywhere; every action has a shortcut; peek/detail drawer; bulk edit; per-item activity history; theme + accent colours; fast, dense UI |
| **OmniFocus** | Per-project **review interval** + review mode; Perspectives (saved views); defer dates; Forecast (calendar+due) |
| **Superproductivity** | Per-task time tracking (estimate vs actual, start/stop), worklog/metrics, end-of-day summary, break reminders, deep categorized config |
| **Sunsama / Akiflow** | Daily planning ritual (pull tasks into today), time-boxing, daily/weekly review, focus mode |

**Deliberately NOT doing:** assignees / multi-user, comment threads with mentions,
sprints/cycles, dependency graphs, roles & permissions, custom fields, automations
engine, mobile app. (`ARCHITECTURE.md` §56 + "intentionally simple".)
