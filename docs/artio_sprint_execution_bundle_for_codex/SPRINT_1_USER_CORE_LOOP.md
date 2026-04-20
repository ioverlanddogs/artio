# Sprint 1 — Core User Loop Completion

## Goal
Complete the minimum sticky user loop:
Discover -> Save -> Remind -> Return

## Scope
Focus only on user-facing surfaces.
Do not work on admin or creator publishing surfaces in this sprint.

## Repository foundations already likely relevant
- For You / recommendations
- Events list and event detail
- Notifications
- Follows
- Favorites / saved content
- Onboarding and preferences
- Calendar integration

## Tasks

### 1. Event reminder system
Priority: Critical

Implement:
- reminder CTA on event detail
- preset options:
  - 2 hours before
  - 24 hours before
- create/delete reminder interaction
- reminder scheduling backend or queue integration
- notification dispatch for reminders
- deep link from notification back to event detail

Acceptance:
- user can set a reminder and receive it
- user can remove a reminder
- reminder state is visible on the event detail surface

### 2. Dedicated saved experience
Priority: High

Implement:
- /saved route or equivalent dedicated saved surface
- sections:
  - saved events
  - saved galleries or saved artwork collections if gallery model is not done yet
- empty state
- upcoming-first sorting for events

Acceptance:
- user can review saved content in one place
- save/unsave state stays consistent across list and detail pages

### 3. Notification preferences
Priority: High

Implement:
- user settings for:
  - event reminders
  - followed creator updates
  - nearby recommendations
- quiet hours (basic implementation is enough)
- persistence in user preferences model

Acceptance:
- settings can be changed and persist
- reminder/recommendation behavior respects settings

### 4. Explore feed alignment
Priority: Medium

Implement:
- ensure feed reflects actual supported content types
- add rails where feasible:
  - tonight
  - this week
  - from people you follow
  - nearby
- expose ranking reason where already supported by backend

Acceptance:
- feed composition is intentional and understandable
- recommendation reasons can be shown in lightweight UI

### 5. Follow-to-return loop
Priority: Medium

Implement:
- following impacts feed ranking
- followed creator new-event notification path
- relevant preference gate

Acceptance:
- followed creators measurably change feed or notification behavior

## Deliverables
- functional reminder flow
- functional saved hub
- notification preferences
- improved recommendation rails
- analytics instrumentation for reminder and saved flows

## Non-goals
- full gallery product
- creator dashboard changes
- admin features
