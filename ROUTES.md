# Routes — Artpulse

This document summarizes the implemented Next.js page routes under `app/**/page.tsx`.

---

## 1. Public Discovery Routes

- `/`
- `/search`
- `/nearby`
- `/for-you`
- `/following`
- `/following/manage`
- `/events`
- `/events/[slug]`
- `/venues`
- `/venues/[slug]`
- `/artists`
- `/artists/[slug]`
- `/calendar`
- `/tags`
- `/tags/[category]`
- `/collections/[slug]`
- `/artwork`
- `/artwork/[key]`

## 2. Auth / Account / Preferences

- `/login`
- `/account`
- `/preferences`
- `/notifications`
- `/saved-searches`
- `/saved-searches/[id]`
- `/unsubscribe`

## 3. Access, Claim, Invite, and Utility Flows

- `/checkin/[eventId]`
- `/invite/[token]`
- `/claim/[token]`
- `/digests`
- `/digests/[id]`
- `/beta`
- `/get-started`

## 4. Publisher Self-Serve (`/my`)

- `/my`
- `/my/venues`, `/my/venues/new`, `/my/venues/[id]`
- `/my/events`, `/my/events/new`, `/my/events/[eventId]`
- `/my/artist`, `/my/artist/cv`, `/my/artist/inquiries`
- `/my/artwork`, `/my/artwork/new`, `/my/artwork/[id]`
- `/my/analytics`
- `/my/team`
- `/my/settings`
- `/my/collection`

## 5. Admin Routes (`(admin)` group)

- `/admin`
- `/admin/analytics`
- `/admin/artists`
- `/admin/artwork`
- `/admin/artwork-inquiries`
- `/admin/artwork-orders`
- `/admin/beta`
- `/admin/branding`
- `/admin/curation`
- `/admin/email`
- `/admin/events`
- `/admin/ingest`
- `/admin/moderation`
- `/admin/ops`
- `/admin/perf`
- `/admin/review`
- `/admin/settings`
- `/admin/submissions`
- `/admin/tags`
- `/admin/users`
- `/admin/venue-claims`
- `/admin/venues`
- `/admin/artist-event-associations`

---

## Notes

- The app uses route groups (notably `(admin)`) and a large `/my` publisher dashboard surface.
- This route list is intentionally source-aligned and should be updated whenever `app/**/page.tsx` changes materially.
