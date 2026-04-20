# Sprint 2 — Gallery Product + Discovery Upgrade

## Goal
Turn the current artwork-oriented browsing model into a coherent gallery experience and improve discovery quality.

## Scope
User-facing discovery and content-browsing only.
Creator-side gallery publishing can be deferred to Sprint 3 unless required as a dependency.

## Tasks

### 1. Introduce gallery as a first-class user concept
Priority: Critical

Implement one of:
- a true Gallery model, or
- a clean abstraction over existing artwork collections/groupings

Required user-facing outcomes:
- gallery list route
- gallery detail route
- gallery card in discovery surfaces
- gallery save support

Acceptance:
- user can browse galleries distinctly from single artworks
- gallery surfaces feel intentional rather than incidental

### 2. Gallery detail experience
Priority: High

Implement:
- cover image / hero
- creator identity block
- save CTA
- sequential viewing of gallery items
- captions/commentary where available
- related event or creator links

Acceptance:
- gallery detail provides context, not just media display

### 3. Discovery feed upgrade
Priority: High

Implement:
- mix events and galleries intentionally
- diversify creators/categories
- add ranking badges or helper text where useful
- improve search tabs or discovery entry points if feasible

Acceptance:
- explore feed can surface both events and galleries in a coherent mix

### 4. Recommendation phase-2 improvements
Priority: Medium

Implement:
- use behavior signals where available:
  - clicks
  - saves
  - follows
  - reminder creation
- preserve deterministic fallback for cold start
- return ranking reason fields

Acceptance:
- recommendations feel more personalized without breaking explainability

### 5. Search improvements
Priority: Medium

Implement:
- tabs or segmented results for:
  - events
  - galleries
  - creators
- basic ranking aligned with supported content types

Acceptance:
- users can find content more directly across the main entities

## Deliverables
- gallery routes and cards
- gallery detail experience
- better mixed discovery feed
- improved ranking quality
- search improvements where supported

## Non-goals
- advanced creator customization
- scheduled publishing
- admin moderation workflows
