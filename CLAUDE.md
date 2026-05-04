# RealtorNet - Repository Claude Context

## Load order contract
- Claude Code should auto-load this root file first.
- Then load the area-specific file for the relevant surface:
  - frontend work: `/frontend/CLAUDE.md`
  - backend work: `/backend/CLAUDE.md` when that file exists
- The root file owns shared phase state, locked contracts, open bugs, and session handoff notes.
- The area file owns stack rules and implementation-specific guidance.

## Current phase state
- Phase G is closed through G.7 Integration & Exit.
- Phase H is in progress. Backend B1-B3 are complete (`5a96191`, `59c6923`, `0d58594`): legacy membership aliases removed, `property_type_id` search filter live, agency-owner profile edit contract open for own agency, and agent directory filters support `agency_id` + `location_id`.
- Frontend Stream B is active: H.3 moderation UI consistency is complete, H.4 performance pass is complete with mobile TBT deferred, and F1-F3 frontend endpoint wiring is in progress.
- Frontend production: Next.js 16.2.1 on Vercel at `realtornet-web.vercel.app`.
- Backend production: Railway at `realtornet-production.up.railway.app`.
- Production Supabase project: `avkhpachzsbgmbnkfnhu`.
- Dev Supabase project: `umhtnqxdvffpifqbdtjs`; do not use for production work.

## Locked architecture decisions
- Agency-first public hierarchy is locked: Agencies -> Listings -> Agents.
- `agency_owner` is active in the role enum; all four roles are live: `seeker`, `agent`, `agency_owner`, `admin`.
- Multi-agency membership is modeled through `agency_agent_memberships`.
- Moderation status enum includes `pending_review`, `verified`, `rejected`, and `revoked`.
- Moderation UI uses the enum contract as the source of truth; do not reintroduce boolean-only `is_verified` decision paths.
- Seeker-to-agency join-request flow is live.
- Agent invitation flow is live, including persistent invitation inbox and accept/reject actions.
- Agency membership management is live for suspend, revoke, block, restore, and review-decision flows.
- `/account/join-requests` and `/account/agency` use tabbed layouts to keep requests, invitations, memberships, and management surfaces separated as records grow.
- Public agency, agent, and property discovery must remain browseable without login; auth gates belong only on transactional actions.

## Locked contracts
- Backend is the source of truth for roles, permissions, property verification, agency membership state, and location references.
- Public signup creates seeker behavior only; agent, agency owner, and admin roles remain backend-authoritative.
- The frontend must keep using generated API types from `src/types/api.generated.ts`.
- Run `pnpm gen:types` against production Railway whenever backend schemas change.
- Property creation still depends on `location_id` in the current API contract.
- No `fetch()` calls in React components; API access belongs in hooks and shared client helpers.

## April 22 / Phase E-H follow-up audit
- Closed in Phase G/H: property card agency branding (`DEF-G-AG-001`), full moderation enum UI consistency (`DEF-G-MOD-001` / H.3), desktop H.4 TBT target for `/properties` and `/agencies`, deferred toast initialization, form-route Zod/RHF splitting on list routes, agency application API error detail surfacing, join-request and agency dashboard tabbed layouts, and admin user demotion/deactivation reason gates.
- Still open or deferred: inquiry cards on `/account/inquiries` need the newly confirmed embedded property/seeker data wired to remove N+1 hydration, mobile H.4 TBT remains above the revised 300ms target (`DEF-H4-MOBILE-TBT`), residual third-party `core-js` remains a dependency-audit item (`DEF-FE-004A`), audit log retention remains deferred until real traffic data (`DEF-002`), and production seed breadth remains a data-coverage concern.

## Latest Phase H validation
- After commit `5f43f0f`, frontend `pnpm gen:types`, `tsc`, lint, and build gates were clean.
- H.3 moderation UI consistency completed: public feeds filter to verified listings, agent/admin surfaces render all moderation states, and the shared moderation helper is the UI source of truth.
- H.4 desktop TBT target was met locally against Railway: `/properties` 66ms TBT and `/agencies` 177ms TBT. Mobile TBT remains deferred to Phase I for deeper RSC/island/runtime work.
- Current Railway OpenAPI confirms: `/api/v1/agencies/{agency_id}/stats`, `/api/v1/agent-profiles/` with `agency_id` and `location_id`, `/api/v1/agent-profiles/{profile_id}/reviews`, `/api/v1/agent-profiles/{profile_id}/stats`, `/api/v1/agent-profiles/{profile_id}/properties`, `/api/v1/property-types/`, `/api/v1/properties/` with `property_type_id`, `/api/v1/agencies/{agency_id}` owner-safe PUT, and listing status/type enum schemas.

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
