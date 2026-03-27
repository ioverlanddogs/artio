# Stack — Artpulse

## Core
- Node.js 20+
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma + Postgres

## UI & Mapping
- shadcn/ui
- FullCalendar
- **Leaflet + OpenStreetMap** for interactive map rendering (public `/nearby` and admin ingest maps)
- Mapbox SDK remains in the codebase for geocoding and related provider integrations

## Auth
- Auth.js / NextAuth (Google OAuth)

## Platform Integrations
- **Sentry** (`@sentry/nextjs`) for error monitoring
- **Stripe** for ticketing, checkout, Connect onboarding, and webhook-driven payment state sync
- **Resend + React Email** for transactional email rendering and delivery
- **Upstash Redis** for rate limiting when configured (with in-memory fallback)

## CI/CD
- GitHub Actions + Vercel Git integration
