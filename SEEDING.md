# Seeding — Artio

- Provide `pnpm db:seed`
- Create initial admin from env:
  - ARTIO_ADMIN_EMAIL
  - ARTIO_ADMIN_NAME
- Seed tags, venues, artists, and a handful of events
- Seed scripts should be idempotent (upsert)
- Never run seeding automatically in production
