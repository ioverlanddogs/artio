# ArtPulse Coding Agent Pack
## Venue AI Generation + Venue Claiming

This document is a coding-agent execution pack.

> Implement AI venue generation (admin-only) + venue claiming (public + verification + membership grant) with tests, keeping CI green.

## Commit Plan
1) Prisma schema + migration
2) Venue generation domain engine
3) Admin API routes for generation
4) Admin UI for generation
5) Venue claiming domain engine
6) Public claim routes + UI + venue CTA
7) Optional admin claims UI + endpoints
8) Docs linkage + smoke tests

## API Contracts

### POST /api/admin/venue-generation
Request: `{ "country": "string", "region": "string" }`
Response: `{ "runId": "uuid", "totalReturned": 80, "totalCreated": 73, "totalSkipped": 7 }`

### GET /api/admin/venue-generation/runs
Response: `{ "runs": [ ... ] }`

### POST /api/venues/[slug]/claim
Request: `{ "roleAtVenue": "...", "message": "..." }`
Response: `{ "claimId": "uuid", "status": "PENDING_VERIFICATION", "expiresAt": "...", "delivery": "EMAIL"|"MANUAL_REVIEW" }`

### GET /api/venues/[slug]/claim/verify?token=...
Response: `{ "venueId": "uuid", "redirectTo": "/my/venues/<id>", "status": "VERIFIED" }`

## Security Requirements
- Token: >=32 bytes random; store SHA-256 hash only
- Expiry: 60 minutes
- Single-use
- Rate limit: 1 pending claim per user+venue per 24h (minimum)
- Prevent multiple pending claims per venue (partial unique index if allowed)
