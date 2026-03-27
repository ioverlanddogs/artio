# Data Model — Artpulse

This document reflects the current Prisma schema (`prisma/schema.prisma`) and groups entities by domain rather than listing only early-MVP tables.

---

## 1. Key Principles

- Postgres + Prisma as source of truth
- Published/content-state workflow is first-class (`ContentStatus`, submission states)
- Multi-role platform: public users, publishers, editors/admins
- Commerce, notifications, and background job tracking are schema-level concerns

---

## 2. Core Identity & Access

### User
`User` includes account identity, roles, and platform flags.

Notable fields include:
- `role` (`USER | EDITOR | ADMIN`)
- `isTrustedPublisher` (publisher RBAC/experience gating)
- beta-related relations (`BetaAccessRequest`, `BetaFeedback`)

### Access/Org Models
- `VenueMembership`, `VenueInvite`
- `AdminInvite`
- `VenueClaimRequest`, `VenueClaimInvite`

---

## 3. Discovery & Editorial Content

### Primary entities
- `Venue`
- `Artist`
- `Event`
- `Tag`
- `Asset`, `AssetVariant`

### Join/association entities
- `EventTag`
- `EventArtist`
- `ArtistVenueAssociation`
- `ArtistEventAssociation`
- `ArtworkTag`

### Media entities
- `EventImage`
- `VenueImage`
- `ArtistImage`
- `ArtworkImage`

### Curation/editorial entities
- `CuratedCollection`
- `CuratedCollectionItem`
- `EditorialNotificationLog`

---

## 4. Publishing & Submission Workflow

- `Submission` supports type/kind/status-driven moderation flows
- `EventSeries` supports grouped event publishing
- `OnboardingState` tracks onboarding progress/state

---

## 5. Ticketing, Registration, and Payments

### Event commerce
- `TicketTier`
- `Registration`
- `PromoCode`
- `Attendance`

### Stripe connectivity
- `StripeAccount` (venue-side)
- `ArtistStripeAccount` (artist-side)

### Artwork commerce
- `Artwork`
- `ArtworkOrder`
- `ArtworkInquiry`
- `ArtworkOffer`
- `ArtistFeaturedArtwork`
- `ArtworkVenue`
- `ArtworkEvent`

---

## 6. Personalization, Follows, and User Retention

- `Favorite`
- `Follow`
- `SavedSearch`
- `DigestRun`
- `Notification`
- `NotificationOutbox`
- `EmailCampaign`
- `EmailUnsubscribe`
- `EngagementEvent`

---

## 7. Ingest, Enrichment, and Operations

- `IngestRun`, `IngestRegion`
- `IngestExtractedEvent`, `IngestExtractedArtist`, `IngestExtractedArtwork`
- `IngestExtractedArtistEvent`, `IngestExtractedArtistRun`
- `IngestDiscoveryJob`, `IngestDiscoveryCandidate`
- `EnrichmentRun`, `EnrichmentRunItem`, `VenueEnrichmentLog`
- `VenueGenerationRun`, `VenueGenerationRunItem`, `VenueHomepageImageCandidate`

Operational telemetry/support:
- `CronJob`, `JobRun`
- `PerfSnapshot`
- `PageViewEvent`, `PageViewDaily`
- `AdminAuditLog`
- `DismissedDuplicate`
- `ImportMappingPreset`
- `SiteSettings`

---

## 8. Model Inventory Snapshot

The current schema contains dozens of domain models (well beyond early-MVP scope) spanning:
- discovery content,
- publisher self-serve,
- ticketing + artwork commerce,
- personalization/notifications,
- ingest/ops instrumentation.

Use `prisma/schema.prisma` as canonical for field-level definitions and relation constraints.
