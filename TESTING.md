# Testing — Artpulse

## Current Test Stack

- **Node built-in test runner** for unit/integration-style tests in `test/**/*.test.ts(x)`
- **Playwright** for browser E2E specs in `tests/e2e/*.spec.ts`

## Current Footprint (repository snapshot)

- Node test files: **337**
- Playwright spec files: **6**

> Note: these counts are file counts, not individual test case counts.

## Commands

- Node suite:
  - `pnpm test`
  - `pnpm test:node`
- E2E suite:
  - `pnpm test:e2e`
  - `pnpm test:e2e:ui`

## Scope covered today

- Route handler behavior and validation
- Domain/service logic in `lib/*`
- Workflow-specific tests (publishing, claims, notifications, payments-related flows)
- End-to-end coverage for auth, admin, dashboard, public browsing, claims, and transactions

## Guidance

- Add regression tests with every behavior change
- Prefer deterministic fixtures and explicit setup/teardown
- Keep Node tests fast; reserve Playwright for cross-page/browser-critical flows
