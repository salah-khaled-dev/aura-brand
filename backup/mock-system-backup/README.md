# Mock System Backup

Snapshot of the AURA Brand mock/localStorage backend, taken immediately
before the mock → Supabase migration (Phase A: products, categories,
media/storage). Purpose: safety net + rollback reference. Nothing in `src/`
was modified or deleted to create this backup.

## Contents

- `mock-services/` — verbatim copy of every file under `src/lib/services/` at backup time (includes the `storefront/` subfolder).
- `mock-data/` — verbatim copy of every file under `src/data/mock/` at backup time.
- `seeds/*.json` — the actual current seed values for each feature area, transcribed from the source files (most are empty arrays — see `ARCHITECTURE.md` for why).
- `sql-seeds/*.sql` — `INSERT` statements for the non-empty seeds (categories), written against the Phase A Supabase schema.
- `ARCHITECTURE.md` — how the mock system works (persistence layer, service pattern, event bus, current seed data).
- `MIGRATION_MAP.md` — per-feature table: mock source → target Supabase table/bucket → migration phase → status.

## How to restore (rollback)

Rollback strategy for this migration is **git-based**, not a runtime toggle:
each service cutover ships as its own commit, so `git revert <commit>`
restores that one service to its mock implementation. This backup folder is
the second line of defense — if a service file is later deleted from `src/`
(Phase A step "A.4 — Cleanup") and you need it back regardless of git
history:

1. Copy the relevant file(s) from `mock-services/` back into `src/lib/services/`.
2. Copy the relevant file(s) from `mock-data/` back into `src/data/mock/`.
3. Revert any caller changes made during the cutover (check the commit that performed the cutover for the exact diff).
4. No environment variable or feature flag needs to change — the mock services have no runtime dependency on Supabase being configured.

## What this backup does NOT capture

- **Live browser localStorage data.** Nearly every mock feature area ships
  with an *empty* seed in source control (see `ARCHITECTURE.md`) — real
  looking data in a running instance of this app exists only in that
  browser's `localStorage` under the `aura_mock_db:*` keys, and cannot be
  captured by a static repo backup. If you need to preserve real
  admin-entered data before migrating, export it from DevTools
  (Application → Local Storage) first.
- **Mock passwords** (`MOCK_CREDENTIALS` in `users.service.ts`) — deliberately
  excluded from `seeds/users.json`. These are mock djb2 hashes, not real
  credentials, and must never be written into Supabase Auth.
