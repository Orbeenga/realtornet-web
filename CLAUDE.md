# RealtorNet - Repository Claude Context

## Load order contract
- Claude Code should auto-load this root file first.
- Then load the area-specific file for the relevant surface:
  - frontend work: `/frontend/CLAUDE.md`
  - backend work: `/backend/CLAUDE.md` when that file exists
- The root file owns shared phase state, locked contracts, open bugs, and session handoff notes.
- The area file owns stack rules and implementation-specific guidance.

## Current phase state
- Phase J is closed as of 2026-05-13. Phase K is closed May 2026. Phase L is closed. Phase M is closed June 2026. Phase Q is closed June 22 2026. Phase R is closed June 23 2026.
- **Current phase: Phase S — Schema Hardening, User Intelligence & Communications Completion**
- S.1 ✅ — Trigger functions → `internal` schema (backend)
- S.2 ✅ — `is_active` + `last_login` + deactivation endpoints (backend)
- S.3 ✅ — Admin user segmentation backend (role/activity_state filters + counts endpoint)
- S.4 ✅ — Admin user segmentation frontend (6 tabs, user cards, activity badges, AlertDialog deactivate/reactivate)
- Backend HEAD: `9654f36` (S.3 — admin user segmentation backend)
- Frontend HEAD: `06a72cf` (S.4 — admin user segmentation frontend)
- Phase H backend B1-B3 are complete (`5a96191`, `59c6923`, `0d58594`): legacy membership aliases removed, `property_type_id` search filter live, agency-owner profile edit contract open for own agency, and agent directory filters support `agency_id` + `location_id`.
- Phase H frontend F1-F3 are complete (`1660933`, `1c356e6`, `aced574`), with the public landing-page stale-auth redirect follow-up fixed in `ed11530`.
- Phase I frontend I.4/I.5 is closed in `2d8b0fb`: membership-history UI, post-revocation dashboard, generic review-request endpoints, stale `role_version` refresh handling, auth path correction, and single-agency revocation/review smoke. Multi-agency membership-role behavior is now production-verified by backend API smoke under `DEF-I-MEM-SMOKE-001`.
- Phase I frontend closeout is pushed in `8e74e18`: horizontal property filters, featured analytics empty/error handling, Suspense boundary, review-request rewire consolidation, I.6 mobile TBT work, and I.7 operational updates.
- Agency-owner session persistence is fixed and live in `c83e800`. Live Vercel browser verification confirmed `apineorbeenga@outlook.com` logs in to `/account/agency`, survives hard refresh, can access the protected dashboard, and only fetches `/agencies/9/agents/?status=all` after the Agent roster tab opens.
- Phase I I.6 mobile TBT is closed on 2026-05-07 after the public `(main)` layout RSC boundary fix and non-critical hydration deferral: `/properties` TBT 42ms, `/agencies` TBT 0ms, `/agents` TBT 0ms.
- Phase J carry-forward closeout is complete: `DEF-I-MEM-SMOKE-001` passed production API smoke and `DEF-I-COV-001` is closed at 95.03% backend coverage in commit `7e8fd35`.
- Phase K frontend pass includes mobile navigation drawer, route-specific SEO metadata, Pinterest hero hotlink removal, and the `/properties` Leaflet/OpenStreetMap map view in `3c77776`.
- H.1 live email is closed: Resend delivery confirmed, Railway variable propagation resolved, and smoke validation passed.
- Frontend production: Next.js 16.2.1 on Vercel at `realtornet-web.vercel.app`.
- Backend production: Railway at `realtornet-production.up.railway.app`.
- Production Supabase project: `fobvnshrqxduuhzgflvd`.
- Dev Supabase project: `umhtnqxdvffpifqbdtjs`; do not use for production work.
- Railway production service must run with `ENV=production`.
- **Phase M frontend locked state**: Frontend HEAD `f80dcc2`; `trailingSlash: false` in `next.config.ts` — locked; proxy (`src/app/api/v1/[...path]/route.ts`) — redirect:manual, server-side follow with HTTPS normalization, location header stripped — locked; `normalizeApiPath` in `client.ts` is a no-op — do not restore trailing-slash behavior; `Cache-Control: no-transform` middleware on FastAPI resolves Vercel proxy content-encoding failures — locked; Silent JWT refresh on 401 in `apiClient.ts` — locked; agency owner session stability restored — join-requests, invitations, review-requests call sites use no trailing slash; `/privacy` and `/terms` stubbed; Phase M dashboard tabs live: agent (6 tabs), agency owner (6 tabs), admin (5 tabs); Phase M housekeeping: agent name tags on creator-aware tabs live (commit `6218128`); agency listing count on public cards live via `property_count`; `owner_display_name` propagated and types regenerated (commit `f80dcc2`).

## Phase R Close Summary
- R.3: Reply composer (agent) + reply display (seeker) — confirmed working by operator browser check
- R.4: `/account/stats` frontend page + nav link for agent/agency_owner roles — confirmed rendering correctly
- R.5: Unblock CTA on Blocked tab — staging-validated

## Locked Reply Rendering Rules (Phase R)
- **Reply composer appears only when `reply_count === 0`** — this is the source-of-truth rendering rule. Do not invert.
- **Seeker reply display appears only when `latest_reply !== null`** — this is the source-of-truth rendering rule. Do not invert.
- These rules govern the inquiry detail view and must not be reversed or conditionally toggled.

## Deployment Workflow
- Work flows: feature -> staging -> validate -> merge to main -> production.
- Correct branch flow is staging first, manual validation second, then a deliberate merge or promotion to main for production.
- If staging and main both receive pushes, verify this is the intentional two-step promotion flow. Vercel may pick up each branch independently, but production must never be an accidental side effect of unvalidated staging work.

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
- `/agents` is the public agent directory surface; `/agents/[id]` remains the agent detail surface.
- `/account/reviews` is the account-owned reviews surface for seeker, agent, and agency-owner roles.
- `/account/stats` is the agent personal stats surface (Phase R.4).
- Agency owners can edit only their own public agency profile fields through `PUT /api/v1/agencies/{agency_id}`; status, verification, and owner-control fields remain admin-owned.
- Public agency, agent, and property discovery must remain browseable without login; auth gates belong only on transactional actions.
- Resend is the live Phase H email provider. `RESEND_API_KEY` must be present in Railway `imaginative-peace` Variables; current temporary sender is `onboarding@resend.dev` until a custom domain is registered.
- Public hooks on discovery surfaces use the `authMode: "omit"` pattern; do not reattach bearer auth to public browsing endpoints.
- Location picker UI is wired to public hierarchy endpoints and backend-powered search. The browser must never call Nominatim directly; location resolution is server-side and returns reusable `LocationResponse` rows.
- Mobile navigation is live in the shared navbar and must keep using `src/features/auth/navigation.ts` for role-specific links.
- Public route metadata is route-specific; keep root `metadataBase` pointed at `https://realtornet-web.vercel.app`.
- Public-directory stats and non-critical filter hydration should stay deferred past initial mobile interactivity unless a later trace proves they are no longer contributing to TBT.

## Locked contracts
- Backend is the source of truth for roles, permissions, property verification, agency membership state, and location references.
- Public signup creates seeker behavior only; agent, agency owner, and admin roles remain backend-authoritative.
- The frontend must keep using generated API types from `src/types/api.generated.ts`.
- Run `pnpm gen:types` against production Railway whenever backend schemas change.
- Property creation accepts `location_id` for existing rows or `location_name` for backend server-side resolution and `get_or_create()` storage.
- No `fetch()` calls in React components; API access belongs in hooks and shared client helpers.

## April 22 / Phase E-H follow-up audit
- Closed in Phase G/H: property card agency branding (`DEF-G-AG-001`), full moderation enum UI consistency (`DEF-G-MOD-001` / H.3), H.1 Resend live email, desktop H.4 TBT target for `/properties` and `/agencies`, deferred toast initialization, form-route Zod/RHF splitting on list routes, agency application API error detail surfacing, join-request and agency dashboard tabbed layouts, admin user demotion/deactivation reason gates, `property_type_id` public search filtering, `/agents` public directory, `/account/reviews`, received-inquiry embedded data wiring, admin analytics richer endpoint wiring, public `authMode: "omit"` hook hardening, Railway `RESEND_API_KEY` propagation, and Railway `ENV=production`.
- Still open or deferred: residual third-party `core-js` remains a dependency-audit item (`DEF-FE-004A`), audit log retention remains deferred until real traffic data (`DEF-002`), real-user email delivery is blocked pending a verified Resend sender domain (`DEF-J-EMAIL-DOMAIN-001`), public-page SSR/data hydration remains a backend-coordinated follow-up, and advanced location result-quality monitoring remains Phase K as traffic grows.
- I.7 evidence on 2026-05-07: production volume remains low (`/admin/stats`: 7 users, 2 properties, 4 inquiries), and no custom domain has been started. Phase J replaced manual location seeding with backend server-side Nominatim resolution and `GET /api/v1/locations/search?q=&limit=`. See `DEF-I-OPS-AUDIT-001`, `DEF-J-LOC-001`, and `DEF-J-EMAIL-DOMAIN-001`.
- I.6 validation on 2026-05-07, local production build: `/properties` mobile performance 97, accessibility 100, LCP 2523ms, TBT 42ms, CLS 0; `/agencies` mobile performance 100, accessibility 100, LCP 1339ms, TBT 0ms, CLS 0; `/agents` mobile performance 100, accessibility 100, LCP 982ms, TBT 0ms, CLS 0.

## Latest Phase H validation
- After commit `1c356e6`, frontend F2 `tsc`, lint, and build gates were clean.
- Phase H F3 local production Lighthouse after clean server restart: `/properties` mobile accessibility 1.00, LCP 2966ms, TBT 304ms; `/agencies` mobile accessibility 1.00, LCP 2033ms, TBT 490ms; `/agents` mobile accessibility 1.00, LCP 3968ms, TBT 382ms. Accessibility is clean; mobile LCP/TBT residuals are tracked under `DEF-H4-MOBILE-TBT`.
- H.3 moderation UI consistency completed: public feeds filter to verified listings, agent/admin surfaces render all moderation states, and the shared moderation helper is the UI source of truth.
- H.4 desktop TBT target was met locally against Railway: `/properties` 66ms TBT and `/agencies` 177ms TBT. Mobile TBT remains deferred to Phase I for deeper RSC/island/runtime work.
- Current Railway OpenAPI confirms: `/api/v1/agencies/{agency_id}/stats`, `/api/v1/agent-profiles/` with `agency_id` and `location_id`, `/api/v1/agent-profiles/{profile_id}/reviews`, `/api/v1/agent-profiles/{profile_id}/stats`, `/api/v1/agent-profiles/{profile_id}/properties`, `/api/v1/property-types/`, `/api/v1/properties/` with `property_type_id`, `/api/v1/agencies/{agency_id}` owner-safe PUT, `/api/v1/favorites/count/{property_id}`, `/api/v1/favorites/is-favorited`, `/api/v1/reviews/by-user/property/`, `/api/v1/reviews/by-user/agent/`, `/api/v1/amenities/categories`, and listing status/type enum schemas.
- Live location hierarchy and search endpoints are public and wired on the frontend. `GET /api/v1/locations/search?q=&limit=` performs backend-side resolution; frontend consumers must use that contract rather than browser-direct geocoding.

## Phase K Stream B deferred blockers
- `DEF-K-AGENT-DIR-001`: Public `/agents/` is backend-blocked because production `GET /api/v1/agent-profiles/` returns blank display identity fields and no `agency_name` on list rows. Do not use frontend fallback joins, placeholders, or hardcoded names.
- `DEF-K-AGENCY-COUNTS-001`: Public `/agencies/` counts are backend-blocked because production `GET /api/v1/agencies/` returns zero counts where verified properties exist. Do not use frontend aggregation or per-card fan-out.
- `DEF-K-PROPERTY-TYPE-SEED-001`: Property type filter is wired to `GET /api/v1/property-types/`, but production seed data currently returns only `Apartment`; the 12-type acceptance criterion is backend seed-data blocked.

## Phase K final polish status
- G.1: Landing sections are titled Featured Properties and Featured Agencies; property section hides when empty and shows up to 6 cards.
- G.2: Landing search is an intent-capture widget only: location autocomplete plus backend enum listing type, then navigation to /properties/?listing_type=&location_id=. No map on landing page.
- G.3: /properties/ intro copy is auth-aware; logged-in users do not see before you sign in copy.

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


## Production accounts (Phase L lock)

The following production identities are confirmed in the current Supabase project `fobvnshrqxduuhzgflvd` and should be treated as real accounts for operational work. Do not delete in production.

Agencies

| name              | email | is_verified |
| ----------------- | ----- | ----------- |
| Apine Real Estate | null  | true        |

Users

| user_id | first_name | last_name | email                       | is_verified |
| ------- | ---------- | --------- | --------------------------- | ----------- |
| 1       | Orbeenga   | Apine     | apineorbeenga@gmail.com     | true        |
| 2       | Orbeenga   | Apine     | apineorbeenga@outlook.com   | true        |
| 3       | Orbeenga   | Apine     | apineorbeenga@yahoo.com     | true        |
| 4       | Terngu     | Apine     | apineterngu19@gmail.com     | true        |