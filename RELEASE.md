# Release & auto-update runbook

The pipeline (`.github/workflows/release.yml`) is **tag-driven**: push a `v*` tag →
GitHub Actions builds + signs the app on macOS, Linux and Windows runners in
parallel, generates the updater metadata (`latest.json`), and publishes a GitHub
Release. Installed apps pick it up on next launch (`ARCHITECTURE.md` §33–§39).

## One-time setup

### 1. Updater signing key

Generated at `.secrets/tauri-updater.key` (+ `.pub`), password **empty**.
`.secrets/` is git-ignored — **do not commit the private key**. Keep a backup;
if it's lost, existing installs can never be updated again. The **public** key is
wired into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`, and the
endpoint is `https://github.com/zimkk/mulazim/releases/latest/download/latest.json`.

### 2. GitHub Actions secrets — all four set ✅

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://ztmedzpbvsabzfjpyzll.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the public anon key from `.env` |
| `TAURI_SIGNING_PRIVATE_KEY` | contents of `.secrets/tauri-updater.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | *(empty)* |

To rotate/re-set:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY --repo zimkk/mulazim < .secrets/tauri-updater.key
gh secret set VITE_SUPABASE_ANON_KEY   --repo zimkk/mulazim < <(grep -oP '(?<=^VITE_SUPABASE_ANON_KEY=).*' .env)
```

### 3. (Optional) macOS notarization

Unsigned builds work but Gatekeeper warns ("right-click → Open" the first time).
To ship a notarized `.dmg` (needs a paid Apple Developer account):

1. Add these repo secrets: `APPLE_CERTIFICATE` (base64 of a "Developer ID
   Application" .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`
   (`Developer ID Application: Name (TEAMID)`), `APPLE_ID`, `APPLE_PASSWORD`
   (an app-specific password), `APPLE_TEAM_ID`.
2. Uncomment / add the matching `APPLE_*: ${{ secrets.APPLE_* }}` lines under
   the tauri-action `env:` block in `release.yml`. **Only add them once the
   secrets exist** — with empty secrets, `tauri-action` tries to import an empty
   keychain certificate and the macOS job fails.

Windows Authenticode signing is similarly optional (an EV/OV code-signing cert).

## Cutting a release

1. Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json`
   (identical — SemVer, `ARCHITECTURE.md` §34). Update `Cargo.toml` if you like.
2. Commit, tag, push:
   ```bash
   git commit -am "Release v0.2.0"
   git tag v0.2.0
   git push origin main v0.2.0
   ```
3. Watch it: `gh run watch --repo zimkk/mulazim`.
4. On success the Release has, per platform:
   - **Windows** `Grid Manager_x.y.z_x64-setup.exe` (NSIS, bundles the WebView2
     bootstrapper) + `_x64_en-US.msi`
   - **macOS** `Grid Manager_x.y.z_universal.dmg` + `.app.tar.gz` (updater)
   - **Linux** `grid-manager_x.y.z_amd64.deb`, `grid-manager-x.y.z-1.x86_64.rpm`,
     `grid-manager_x.y.z_amd64.AppImage`
   - `latest.json` + `*.sig` — the updater manifest and detached signatures
5. Installed apps show "Update available" on next launch → one click → relaunch.

## Re-cutting the same tag (before it's shipped to anyone)

```bash
gh run cancel <run-id> --repo zimkk/mulazim   # if one is mid-flight
git push origin :refs/tags/v0.1.0             # delete remote tag
git tag -d v0.1.0                             # delete local tag
# fix things, commit, then re-tag:
git tag v0.1.0 && git push origin v0.1.0
```

## Schema changes

Add a migration under `supabase/migrations/`, `supabase db push`, verify, **then**
tag the release. Existing cloud data must stay compatible (`ARCHITECTURE.md` §40).
