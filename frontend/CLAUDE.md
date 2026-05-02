# RealtorNet - Frontend Claude Context
<!-- Place at: /frontend/CLAUDE.md -->
<!-- Loaded after root CLAUDE.md. Frontend agent only. -->

## Entry State

Next.js 16.2.1 is deployed on Vercel. Phase G is closed through G.7 Integration & Exit. Phase H is in progress: H.3 moderation UI consistency is complete, H.4 performance pass is complete with mobile TBT deferred, and H.5 UX completeness is active.

## Navigation Contract (Locked - Reference `src/features/auth/navigation.ts`)

| Role | Navbar items | Post-login redirect |
|---|---|---|
| Logged out | Agencies, Properties | n/a |
| Seeker | Agencies, Properties, My Agencies, Favorites, Saved searches, My Inquiries | `/properties` |
| Agent | Agencies, Properties, My Agencies, My Listings, Inquiries, Favorites | `/account/listings` |
| Agency owner | Agencies, Properties, My Listings, Inquiries, Favorites, Agency dashboard | `/account/agency` |
| Admin | Properties, Agencies, Property moderation, Users, Inquiries, Agencies admin, Analytics | `/account/listings` |

- `agency_owner` receives agent-style navigation plus `/account/agency`.
- `/account/listings` admits `agent`, `agency_owner`, and `admin` where page-level role gates allow it.
- `/account/agency` is agency-owner only.
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
- Agency application form includes `website_url` and admin approval/rejection UI.
- Seeker join-request flow is live, including personal history on `/account/join-requests`.
- Agent invitation flow is live, including persistent invited-user inbox with accept/reject actions.
- Agency owner dashboard is live with profile summary, join-request review, roster management, sent invitations, and invite-by-email.
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
- H.4 desktop TBT target is met for `/properties` and `/agencies`; mobile TBT remains deferred to Phase I because the remaining cost is primarily shared Next/Turbopack runtime and polyfill boot cost.

## Latest Phase H Validation

- After commits `fd0fb12`, `5ceb385`, and `c68cc91`, frontend `tsc`, lint, and build gates were clean.
- H.3 moderation UI consistency completed: public feeds filter to verified listings, agent/admin surfaces render all moderation states, and the shared moderation helper is the UI source of truth.
- H.4 local Railway-backed Lighthouse desktop TBT: `/properties` 66ms and `/agencies` 177ms.
- H.5 live Railway OpenAPI contracts confirmed: `/api/v1/agencies/{agency_id}/stats`, `/api/v1/agent-profiles/{profile_id}`, `/api/v1/agent-profiles/{profile_id}/properties`, `/api/v1/property-types/`, and listing status enum schemas. Railway does not expose `/api/v1/agents/{id}`; use `agent-profiles`. `/api/v1/properties/` does not accept `property_type_id`, so public property-type filtering is deferred.

## April 22 / Phase E-H Follow-Up Audit

- Closed in Phase G/H: property card agency branding (`DEF-G-AG-001`), full moderation enum UI consistency (`DEF-G-MOD-001` / H.3), desktop H.4 TBT target, deferred toast initialization, form-route Zod/RHF splitting on list routes, agency application API error detail surfacing, join-request and agency dashboard tabbed layouts, and admin user demotion/deactivation reason gates.
- Still open or deferred: `/account/inquiries` cards still need joined property title/link data (`DEF-G-INQ-002`), mobile H.4 TBT remains above the revised 300ms target (`DEF-H4-MOBILE-TBT`), public property-type filtering is blocked until `/api/v1/properties/` accepts `property_type_id` (`DEF-H5-PROPERTY-TYPE-FILTER`), residual third-party `core-js` remains a dependency-audit item (`DEF-FE-004A`), audit log retention remains deferred (`DEF-002`), and production seed breadth remains a data-coverage concern.

## Type Generation

```bash
$env:NEXT_PUBLIC_API_URL='https://realtornet-production.up.railway.app'
pnpm gen:types
```

## Quality Gates

- `pnpm exec tsc --noEmit`
- `pnpm build`
- Lighthouse mobile on `/agencies` when a phase touches public discovery, navigation, or page weight.
