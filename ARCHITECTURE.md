# Architecture — Artpulse

## 1. Goals

- Keep a Vercel-native, maintainable Next.js platform
- Serve both public discovery and authenticated publisher/admin workflows
- Support SEO-focused public pages and operationally safe background processing

---

## 2. System Overview

Artpulse is a **single Next.js App Router application** with integrated API handlers.

Core components:
- **Next.js** for SSR pages + Route Handlers
- **Postgres + Prisma** for persistence
- **Auth.js/NextAuth** for sessions + RBAC
- **Background systems (implemented)**:
  - cron endpoints (`/api/cron/*`)
  - ingest and venue generation pipelines
  - notification/email outbox + digest execution flows

---

## 3. Application Surfaces

### 3.1 Public Web

Discovery pages (`/`, `/nearby`, `/for-you`, `/following`, `/events`, `/venues`, `/artists`, etc.) with SEO metadata and server-rendered shells.

### 3.2 Publisher Web (`/my`)

Self-serve dashboard for venues/artists/events/artwork, team management, analytics, registrations, and settings.

### 3.3 Admin Web (`(admin)` route group)

Moderation, ingest, curation, email ops, analytics, tags, branding, and operational tooling.

### 3.4 API Layer

Route handlers under `app/api/**/route.ts` for public reads, authenticated actions, publisher operations, admin tooling, webhooks, and cron.

---

## 4. Data & Domain Architecture

Major domains:
- Discovery content (events/venues/artists/tags/assets)
- Commerce (ticket tiers, registrations, Stripe accounts, artwork orders/offers)
- Personalization/retention (follows, saved searches, recommendations, digests, notifications)
- Operations (ingest, enrichment, generation jobs, audit/perf telemetry)

---

## 5. AuthN/AuthZ

- Session-based auth via Auth.js
- RBAC roles: `USER`, `EDITOR`, `ADMIN`
- Publisher permissions additionally gated by ownership/membership checks and trusted-publisher logic

---

## 6. Mapping, Search, and Geo

- Map rendering: Leaflet + OpenStreetMap tiles
- Geocoding providers include Mapbox and other configured providers
- Search/recommendation APIs back discovery and personalized surfaces

---

## 7. Reliability & Observability

- Sentry integration for error monitoring
- Explicit health/ready endpoints
- Job/cron tracking tables for operational insight

---

## 8. File/Folder Layout (actual shape)

```text
app/
  (admin)/admin/**
  api/**
  my/**
  events/**
  venues/**
  artists/**
  artwork/**
  nearby/**
  for-you/**
  following/**
components/
lib/
prisma/
  schema.prisma
  migrations/
test/
tests/e2e/
```

---

## 9. Deployment

- Hosted on Vercel
- Prisma migrations deployed via CI/release workflows
- Runtime integrations include Stripe, Resend, Sentry, and optional Upstash-backed rate limiting
