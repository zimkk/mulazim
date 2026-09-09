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

### EPIC A — Cross-platform foundation  ✅ target: runs & self-updates on macOS, Linux, Windows
- [ ] A1  Release CI matrix: `macos-latest` (universal), `ubuntu-22.04`, `windows-latest`; per-OS updater artifacts + `latest.json`
- [ ] A2  Native app menu (Tauri `Menu`): App/File/Edit/View/Window/Help. Edit menu wired to `undo/redo/cut/copy/paste/selectAll` so macOS webview gets clipboard; `Cmd+,` → Settings; About item
- [ ] A3  Plugins: `single-instance`, `window-state` (remember size/pos/maximised), `autostart` (opt-in), `os` (platform detection)
- [ ] A4  Platform-aware shortcut labels (⌘ vs Ctrl) from `@tauri-apps/plugin-os` / `navigator.platform`
- [ ] A5  Custom in-app titlebar option OR keep native decorations consistently; ensure `data-tauri-drag-region` works; macOS traffic-light inset padding
- [ ] A6  `tauri.conf.json`: per-platform bundle config, category, min-OS versions; document macOS signing/notarization + Windows Authenticode as later
- [ ] A7  Verify `tauri build` on Linux still green; CI dry-run notes for mac/win

### EPIC B — Settings system  ✅ target: a real, categorized preferences panel
- [ ] B1  Split prefs: `localSettings` (zustand+persist — window/UI conveniences) vs `user_settings` (new synced table, 1 JSONB row/user, RLS) via `useSettings()` with typed schema + defaults + migration-safe merge
- [ ] B2  Settings shell: left category nav + routed panes (`/settings/:section`), search-in-settings, dirty/save affordance where needed
- [ ] B3  **Account** — display name, avatar (Supabase Storage bucket `avatars`, or initials fallback), email, change password, sign out, **Danger zone**: delete all data / delete account
- [ ] B4  **Appearance** — theme light/dark/system; accent colour (6 presets); UI density comfortable/compact; font size S/M/L; sidebar default state; first day of week; reduce motion
- [ ] B5  **General** — landing view on launch; default new-task priority; default project; date display relative/absolute; confirm-before-delete
- [ ] B6  **Notifications** — master toggle; overdue / due-soon (lead time) / stale-project reminders; daily digest time; quiet hours; per-channel (native desktop) — request OS permission inline
- [ ] B7  **Workflow** — stale thresholds (move here); recommendation-queue weights; dashboard cards: which show + order (drag)
- [ ] B8  **Keyboard** — full shortcut reference (platform-aware); note which are remappable later
- [ ] B9  **Data** — export JSON / CSV / Markdown (clients, projects, tasks, activity, time); import JSON; "download a backup" ; last-export timestamp
- [ ] B10 **Updates** — auto-check toggle; channel; current version; check-now; link to release notes
- [ ] B11 **About** — version, build, links, third-party licenses/acknowledgements
- [ ] B12 Apply density + font-size + accent as `data-*` attrs / CSS vars on `<html>`; theme tokens extended for all of it

### EPIC C — Task depth
- [ ] C1  Subtasks / checklist (`subtasks` table): add, toggle, reorder, progress bar on the task
- [ ] C2  Tags (`tags` + `task_tags`): create/colour/rename/delete; assign on task; filter by tag; tag chips
- [ ] C3  Recurring tasks: `recurrence` (none/daily/weekly/monthly/weekdays/custom-interval) + `recurrence_until`; on complete → materialise next occurrence
- [ ] C4  `start_date` (defer) distinct from `due_date`: deferred tasks hidden from Today until start
- [ ] C5  Manual ordering: `sort_order` per project + drag-and-drop reorder in task lists
- [ ] C6  Task detail view/drawer: description, checklist, tags, dates, estimate/actual, activity, notes — reachable from any list
- [ ] C7  Natural-language quick-add ("fix bug tomorrow 3pm #urgent") — lightweight parser (chrono-like) for date + priority + tag tokens

### EPIC D — Views
- [ ] D1  **Today** page — overdue + due/scheduled today across all projects; grouped; quick reschedule
- [ ] D2  **Upcoming** page — next 7 (configurable) days grouped by day; mini calendar strip
- [ ] D3  **All Tasks** page — global list; filters (status/priority/tag/project/date range/health); group-by (project/priority/due/tag); sort; saved as a Perspective
- [ ] D4  Board (kanban by status) toggle on Project detail + All Tasks; drag between columns
- [ ] D5  **Calendar** month view — tasks by due date; click a day → that day's tasks
- [ ] D6  Perspectives: save a filter+group+sort combo to the sidebar

### EPIC E — Review & planning
- [ ] E1  Project review: `review_interval_days` + `last_reviewed_at`; "Needs review" queue on Dashboard + a Review page; "Mark reviewed"
- [ ] E2  Plan-my-day: pick tasks into a per-date focus list (`daily_plans`); Today page shows the plan first
- [ ] E3  Weekly review screen: completed this week, still open, stale, upcoming deadlines, time logged
- [ ] E4  Daily digest: in-app summary card + optional notification at configured time

### EPIC F — Time tracking
- [ ] F1  Estimate (exists) + actual UI on tasks; start/stop timer; running-timer pill in the shell with elapsed
- [ ] F2  `time_entries` table (multiple sessions/task); edit/delete entries
- [ ] F3  Time report: by project / by day / this week; rolls into weekly review and project detail

### EPIC G — Notifications & background
- [ ] G1  Native notifications via `@tauri-apps/plugin-notification`; permission request in onboarding + Settings
- [ ] G2  Alert engine: on launch + focus + interval, compute overdue / due-soon / stale / needs-review; respect settings + quiet hours; dedupe (store last-fired)
- [ ] G3  Daily digest notification at configured local time
- [ ] G4  In-app notification centre: bell in shell, `notifications` table, unread badge, mark-read, "snooze"

### EPIC H — Polish & UX
- [ ] H1  Undo for destructive actions: soft-delete (`deleted_at`) on clients/projects/tasks; toast with Undo; **Trash** view with restore + purge
- [ ] H2  First-run onboarding: name, theme pick, "add sample data or start empty", create first project
- [ ] H3  Global search: ⌘K also searches task titles + descriptions + notes (not just names); recent + results sections
- [ ] H4  Bulk actions: shift/ctrl multi-select in task lists → set status/priority/tag/project/delete
- [ ] H5  Loading skeletons + empty states audit across every new screen
- [ ] H6  A11y pass: focus-visible rings, list keyboard nav, ARIA on menus/dialogs, `prefers-reduced-motion`, colour-contrast check in both themes
- [ ] H7  Branded app icon set (replace Tauri defaults) — all platform sizes
- [ ] H8  Perf: virtualised long lists, route-level code-split audit, memoisation of heavy selectors

### EPIC I — Verification (runs after each epic)
- [ ] `tsc --noEmit`, `oxlint`, `vite build`, `cargo check`, `tauri build`
- [ ] Extend `scripts/e2e.mjs` for every new table + trigger + RLS
- [ ] Extend `scripts/ui-smoke.mjs` for every new screen & flow
- [ ] Manual dark/light screenshot pass per screen

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
