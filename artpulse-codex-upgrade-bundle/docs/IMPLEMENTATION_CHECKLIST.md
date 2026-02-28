# ArtPulse — Venue AI Generation & Claiming
## Full Implementation Checklist (Mapped to Repo Structure)

### 0. Preparation & Safety
- [ ] Create feature branch
- [ ] Confirm Postgres (Neon) + Prisma migrations working locally
- [ ] Confirm CI runs `prisma validate` + tests
- [ ] Decide publish behavior after claim:
  - [ ] Claim grants OWNER only (recommended safer default)
  - [ ] Claim also auto-publishes venue

### 1. Prisma Schema & Migration
- [ ] Update `prisma/schema.prisma` (enums, models, Venue fields)
- [ ] Add migration SQL under `prisma/migrations/.../migration.sql`
- [ ] Apply locally + confirm no drift

### 2. Domain Layer (lib/)
- [ ] Add `lib/venue-generation/*` engine (prompt, schema, dedupe, pipeline)
- [ ] Add `lib/venue-claims/*` engine (token, create, verify, rate limit)

### 3. Admin API Routes
- [ ] `POST /api/admin/venue-generation`
- [ ] `GET /api/admin/venue-generation/runs`
- [ ] (Optional) Admin claims list/decision routes

### 4. Public Claim API
- [ ] `POST /api/venues/[slug]/claim`
- [ ] `GET/POST /api/venues/[slug]/claim/verify`

### 5. Admin UI
- [ ] `/admin/venue-generation` page + components
- [ ] (Optional) `/admin/venue-claims` page + components

### 6. Public Claim UI
- [ ] Add Claim CTA to public venue page
- [ ] `/venues/[slug]/claim` form page
- [ ] `/venues/[slug]/claim/verify` verify page

### 7. Email / Notifications
- [ ] Add verification email template + delivery wiring

### 8. Timezone Alignment (Recommended)
- [ ] Persist venue timezone from lat/lng (tz-lookup) where appropriate

### 9. Testing
- [ ] Unit tests: generation + claiming
- [ ] Route tests: admin generation + claim routes
- [ ] Optional E2E smoke

### 10. Definition of Done
- [ ] Admin generation works + logs runs
- [ ] Claim flow verifies via email token and grants OWNER membership
- [ ] Tests pass; GitHub + Vercel green
