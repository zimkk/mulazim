# Grid Manager

A personal, cross-platform desktop project & task tracker. One place to see every
active piece of work — freelance clients, company tasks, personal projects — so
nothing gets neglected.

Built with **Tauri 2 · Rust · React 19 · TypeScript · Tailwind · Zustand ·
TanStack Query · Supabase (Auth + Postgres + RLS)**. Ships signed, self-updating
installers for macOS, Linux and Windows via GitHub Actions.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design.

## Features

- Dashboard with a deterministic "what needs attention now" queue
- Clients, projects (type / status / priority / deadline / health / review
  cadence), tasks (subtasks, tags, recurrence, start vs. due date, estimates)
- Views: Today, Upcoming, Calendar, All Tasks (filters + grouping + bulk edit),
  per-project Kanban board
- Plan-my-day, weekly review, project staleness detection
- Time tracking (start/stop timer, per-project report)
- Native + in-app notifications with quiet hours and a daily digest
- Command palette (⌘K), fully rebindable shortcuts
- Themes (light/dark/system), 6 accent colours, density & font-size controls
- Soft-delete + Trash, JSON/CSV/Markdown export, JSON import
- Self-updating; multi-device via a single cloud account

## Prerequisites

- Node.js 20+ and npm
- Rust (stable) — <https://rustup.rs>
- A [Supabase](https://supabase.com) project (free tier is fine)
- Linux only, for local desktop builds:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf build-essential
  ```

## Setup

```bash
npm install
cp .env.example .env      # fill in your Supabase URL + anon key (public values)
```

Apply the schema to your Supabase project — either run
`supabase link --project-ref <your-ref> && supabase db push`, or paste
`supabase/migrations/0001…0011` into the SQL editor in order. Optionally seed
sample rows with `supabase/seed.sql` (set the UID at the top first).

## Develop

```bash
npm run dev          # frontend in a browser (Supabase works; no native APIs)
npm run tauri dev    # full desktop app
npm run tauri build  # optimized binary + installer for the current OS
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e   # API round-trip against the Supabase project in .env
npm run test:ui    # headless-Chromium walk-through of the built app
```

`test:ui` needs a server running (`npm run build && npm run preview -- --port
4173`) and Chrome/Chromium at `/usr/bin/chromium` (override with `CHROME=`).

## Releasing

Tag-driven. Generate an updater key once
(`npm run tauri signer generate -- -w .secrets/updater.key`), put the public half
in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`, add the GitHub Actions
secrets, then `git tag vX.Y.Z && git push origin vX.Y.Z`. See
[`RELEASE.md`](./RELEASE.md).

## Layout

```
src/
  components/   ui primitives, layout, feature components
  pages/        route screens
  lib/api/      TanStack Query hooks (queries + mutations) per entity
  lib/utils/    health, staleness, recommendations, dates, recurrence, …
  stores/       Zustand (auth, ui)
src-tauri/            Rust / Tauri shell, config, capabilities, native menu
supabase/migrations/  versioned schema
.github/workflows/    3-OS release pipeline
```

## License

MIT — see [`LICENSE`](./LICENSE).
