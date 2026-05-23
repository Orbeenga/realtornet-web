# RealtorNet - Frontend Claude Context
<!-- Place at: /frontend/CLAUDE.md -->
<!-- Loaded after root CLAUDE.md. Frontend agent only. -->

## Entry State

Next.js 16.2.1 is deployed on Vercel. Phase J is closed as of 2026-05-13 and Phase K is in progress. Phase K frontend work completed: mobile navigation drawer, route-specific SEO metadata, homepage Pinterest hero hotlink removal, and the `/properties` Leaflet/OpenStreetMap map view.

Phase I frontend I.4/I.5 is closed in `2d8b0fb`: post-revocation dashboard, membership history, generic review-request endpoints, stale `role_version` handling, and auth path correction are live. Phase I closeout is pushed in `8e74e18`, covering horizontal property filters, featured analytics empty/error handling, Suspense boundary work, review-request rewire consolidation, I.6 mobile TBT, and I.7 operational updates. Agency-owner session persistence is fixed and live in `c83e800`. `DEF-I-MEM-SMOKE-001` is closed by production API smoke, and `DEF-I-COV-001` is closed at 95.03% backend coverage in commit `7e8fd35`.

## Navigation Contract (Locked - Reference `src/features/auth/navigation.ts`)

Public top nav for all users: Properties, Agencies, Agents.

| Role | Avatar dropdown | Post-login redirect |
|---|---|---|
| Logged out | Login, Register | n/a |
| Seeker | My Favorites, Saved Searches, My Inquiries, Settings | `/properties` |
| Agent | My Listings, My Inquiries, My Favorites, Settings | `/account/listings` |
| Agency owner | My Listings, Agency Dashboard, My Inquiries, Settings | `/account/agency` |
| Admin | Property Moderation, User Management, Analytics, Settings | `/account/listings` |

- Use `publicNavLinks` for the top bar and `getAccountDropdownLinks()` for the avatar menu.
- Mobile drawer mirrors the same two-tier contract: public links, separator, account links.
- `/account/listings` admits `agent`, `agency_owner`, and `admin` where page-level role gates allow it.
- Agency owner My Listings filters by current `user.agency_id` inventory, not historical `user_id` listings.
- `/account/agency` is agency-owner only.
- `/account/agency` is the agency-owner dashboard for team roster, invite form, listing summary, and owner-safe public profile edits.
- `/account/agency` includes owner-safe public profile edit through `PUT /api/v1/agencies/{agency_id}`.
- `/account/admin/analytics` is the admin analytics page confirmed live in Phase H.
- `/agencies/apply` is the public agency application form.
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
- Zod and React Hook Form are kept off non-form discovery routes through route/component boundaries.
- Toast initialization is deferred.
- React Query Devtools are removed from production.
- `.browserslistrc` targets modern browsers.
- Residual `core-js` can still appear from third-party dependencies; track under future dependency audit, not Phase G exit.
- H.4 desktop TBT target is met for `/properties` and `/agencies`; Phase I I.6 closed the mobile TBT gap by moving account auth gating out of the shared public layout and deferring non-critical public-directory hydration.
- I.6 keeps agency/agent stats, property card enhancements, and secondary filter option data out of first mobile interactivity; do not reintroduce those fan-outs without a fresh trace.
- Phase I confirmed mobile TBT below 300ms on `/properties`, `/agencies`, and `/agents`.

## Phase K Completed Offline

- Mobile navigation drawer is live in `src/components/Navbar.tsx`; it mirrors `publicNavLinks` + `getAccountDropdownLinks()` and closes on link click, backdrop click, and Escape.
- Public route metadata is distinct for `/`, `/properties`, `/properties/[id]`, `/agencies`, `/agencies/[id]`, `/agents`, `/agents/[id]`, `/login`, `/register`, and `/agencies/apply`.
- Homepage hero no longer hotlinks Pinterest; it uses a local Tailwind gradient fallback pending a hosted hero asset.
- `DEF-J-MAP-001` is closed in `3c77776`: `/properties?view=map` uses Leaflet/OpenStreetMap, preserves URL-owned `view` state, shares the filtered property result set with the grid, renders mapped markers with popups, and lists unmapped results beside/below the map.
- Phase K dispatch (May 2026): two-tier navigation, search-led homepage hero, agent directory completeness gate, agency card counts from list API, agency-owner dashboard stats from `GET /api/v1/agencies/{id}/`, agency-owner My Listings scoped by `agency_id`, dashboard skeleton/sheet polish, properties-page auth-aware intro copy.

## Phase K Open Items

- Public pages SSR/data hydration: backend-coordinated follow-up.
- Form error-state audit against live validation responses: backend-coordinated follow-up.
- `DEF-J-EMAIL-DOMAIN-001`: real-user email delivery requires a verified Resend sender domain.
- `DEF-J-LOC-001`: location result-quality monitoring as usage grows; frontend must call backend location search and must never call Nominatim directly.
- `DEF-K-AGENT-DIR-001`: public agent directory still depends on `company_name` + agency lookup until `AgentProfileResponse` exposes `display_name` and `agency_name` on `GET /api/v1/agent-profiles/`.

## Latest Phase H Validation

- After commit `1c356e6`, frontend F2 `tsc`, lint, and build gates were clean.
- Phase H F3 local production Lighthouse after clean server restart: `/properties` mobile accessibility 1.00, LCP 2966ms, TBT 304ms; `/agencies` mobile accessibility 1.00, LCP 2033ms, TBT 490ms; `/agents` mobile accessibility 1.00, LCP 3968ms, TBT 382ms. Accessibility is clean; mobile LCP/TBT residuals are tracked under `DEF-H4-MOBILE-TBT`.
- H.3 moderation UI consistency completed: public feeds filter to verified listings, agent/admin surfaces render all moderation states, and the shared moderation helper is the UI source of truth.
- H.4 local Railway-backed Lighthouse desktop TBT: `/properties` 66ms and `/agencies` 177ms.
- Current Railway OpenAPI confirms: `/api/v1/agencies/{agency_id}/stats`, `/api/v1/agent-profiles/` with `agency_id` and `location_id`, `/api/v1/agent-profiles/{profile_id}/reviews`, `/api/v1/agent-profiles/{profile_id}/stats`, `/api/v1/agent-profiles/{profile_id}/properties`, `/api/v1/property-types/`, `/api/v1/properties/` with `property_type_id`, `/api/v1/agencies/{agency_id}` owner-safe PUT, `/api/v1/favorites/count/{property_id}`, `/api/v1/favorites/is-favorited`, `/api/v1/reviews/by-user/property/`, `/api/v1/reviews/by-user/agent/`, `/api/v1/amenities/categories`, and listing status/type enum schemas.
- Location hierarchy and backend-powered search UI are wired in Phase J. `GET /api/v1/locations/search?q=&limit=` resolves free text server-side and returns reusable `LocationResponse` rows; the browser must never call Nominatim or another geocoder directly. Property search filters by `location_id` once autocomplete or cascade selection resolves to a concrete row, while listing create/edit can submit `location_name` for backend resolution.
- Frontend smoke users created by `scripts/e6-smoke.spec.js` are tracked for teardown. Set `SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD` when running production smoke so cleanup can soft-delete generated users through the admin contract.
- I.6 validation on 2026-05-07, local production build: `/properties` mobile performance 97, accessibility 100, LCP 2523ms, TBT 42ms, CLS 0; `/agencies` mobile performance 100, accessibility 100, LCP 1339ms, TBT 0ms, CLS 0; `/agents` mobile performance 100, accessibility 100, LCP 982ms, TBT 0ms, CLS 0.
- Agency-owner live Vercel verification on 2026-05-07 after `c83e800`: `apineorbeenga@outlook.com` logs in to `/account/agency`, hard refresh preserves the session, protected agency-owner dashboard remains accessible, `/agencies/9/stats/` returns 200 with auth included, and `/agencies/9/agents/?status=all` is not called until the Agent roster tab is opened.

## April 22 / Phase E-H Follow-Up Audit

- Closed in Phase G/H: property card agency branding (`DEF-G-AG-001`), full moderation enum UI consistency (`DEF-G-MOD-001` / H.3), desktop H.4 TBT target, deferred toast initialization, form-route Zod/RHF splitting on list routes, agency application API error detail surfacing, join-request and agency dashboard tabbed layouts, admin user demotion/deactivation reason gates, `property_type_id` search filtering, account reviews, received-inquiry embedded data wiring, richer admin analytics endpoints, and amenity category contract wiring.
- Still open or deferred: residual third-party `core-js` remains a dependency-audit item (`DEF-FE-004A`), audit log retention remains deferred (`DEF-002`), real-user email delivery is blocked pending a verified Resend sender domain (`DEF-J-EMAIL-DOMAIN-001`), and location result-quality monitoring remains open as usage grows.

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
