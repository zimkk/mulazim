# Release & auto-update runbook

The pipeline (`.github/workflows/release.yml`) is **tag-driven**: push a `v*` tag,
GitHub Actions builds + signs the desktop app on a Windows runner, generates the
updater metadata (`latest.json`), and publishes a GitHub Release. Installed apps
pick it up on next launch (`ARCHITECTURE.md` §33–§39).

## One-time setup

### 1. Updater signing key

Already generated at `.secrets/tauri-updater.key` (+ `.pub`), password **empty**.
`.secrets/` is git-ignored — **do not commit the private key**. Keep a backup
somewhere safe; if it's lost, existing installs can never be updated again.

The **public** key is already wired into `src-tauri/tauri.conf.json`
(`plugins.updater.pubkey`) and the endpoint is set to
`https://github.com/zimkk/mulazim/releases/latest/download/latest.json`.

### 2. GitHub Actions secrets

Four repo secrets are needed. **Two are already set** (`VITE_SUPABASE_URL`,
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`). The remaining two contain key material and
must be set by you — run these locally in the repo:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY --repo zimkk/mulazim < .secrets/tauri-updater.key
gh secret set VITE_SUPABASE_ANON_KEY   --repo zimkk/mulazim < <(grep -oP '(?<=^VITE_SUPABASE_ANON_KEY=).*' .env)
```

| Secret | Value | Status |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://ztmedzpbvsabzfjpyzll.supabase.co` | ✅ set |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | *(empty)* | ✅ set |
| `TAURI_SIGNING_PRIVATE_KEY` | contents of `.secrets/tauri-updater.key` | ⬜ you |
| `VITE_SUPABASE_ANON_KEY` | anon key from `.env` (public, safe to store) | ⬜ you |

## Cutting a release

1. Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json`
   (keep them identical — SemVer, `ARCHITECTURE.md` §34).
2. Commit, then tag and push:
   ```bash
   git commit -am "Release v0.2.0"
   git tag v0.2.0
   git push origin main v0.2.0
   ```
3. Watch the **Release** workflow. On success there's a new GitHub Release with:
   - `Grid Manager_x.y.z_x64-setup.exe` / `.msi` — the installer
   - `latest.json` — updater manifest
   - `*.sig` — detached signatures
4. An already-installed app shows "Update available" on next launch → one click →
   download → install → relaunch.

## Adding macOS / Linux later

Uncomment the matrix rows in `release.yml`. macOS also wants
`APPLE_CERTIFICATE*` / notarization secrets; Linux needs the `apt` deps step
(already in the workflow, just gated on the platform).

## Schema changes

Add a migration under `supabase/migrations/`, run `supabase db push` against the
project, verify, **then** tag the app release. Existing cloud data must stay
compatible (`ARCHITECTURE.md` §40).
