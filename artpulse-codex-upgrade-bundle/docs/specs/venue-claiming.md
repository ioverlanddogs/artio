# ArtPulse
## Venue Claiming

How a real-world venue owner claims and manages their venue.

---

## Overview

When a venue exists in ArtPulse (AI-generated, imported, or discovered), a real owner can claim it.

Claim flow:

1. User discovers venue at `/venues/[slug]`
2. Clicks **Claim this venue**
3. Authenticates
4. Submits claim request
5. System emails verification link to venue contact email
6. Claimant clicks verification link
7. System grants ownership + updates status
8. Redirects to `/my/venues/[id]`

---

## Data Model

### VenueClaimRequest

Tracks each claim attempt.

### VenueClaimStatus (on Venue)

Denormalised UI status:

- `UNCLAIMED`
- `PENDING`
- `CLAIMED`

### VenueClaimRequestStatus (enum)

- `PENDING_VERIFICATION`
- `VERIFIED`
- `REJECTED`
- `EXPIRED`
- `REVOKED`

---

## Flow 1 — Public Venue Page

On `/venues/[slug]`:

If:

- `aiGenerated = true` (or the venue is otherwise claimable)
- `claimStatus != CLAIMED`

Render:

- Claim CTA
- Explanation
- Status badge if pending

---

## Flow 2 — Claim Submission

Route:

- `/venues/[slug]/claim`

Form fields:

- Name (prefilled)
- Role (Owner / Director / Manager / Staff)
- Optional message (max 500 chars)

Display redacted contact email:

- `info@***.co.za`

If no `contactEmail` exists:

- Show “Manual review required” message
- Submit into admin moderation queue

---

## Flow 3 — Email Verification

Immediately after submission:

- Create `VenueClaimRequest`
- Generate one-time token (store **hashed**)
- Expiry: 60 minutes
- Send email via your notification provider/outbox

Email contains:

- `/venues/[slug]/claim/verify?token=…`

---

## Flow 4 — Verification Click

Route:

- `/venues/[slug]/claim/verify?token=…`

System:

1. Looks up claim by hashed token
2. Checks:
   - Not expired
   - Status = `PENDING_VERIFICATION`
3. Executes transaction:
   - Add `VenueMembership` (role = `OWNER`)
   - Update `Venue.claimStatus = CLAIMED`
   - Mark claim `VERIFIED`
   - (Optional) set `isPublished = true`
   - Audit log entry
4. Redirect to `/my/venues/[id]`

---

## Owner Capabilities After Claim

Owner can:

- Edit venue details
- Upload images
- Invite editors
- Create events
- Submit venue for moderation

---

## Edge Cases & Guardrails

- Token expiry (60 minutes)
- Single-use tokens
- Rate limit claims per venue
- Prevent duplicate active claims
- Manual admin override
- Claim revocation

---

## Admin Page

- `/admin/venue-claims`

Admins can:

- Filter by status
- Approve manually
- Reject with reason
- Revoke verified claim
- View history

---

## Implementation Order

1. Prisma migrations
2. Venue generation pipeline
3. Claim submission (without email)
4. Email templates
5. Verification route
6. Public claim UI
7. Admin moderation UI
8. E2E test
