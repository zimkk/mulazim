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
```

## Releasing (automatic updates)

The update system is tag-driven (`ARCHITECTURE.md` §33–§39).

1. **One-time:** generate an updater signing key
   ```bash
   npm run tauri signer generate -- -w ~/.tauri/grid-manager.key
   ```
   - Put the **public** key in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
   - Update `plugins.updater.endpoints` with your GitHub repo path.
   - Add GitHub Actions secrets: `TAURI_SIGNING_PRIVATE_KEY`,
     `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `VITE_SUPABASE_URL`,
     `VITE_SUPABASE_ANON_KEY`.
2. **Each release:** bump the version in `package.json` **and**
   `src-tauri/tauri.conf.json` (keep them in sync), commit, then:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. GitHub Actions (`.github/workflows/release.yml`) builds, signs, generates
   `latest.json`, and publishes a GitHub Release. Installed apps detect it on
   next launch and offer a one-click update.

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
