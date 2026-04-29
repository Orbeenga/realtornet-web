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
- Phase H is the next active phase.
- Frontend production: Next.js 16.2.1 on Vercel at `realtornet-web.vercel.app`.
- Backend production: Railway at `realtornet-production.up.railway.app`.
- Production Supabase project: `avkhpachzsbgmbnkfnhu`.
- Dev Supabase project: `umhtnqxdvffpifqbdtjs`; do not use for production work.

## Phase G locked architecture decisions
- Agency-first public hierarchy is locked: Agencies -> Listings -> Agents.
- `agency_owner` is active in the role enum; all four roles are live: `seeker`, `agent`, `agency_owner`, `admin`.
- Multi-agency membership is modeled through `agency_agent_memberships`.
- Moderation status enum includes `pending_review`, `verified`, `rejected`, and `revoked`.
- Seeker-to-agency join-request flow is live.
- Agent invitation flow is live, including persistent invitation inbox and accept/reject actions.
- Agency membership management is live for suspend, revoke, block, restore, and review-decision flows.
- Public agency, agent, and property discovery must remain browseable without login; auth gates belong only on transactional actions.

## Locked contracts
- Backend is the source of truth for roles, permissions, property verification, agency membership state, and location references.
- Public signup creates seeker behavior only; agent, agency owner, and admin roles remain backend-authoritative.
- The frontend must keep using generated API types from `src/types/api.generated.ts`.
- Run `pnpm gen:types` against production Railway whenever backend schemas change.
- Property creation still depends on `location_id` in the current API contract.
- No `fetch()` calls in React components; API access belongs in hooks and shared client helpers.

## Open bugs and active follow-ups
- No Phase G exit-blocking frontend bugs are open as of G.7 validation.
- Residual `core-js` output from third-party dependencies remains a future dependency-audit item.
- Production seed breadth remains thin for some property types and locations; that is data coverage, not a frontend contract bug.

## Latest G.7 validation
- `pnpm gen:types` against production Railway completed; generated types were current.
- `pnpm exec tsc --noEmit` completed with 0 errors.
- `pnpm build` completed cleanly on Next.js 16.2.1 with no warnings in the build output.
- Lighthouse mobile on `/agencies`: LCP 1.5s, accessibility 1.00, performance 0.92, CLS 0.
- Production route walkthrough returned HTTP 200 with content for `/`, `/agencies/`, `/agencies/1/`, `/agencies/apply/`, `/account/join-requests/`, `/account/agency/`, and `/account/admin/agencies/`.

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
