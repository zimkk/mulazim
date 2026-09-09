# Grid Manager

A personal, cloud-first desktop project & task tracker. One place to see every
active piece of work — freelance clients, company tasks, personal projects — so
nothing gets neglected. Built with Tauri 2 + React + Supabase.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full spec and
[`PROGRESS.md`](./PROGRESS.md) for build status.

## Stack

Tauri 2 · Rust · React 19 · TypeScript · Tailwind v4 · Zustand · TanStack Query ·
Supabase (Auth + Postgres + RLS) · GitHub Actions · Tauri Updater.

## Prerequisites

- Node.js 20+ and npm
- Rust (stable) — <https://rustup.rs>
- Linux only, for local desktop builds:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential
  ```
- A [Supabase](https://supabase.com) project

## Setup

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
```

### Database

Apply the migrations in `supabase/migrations/` (in order) to your Supabase
project. Either:

- **Supabase CLI:** `supabase link --project-ref <ref>` then `supabase db push`
- **SQL editor:** paste each file from `0001` → `0004` and run them

Optionally seed sample data: edit the UID at the top of `supabase/seed.sql` to
your auth user id, then run it against the database.

## Develop

```bash
npm run dev          # frontend only, in a browser (Supabase works; no native APIs)
npm run tauri dev    # full desktop app
```

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e   # API round-trip vs the live Supabase project (reads .env)
npm run test:ui    # headless-Chromium walk-through of the built app
```

`test:ui` needs a server running (`npm run build && npm run preview -- --port 4173`)
and Chrome/Chromium at `/usr/bin/chromium` (override with `CHROME=`). Set
`SUPABASE_SERVICE_ROLE_KEY` in the env to auto-delete the throwaway test users.

## Releasing (automatic updates)

Tag-driven (`ARCHITECTURE.md` §33–§39). The signing key is already generated
(`.secrets/`) and its public half is wired into `tauri.conf.json`. Full steps —
including the exact GitHub Actions secret names and values — are in
[`RELEASE.md`](./RELEASE.md). Short version:

```bash
# once: set the 4 Actions secrets (see RELEASE.md)
# per release: bump version in package.json AND src-tauri/tauri.conf.json, then
git tag v0.2.0 && git push origin main v0.2.0
```

## Project layout

```
src/                 React app
  components/         ui primitives, layout, feature components
  pages/              route screens
  lib/api/            TanStack Query hooks (queries + mutations) per entity
  lib/utils/          health, staleness, recommendations, dates, activity
  stores/             Zustand (auth, ui)
src-tauri/            Rust / Tauri shell, config, capabilities
supabase/migrations/  versioned schema
.github/workflows/    release pipeline
```
