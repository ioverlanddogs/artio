# API Spec — Artpulse (Next.js Route Handlers)

This spec describes implemented HTTP APIs under `app/api/**/route.ts`.

- Base path: `/api`
- Content-Type: `application/json` (unless explicitly returning HTML/other)
- Auth: Auth.js/NextAuth session cookies

---

## 1. Conventions

### 1.1 Error shape

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Human readable message",
    "details": {"field": "explanation"}
  }
}
```

### 1.2 Auth tiers

- Public read endpoints (no session required)
- Authenticated user endpoints
- Publisher endpoints (`/api/my/*`, venue/artist ownership checks)
- Admin/editor endpoints (`/api/admin/*`, role-gated)

### 1.3 Webhook endpoints

- `/api/webhooks/stripe`
- `/api/webhooks/resend`

---

## 2. Public Read APIs

- `/api/events`, `/api/events/[slug]`, `/api/events/nearby`
- `/api/venues`, `/api/venues/[slug]`, `/api/venues/nearby`
- `/api/artists`, `/api/artists/[slug]`
- `/api/artwork`, `/api/artwork/[key]`
- `/api/collections`, `/api/collections/[slug]`
- `/api/tags`
- `/api/trending/events`
- `/api/recommendations/for-you` (supports personalized discovery when available)
- `/api/search/quick`
- `/api/calendar-events`, `/api/calendar-events/saved`

---

## 3. Authenticated User APIs

- Favorites: `/api/favorites`, `/api/favorites/[id]`
- Follows: `/api/follows`, `/api/follows/manage`, `/api/follows/bulk-delete`, `/api/following/feed`
- Notifications: `/api/notifications`, `/api/notifications/read`, `/api/notifications/read-batch`, `/api/notifications/read-all`, `/api/notifications/unread-count`
- Saved searches: `/api/saved-searches`, `/api/saved-searches/[id]`, `/api/saved-searches/preview`
- Registrations: `/api/registrations/[confirmationCode]`, `/api/registrations/mine`
- Digest/preferences: `/api/me/digest-preferences`, `/api/me/location`
- Onboarding: `/api/onboarding`, `/api/onboarding/complete`

---

## 4. Publisher Self-Serve APIs (`/api/my/*`)

Implemented namespaces include:
- `/api/my/dashboard`
- `/api/my/venues/*` (CRUD, images, cover, submit, geocode, stripe)
- `/api/my/events/*` (CRUD, publish flows, ticket tiers, registrations/refunds)
- `/api/my/artist/*` (profile/CV/inquiries/stripe)
- `/api/my/artwork/*`
- `/api/my/team`
- `/api/my/series`

---

## 5. Recommendations, Engagement, and Discovery Ops APIs

- `/api/recommendations/events`
- `/api/recommendations/follows`
- `/api/recommendations/for-you`
- `/api/engagement`
- `/api/engagement/summary`

---

## 6. Admin & Operations APIs

### 6.1 Admin namespaces (`/api/admin/*`)

Includes users, venues, artists, events, tags, submissions, settings, invites, cron, health, imports, and venue generation handlers.

### 6.2 Cron/ops namespaces

- `/api/cron/*` (tick, health, geocode-venues, sync-google-events, editorial notifications)
- `/api/ops/metrics`
- `/api/health`, `/api/ready`

---

## 7. Uploads, Assets, and Utilities

- `/api/uploads/image`
- `/api/assets/[id]`, `/api/assets/mine`, `/api/assets/runtime-status`
- `/api/checkin/[eventId]`
- `/api/digests`, `/api/digests/[id]`
- `/api/claim/[token]`
- `/api/invite/accept`

---

## 8. Payments & Ticketing APIs

- Event checkout/session endpoints
- Registration management and refund endpoints
- Stripe Connect status/connect flows
- Stripe webhook reconciliation (`/api/webhooks/stripe`)

This area is backed by `TicketTier`, `Registration`, `PromoCode`, `StripeAccount`, and `ArtistStripeAccount` models.

---

## 9. Notes

- Previous section numbering issues were removed; numbering is now linear.
- Keep this doc synchronized with route additions under `app/api/**/route.ts`.
