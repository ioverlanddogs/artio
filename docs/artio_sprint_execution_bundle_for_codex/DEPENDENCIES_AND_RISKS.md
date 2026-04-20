# Dependencies and Risks

## Likely dependencies
- Existing notification infrastructure
- Existing recommendation services
- Existing favorites/follows schema
- Existing artwork/media models
- Existing /my creator management surfaces
- Existing analytics or event tracking system

## Key decisions Codex may need to make
1. Whether to introduce a true Gallery model or adapt existing artwork collections
2. Whether reminder delivery is push-only, in-app, email, or hybrid
3. Whether creator public page is a separate config model or derived from existing artist/venue profile data
4. Whether scheduled publishing needs a job runner, cron, or delayed task mechanism

## Risks
- Duplicating artwork and gallery concepts without a clear migration path
- Adding reminder UI without actual delivery reliability
- Building creator features before user discovery surfaces can benefit from them
- Modifying mature creator/admin codepaths accidentally

## Mitigations
- Start each sprint with a repo audit
- Reuse existing entities where possible
- Add lightweight abstractions first
- Keep all new work behind existing routing and permission boundaries
