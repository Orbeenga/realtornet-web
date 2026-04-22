# RealtorNet - Repository Claude Context

## Load order contract
- Claude Code should auto-load this root file first.
- Then load the area-specific file, for frontend work: `/frontend/CLAUDE.md`.
- The root file owns shared phase state, locked contracts, open bugs, and session handoff notes.
- The area file owns stack rules and implementation-specific guidance.

## Current phase state
- Phase F remains active for frontend verification and polish.
- F.3 mobile LCP is effectively closed from the latest measured result: LCP about 1.9s on `/properties`.
- F.4 TBT is not fully closed technically; the exit criterion has been revised and promoted to Phase G review.
- F.5 is not blocked by DEF-FE-004A. Listing verification/admin verification flow remains the immediate product flow to finish validating live.

## Locked contracts
- Backend is the source of truth for roles, permissions, property verification, and location references.
- Public signup creates seeker/buyer behavior only; agent and admin remain backend-authoritative roles.
- `/account/listings` admits `agent` and `admin`; seekers are redirected away.
- The frontend must keep using generated API types from `src/types/api.generated.ts`.
- Property creation still depends on `location_id` in the current API contract. Do not replace it with frontend-only free-text geocoding unless backend contract changes.
- Public routes must stay server-first and must not depend on auth redirects.

## Open bugs and active follow-ups
- Production property type and location dropdowns currently show one real option each because production seed data only contains one property type and one location.
- Browserslist target has been updated, but residual `core-js` remains in emitted client output through third-party dependencies. Full elimination is deferred to Phase G dependency audit.
- TBT remains above the original goal after code splitting and shared-weight cleanup. Further reduction likely requires architectural changes outside Phase F scope.

## Session template
At session start, capture:
- Goal for this session
- Current production blocker, if any
- Files or contracts likely to be touched
- What must not be regressed

At session end, capture:
- What changed
- What was verified
- What is still open
- Whether production deploy or live validation is still pending

## /wrap requirement
- At the end of each Claude Code session, run `/wrap`.
- Use `/wrap` to record current phase state, locked contracts, open bugs, and next-step handoff notes so future sessions do not require manual paste-in context.
