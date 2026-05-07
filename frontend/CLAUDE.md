# RealtorNet - Frontend Claude Context
<!-- Place at: /frontend/CLAUDE.md -->
<!-- Loaded after root CLAUDE.md. Frontend agent only. -->

## Entry State

Next.js 16.2.1 is deployed on Vercel. Phase H is closed. Phase I frontend I.4/I.5 is pushed in `2d8b0fb`: post-revocation dashboard, membership history, generic review-request endpoints, stale `role_version` handling, and auth path correction are live in source. I.6 mobile TBT is closed locally; I.7 operational cleanup is active.

## Navigation Contract (Locked - Reference `src/features/auth/navigation.ts`)

| Role | Navbar items | Post-login redirect |
|---|---|---|
| Logged out | Agencies, Properties, Agents | n/a |
| Seeker | Agencies, Properties, Agents, My Agencies, Favorites, Reviews, Saved searches, My Inquiries | `/properties` |
| Agent | Agencies, Properties, Agents, My Agencies, My Listings, Inquiries, Favorites, Reviews | `/account/listings` |
| Agency owner | Agencies, Properties, Agents, My Listings, Inquiries, Favorites, Reviews, Agency dashboard | `/account/agency` |
| Admin | Properties, Agencies, Agents, Property moderation, Users, Inquiries, Agencies admin, Analytics | `/account/listings` |

- `agency_owner` receives agent-style navigation plus `/account/agency`.
- `/account/listings` admits `agent`, `agency_owner`, and `admin` where page-level role gates allow it.
- `/account/agency` is agency-owner only.
- `/account/agency` includes owner-safe public profile edit through `PUT /api/v1/agencies/{agency_id}`.
- `/agents` is the public agent directory using backend `agency_id` and `location_id` filters.
- `/account/reviews` is the account-owned property/agent reviews page.
- `/account/users`, `/account/admin/agencies`, and `/account/admin/analytics` are admin only.
- `/account/join-requests` is the user-facing "My Agencies" surface for seeker and agent agency activity.
- `/account/join-requests` and `/account/agency` use tabbed layouts; keep new subsections behind tabs instead of stacking more full-page sections.

## API Layer Rules

- No `fetch()` calls inside components; use hooks in `/features/*/hooks/`.
- API calls go through `apiClient`, which injects the Bearer token and preserves trailing slashes.
- API response types come from `src/types/api.generated.ts`; do not hand-roll response interfaces.
- `ApiError` normalizes error shape as `status`, `detail`, and `fieldErrors`.
- Run `pnpm gen:types` against `https://realtornet-production.up.railway.app` after every backend contract change.

## Phase G-H Current Scope

- Agency-first landing page and public hierarchy are live: Agencies -> Listings -> Agents.
- Public agency directory, agency profile, agent roster, and agency listings are live.
- Public agent directory is live at `/agents`, with agency and listing-location filters.
- Agency application form includes `website_url` and admin approval/rejection UI.
- Seeker join-request flow is live, including personal history on `/account/join-requests`.
- Agent invitation flow is live, including persistent invited-user inbox with accept/reject actions.
- Agency owner dashboard is live with profile summary, join-request review, roster management, sent invitations, and invite-by-email.
- Agency owner dashboard supports editing public agency fields: name, description, address, website URL, and logo URL.
- Agency membership management is wired for suspend, revoke, block, restore, and review decision actions.
- Admin agencies page supports pending, approved, rejected, and revoked agency lifecycle work.
- Property moderation uses `moderation_status` enum handling for `pending_review`, `verified`, `rejected`, and `revoked`; do not reintroduce boolean-only `is_verified` decisions.
- Admin user deactivation and demotion decisions are reason-gated.
- Public discovery remains browseable without login; auth gates belong on transactional actions only.

## Bundle Notes

- `PropertiesExplorer` remains dynamically loaded through the client shell.
- Toast initialization is deferred.
- React Query Devtools are removed from production.
- `.browserslistrc` targets modern browsers.
- Residual `core-js` can still appear from third-party dependencies; track under future dependency audit, not Phase G exit.
- H.4 desktop TBT target is met for `/properties` and `/agencies`; Phase I I.6 closed the mobile TBT gap by moving account auth gating out of the shared public layout and deferring non-critical public-directory hydration.
- I.6 keeps agency/agent stats, property card enhancements, and secondary filter option data out of first mobile interactivity; do not reintroduce those fan-outs without a fresh trace.

## Latest Phase H Validation

- After commit `1c356e6`, frontend F2 `tsc`, lint, and build gates were clean.
- Phase H F3 local production Lighthouse after clean server restart: `/properties` mobile accessibility 1.00, LCP 2966ms, TBT 304ms; `/agencies` mobile accessibility 1.00, LCP 2033ms, TBT 490ms; `/agents` mobile accessibility 1.00, LCP 3968ms, TBT 382ms. Accessibility is clean; mobile LCP/TBT residuals are tracked under `DEF-H4-MOBILE-TBT`.
- H.3 moderation UI consistency completed: public feeds filter to verified listings, agent/admin surfaces render all moderation states, and the shared moderation helper is the UI source of truth.
- H.4 local Railway-backed Lighthouse desktop TBT: `/properties` 66ms and `/agencies` 177ms.
- Current Railway OpenAPI confirms: `/api/v1/agencies/{agency_id}/stats`, `/api/v1/agent-profiles/` with `agency_id` and `location_id`, `/api/v1/agent-profiles/{profile_id}/reviews`, `/api/v1/agent-profiles/{profile_id}/stats`, `/api/v1/agent-profiles/{profile_id}/properties`, `/api/v1/property-types/`, `/api/v1/properties/` with `property_type_id`, `/api/v1/agencies/{agency_id}` owner-safe PUT, `/api/v1/favorites/count/{property_id}`, `/api/v1/favorites/is-favorited`, `/api/v1/reviews/by-user/property/`, `/api/v1/reviews/by-user/agent/`, `/api/v1/amenities/categories`, and listing status/type enum schemas.
- Live `/api/v1/locations/states` currently returns a flat string list (`lagos`), so hierarchical location UI remains deferred under `DEF-I-LOC-001`.
- I.7 production evidence on 2026-05-07: `/locations/` has one Lagos/Lekki/phase 1 row, `/locations/states` returns `["lagos"]`, `/locations/cities?state=lagos` returns `["lekki"]`, and `/locations/neighborhoods?city=lagos` is empty. Keep the flat `location_id` picker.
- Frontend smoke users created by `scripts/e6-smoke.spec.js` are tracked for teardown. Set `SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD` when running production smoke so cleanup can soft-delete generated users through the admin contract.
- I.6 validation on 2026-05-07, local production build: `/properties` mobile performance 97, accessibility 100, LCP 2523ms, TBT 42ms, CLS 0; `/agencies` mobile performance 100, accessibility 100, LCP 1339ms, TBT 0ms, CLS 0; `/agents` mobile performance 100, accessibility 100, LCP 982ms, TBT 0ms, CLS 0.

## April 22 / Phase E-H Follow-Up Audit

- Closed in Phase G/H: property card agency branding (`DEF-G-AG-001`), full moderation enum UI consistency (`DEF-G-MOD-001` / H.3), desktop H.4 TBT target, deferred toast initialization, form-route Zod/RHF splitting on list routes, agency application API error detail surfacing, join-request and agency dashboard tabbed layouts, admin user demotion/deactivation reason gates, `property_type_id` search filtering, account reviews, received-inquiry embedded data wiring, richer admin analytics endpoints, and amenity category contract wiring.
- Still open or deferred: hierarchical location filtering awaits structured location data (`DEF-I-LOC-001`), residual third-party `core-js` remains a dependency-audit item (`DEF-FE-004A`), audit log retention remains deferred (`DEF-002`), multi-agency revocation smoke remains blocked by production seed shape (`DEF-I-MEM-SMOKE-001`), and production seed breadth remains a data-coverage concern.

## Type Generation

```bash
$env:NEXT_PUBLIC_API_URL='https://realtornet-production.up.railway.app'
pnpm gen:types
```

## Quality Gates

- `pnpm gen:types`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- Lighthouse mobile on `/agencies` when a phase touches public discovery, navigation, or page weight.
