# ADR-012: AI Venue Generation & Claiming

## Status

Proposed

## Context

ArtPulse needs:

1. Rapid geographic expansion of the venue directory.
2. A secure mechanism for real-world venue owners to claim AI-seeded records.
3. Alignment with existing patterns:
   - `VenueMembership` access control
   - admin moderation workflows
   - notification/outbox delivery
   - audit logging

## Decision

Introduce:

- `Venue.aiGenerated` + `Venue.aiGeneratedAt`
- `Venue.claimStatus` (denormalised for public/UI)
- `Venue.contactPhone` + `Venue.openingHours`
- `VenueGenerationRun` audit model
- `VenueClaimRequest` verification lifecycle model

## Schema (Prisma-oriented)

- Use UUID primary keys (`@db.Uuid`) to match existing models.
- Use enums for status state.
- Store claim tokens hashed.
- Keep `VenueMembership` as the source of permission truth.

## Security

- Token is stored hashed and is single-use.
- Token expiry is enforced (60 minutes).
- At most one active pending claim per venue (future partial unique index).
- Manual admin override is supported.

## Consequences

### Positive

- Fast expansion into new regions
- Clear claim flow with verification
- Traceable audit and ops visibility

### Risks

- AI data quality varies
- Email verification depends on contactEmail accuracy
- Synchronous generation runtime constraints (may require background jobs later)
