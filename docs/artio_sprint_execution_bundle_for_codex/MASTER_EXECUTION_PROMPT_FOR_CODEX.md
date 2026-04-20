# MASTER EXECUTION PROMPT FOR CODEX

You are implementing the next execution phase for Artio using the current repository as the source of truth.

## Mission
Execute the sprint plan in sequence, using the existing repository foundations and preserving current architecture conventions.

You must work in this order:
1. Sprint 1 — Core User Loop Completion
2. Sprint 2 — Gallery Product + Discovery Upgrade
3. Sprint 3 — Creator Completion

Do not skip ahead unless a dependency blocker is explicitly documented.

## Global constraints
- Do not edit admin, moderation, or back-office surfaces
- Preserve existing routing, styling, state management, and API conventions
- Reuse existing models and components before adding new abstractions
- Prefer production-ready incremental work over rewrites
- Keep the app accessible and responsive
- Document blockers instead of making hidden assumptions

## Required first steps
1. Audit the current repository against all sprint docs
2. Create REPO_SPRINT_AUDIT.md
3. Create EXECUTION_CHECKLIST.md
4. Map existing features to sprint tasks as:
   - implemented
   - partial
   - missing
5. Begin Sprint 1 only after documenting the audit

## Working style
- Implement in small, reviewable increments
- Validate each sprint against ACCEPTANCE_CHECKPOINTS.md
- Where a feature partially exists, extend/refactor rather than duplicate
- If backend support is missing, add clear interfaces and payload shapes
- If frontend support is missing, build minimal complete flows before polish

## Definition of done
- Sprint 1 flows are functional end-to-end
- Sprint 2 upgrades discovery and introduces a coherent gallery product
- Sprint 3 completes creator publishing and identity surfaces
- Acceptance checkpoints are marked with notes and any remaining blockers
