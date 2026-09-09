# Release & auto-update runbook

`.github/workflows/release.yml` is **tag-driven**: push a `v*` tag → GitHub
Actions builds + signs the app on macOS, Linux and Windows runners in parallel,
generates the updater manifest (`latest.json`), and publishes a GitHub Release.
Installed apps pick it up on next launch (`ARCHITECTURE.md` §33–§39).

## One-time setup

### 1. Updater signing key

```bash
npm run tauri signer generate -- -w .secrets/updater.key   # choose a password or leave empty
```

`.secrets/` is git-ignored — **never commit the private key**, and keep a backup
(lose it and existing installs can never be updated again). Put the **public**
key in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`, and set
`plugins.updater.endpoints` to your repo's
`https://github.com/<owner>/<repo>/releases/latest/download/latest.json`.

### 2. GitHub Actions secrets

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | the project's public anon key |
| `TAURI_SIGNING_PRIVATE_KEY` | contents of `.secrets/updater.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the key's password (empty string if none) |

```bash
gh secret set VITE_SUPABASE_URL            --body "https://<ref>.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY       --body "<anon key>"
gh secret set TAURI_SIGNING_PRIVATE_KEY    < .secrets/updater.key
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body ""
```

The workflow normalizes `TAURI_SIGNING_PRIVATE_KEY` (strips any stray
whitespace / `%` a paste can add) before use.

### 3. (Optional) macOS notarization

Unsigned builds run but Gatekeeper warns ("right-click → Open" the first time).
To notarize (needs a paid Apple Developer account): add the `APPLE_CERTIFICATE`,
`APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`,
`APPLE_PASSWORD`, `APPLE_TEAM_ID` secrets, then add the matching
`APPLE_*: ${{ secrets.APPLE_* }}` lines under the `tauri-action` `env:` block.
**Only add the env lines once the secrets exist** — empty ones make the macOS
job fail on an empty keychain import.

## Cutting a release

1. Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json`
   (identical, SemVer). Optionally `src-tauri/Cargo.toml` too.
2. Commit, tag, push:
   ```bash
   git commit -am "Release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```
3. Watch: `gh run watch`. On success the Release carries, per platform:
   - Windows `*_x64-setup.exe` (NSIS, embeds the WebView2 bootstrapper) + `*.msi`
   - macOS `*_universal.dmg` + `*.app.tar.gz` (updater)
   - Linux `*.deb`, `*.rpm`, `*.AppImage`
   - `latest.json` + `*.sig`
4. Installed apps show "Update available" on next launch.

### Re-cutting a tag before it's shipped to anyone

```bash
gh run cancel <run-id>              # if one is mid-flight
git push origin :refs/tags/vX.Y.Z   # delete remote tag
git tag -d vX.Y.Z
# fix, commit, then re-tag and push
```

## Notes

- The repo must be **public** for the release download URLs and the auto-updater
  to work without authentication.
- Schema changes: add a migration, `supabase db push`, verify, **then** tag the
  release. Cloud data must stay compatible (`ARCHITECTURE.md` §40).
