# ArtPulse — Venue AI Generation + Venue Claiming (Codex Bundle)

This bundle contains the implementation documents and DB migration needed for a coding agent (Codex) to implement:
1) Admin-only AI venue generation (country + region → OpenAI JSON → normalize/dedupe/geocode → insert venues as unpublished + AI-generated)
2) Public venue claiming (claim request → email verification token → grant OWNER membership + update claim status)

## Contents
- `docs/specs/venue-ai-generation.md`
- `docs/specs/venue-claiming.md`
- `docs/adr/ADR-012-venue-generation-and-claiming.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/CODEX_AGENT_PACK.md`
- `prisma/migrations/20260227120000_venue_generation_and_claiming/migration.sql`

## Notes
- The migration folder timestamp can be renamed to match repo conventions.
- The schema snippets in the agent pack should be aligned to your existing `id` field strategy (`@db.Uuid` vs `cuid()`).
