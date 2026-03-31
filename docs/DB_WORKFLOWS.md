# Database Workflows (Neon + Prisma)

## Branching strategy
- `main` = production data branch
- `staging` = long-lived pre-production validation branch
- `pr-<number>` = ephemeral preview branch per pull request

This keeps production, staging, and preview schema/data isolated without introducing multiple Prisma migration histories.

## Neon scripts
All Neon operations are script-driven and API-based:

- `scripts/neon/create-branch.mjs`
  - idempotently creates a branch from a parent (defaults to `main`)
- `scripts/neon/get-connection-urls.mjs`
  - resolves pooled `DATABASE_URL` and direct `DIRECT_URL` for a branch
  - masks secrets when running in GitHub Actions
- `scripts/neon/delete-branch.mjs`
  - deletes a branch

Required env vars:
- `NEON_API_KEY`
- `NEON_PROJECT_ID`
- optional `NEON_DATABASE_NAME` (default `neondb`)
- optional `NEON_ROLE_NAME` (default `neondb_owner`)

## Migration workflow
- Never run `prisma migrate` in Vercel build steps.
- Run migrations in CI using:
  - `pnpm prisma migrate deploy`
  - `pnpm prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-url "$DIRECT_URL" --exit-code`

If drift is detected, CI fails with:
- `Schema drift detected. Run prisma migrate dev and commit migration.`

## Seed workflow
- Command: `pnpm db:seed`
- Implementation: `prisma/seed.ts`
- Safety constraints:
  - idempotent (upserts by slug/email/composite IDs)
  - no destructive deletes
  - guardrail: seed runs only when `SEED_ENABLED=true` or environment is `staging|preview|ci|test`

Seed payload includes:
- 2 venues
- 3 artists
- 10 events
- tags and event links
- optional admin user if `ARTIO_ADMIN_EMAIL` is provided

## Preview lifecycle
1. PR opened/synchronized/reopened:
   - create Neon `pr-<number>` branch
   - fetch URLs
   - migrate deploy + drift gate
   - seed data
   - optionally push URLs to Vercel preview env vars (branch scoped)
2. PR closed:
   - delete Neon `pr-<number>` branch
   - skip deletion if PR has label `keep-preview-db`

## Staging lifecycle
- Trigger on `main` pushes or manual dispatch.
- Ensure `staging` Neon branch exists.
- Apply migrations + drift gate.
- Optional seed via `STAGING_SEED_ENABLED=true` repository variable.
