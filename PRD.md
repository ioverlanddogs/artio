# Product Requirements Document (PRD) — Artpulse

## 1. Overview

**Artpulse** is a web platform for discovering, publishing, and transacting around art events and artwork.

It supports:
- public discovery for audiences,
- self-serve publishing for venues and artists,
- editorial/admin workflows,
- registration + payment flows,
- personalization and notification systems.

---

## 2. Vision & Goals

### Vision

Become the default place to answer:
- *“What art exhibitions and events are happening near me?”*
- *“How do I publish and grow my venue/artist presence?”*

### Current product goals

- Make art events easy to discover by **location, date, and relevance**
- Provide rich event, venue, artist, and artwork pages
- Enable **publisher self-serve** operations from `/my`
- Support registrations, ticket tiers, promo codes, and Stripe-backed payments
- Deliver personalized feeds, follows, notifications, and digests
- Keep the system Vercel-native with pragmatic background automation

### Non-goals (current)

- Real-time chat or direct messaging between users
- Full social-network style user-generated posting feeds
- Native mobile apps (web-first currently)

---

## 3. User Types

### 1. Visitor / Art Fan
- Discovers nearby and recommended events
- Follows artists/venues, saves searches, and manages notifications
- Registers for events and can purchase paid tickets where enabled

### 2. Venue Publisher
- Manages venue profiles and teams
- Publishes events, tracks registrations, and configures Stripe connect
- Uses analytics and moderation workflows via `/my`

### 3. Artist Publisher
- Maintains artist profile/CV and artwork inventory
- Receives inquiries/offers and manages artwork sales-related flows
- Connects Stripe for payouts where required

### 4. Editor / Admin
- Moderates and curates submissions
- Runs ingest + operations tools
- Manages campaigns, branding, taxonomy, and quality controls

---

## 4. Core User Journeys

### A. Discover and personalize
1. User lands on `/`, `/nearby`, `/for-you`, or `/following`
2. Applies filters or follows entities
3. Saves searches and receives notification/digest updates
4. Opens detail pages and converts (save/register/purchase)

### B. Publish as venue or artist
1. Publisher accesses `/my`
2. Creates/updates entities (venue, artist, event, artwork)
3. Submits items for review where required
4. Monitors performance, registrations, and operational status

### C. Register and pay
1. User opens event or artwork purchase flow
2. Selects tier/quantity or offer acceptance path
3. Completes checkout via Stripe
4. System confirms via API/webhook and sends transactional email

### D. Curate and operate
1. Admin manages moderation/curation/ingest queues
2. Runs operational or cron-driven jobs
3. Reviews analytics and campaign performance

---

## 5. Feature Scope (Shipped)

### 5.1 Discovery & Search
- Event discovery (list/calendar/map)
- Nearby and for-you recommendation surfaces
- Following feed and follow management
- Saved searches and quick search

### 5.2 Event, Venue, Artist, Artwork Surfaces
- Detailed public pages
- Featured and curated collection support
- Artist-venue/event association layers

### 5.3 Accounts, Auth, and Preferences
- OAuth sign-in
- Account, preferences, follows, notifications
- Digest and unsubscribe support

### 5.4 Publisher Self-Serve (`/my`)
- Venue, event, series, artwork, team, analytics, settings, registrations
- Stripe connect flows
- Submission/publish workflows

### 5.5 Commerce & Ticketing
- Ticket tiers, registrations, promo code support
- Stripe checkout + webhook reconciliation
- Artwork order/inquiry/offer pipeline

### 5.6 Admin Tooling
- Ingest, moderation, curation, email, ops, analytics, tags, branding, beta/admin utilities

---

## 6. Content & Publishing Rules

- Public surfaces expose published/approved content states
- Submission workflow supports draft, review, approval, rejection, and revisions
- Past events remain discoverable with temporal labeling

---

## 7. Success Metrics

- Discovery engagement (views, follows, saves)
- Registration and ticket conversion
- Publisher activation and retained publishing activity
- Notification/digest engagement rates
- Content quality and moderation throughput

---

## 8. Accessibility & UX Requirements

- Mobile-first layout
- Keyboard-accessible interactions
- Accessible map/calendar/list controls
- Clear readability/contrast and robust empty/error states

---

## 9. Technical Constraints

- Deployed on Vercel
- SSR/metadata strategy for SEO
- Prisma-based data access
- Background automation present (cron + outbox + ingest operations)

---

## 10. Roadmap Direction

- Expand personalization quality
- Improve publisher analytics depth
- Broaden campaign/notification orchestration
- Continue ingest and curation quality improvements
