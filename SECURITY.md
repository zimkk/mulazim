# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private reporting instead:
[**Report a vulnerability**](https://github.com/zimkk/mulazim/security/advisories/new)
— this opens a draft advisory only the maintainer can see.

Include what you did, what happened, and what you expected. A proof of concept
helps but is not required. You'll get an acknowledgement within a few days.

## Supported versions

Only the latest release receives fixes. The app self-updates on launch, so
staying current is the default.

## Security model

- **Every account's data is isolated by Postgres Row Level Security**, not by
  frontend filtering. Each table carries an owner column and a policy of the
  form `using (auth.uid() = user_id) with check (auth.uid() = user_id)`, so the
  boundary holds regardless of what a client sends. `npm run test:rls` asserts
  this empirically: it creates two accounts and has one attempt to read,
  update, delete and spoof-insert the other's rows across every table.
- **The anon key shipped in the client is public by design.** It grants nothing
  on its own — RLS is the boundary. The `service_role` key bypasses RLS
  entirely and must never appear in the client, this repository, or CI logs.
- **Releases are built and signed in CI.** Installers carry a minisign
  signature the updater verifies before applying an update, so a tampered
  release will not install.
- Builds are **not** yet Authenticode/Apple-notarized, so the OS will warn on
  first launch. See [`RELEASE.md`](./RELEASE.md).

## Scope

In scope: anything letting one account reach another's data, bypass RLS,
escalate privileges in the desktop shell, or tamper with the update channel.

Out of scope: the "unknown publisher" warning (a known, documented consequence
of unsigned builds), and issues requiring an already-compromised machine.
