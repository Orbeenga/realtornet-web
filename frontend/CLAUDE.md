# RealtorNet - Frontend Claude Context
<!-- Place at: /frontend/CLAUDE.md -->
<!-- Loaded after root CLAUDE.md. Frontend agent only. -->

## Entry State

Next.js 16.2.1 is deployed on Vercel. Phase J is closed as of 2026-05-13. Phase K is closed May 2026. Phase L is active. Phase K frontend work completed: mobile navigation drawer, route-specific SEO metadata, homepage Pinterest hero hotlink removal, and the `/properties` Leaflet/OpenStreetMap map view.

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

## Phase K Frontend Completed

- Mobile navigation drawer is live in `src/components/Navbar.tsx`; it mirrors `publicNavLinks` + `getAccountDropdownLinks()` and closes on link click, backdrop click, and Escape.
- Public route metadata is distinct for `/`, `/properties`, `/properties/[id]`, `/agencies`, `/agencies/[id]`, `/agents`, `/agents/[id]`, `/login`, `/register`, and `/agencies/apply`.
- Homepage hero no longer hotlinks Pinterest; it uses a local Tailwind gradient fallback pending a hosted hero asset.
- `DEF-J-MAP-001` is closed in `3c77776`: `/properties?view=map` uses Leaflet/OpenStreetMap, preserves URL-owned `view` state, shares the filtered property result set with the grid, renders mapped markers with popups, and lists unmapped results beside/below the map.
- Phase K dispatch (May 2026): two-tier navigation, search-led homepage hero, agent directory completeness gate, agency card counts from list API, agency-owner dashboard stats from `GET /api/v1/agencies/{id}/`, agency-owner My Listings scoped by `agency_id`, dashboard skeleton/sheet polish, properties-page auth-aware intro copy.

## Phase L Open Items

- Public pages SSR/data hydration: backend-coordinated follow-up.
- Form error-state audit against live validation responses: backend-coordinated follow-up.
- `DEF-J-EMAIL-DOMAIN-001`: real-user email delivery requires a verified Resend sender domain.
- `DEF-J-LOC-001`: location result-quality monitoring as usage grows; frontend must call backend location search and must never call Nominatim directly.
- `DEF-L-ADMIN-AUDIT-001`: frontend Audit Activity UI for `/account/admin/analytics` (backend endpoint is live; UI remains open).

## Phase K Stream B — Live Site Findings (2026-05-24)

### Deployment Propagation Issue (CRITICAL)

Sentry release headers show homepage is running commit `89f2530` (latest), but `/properties/`, `/agencies/`, and `/agents/` still run `efbca07` (previous). This blocks validation of B.1 (agent directory), B.3 (agency counts), and other Stream B changes. **Confirm Vercel deployment of `89f2530` is fully propagated across all routes before closing B.1 and B.3.**

### Landing Page Regressions

**Headline regression:** Reverted from "Find property through trusted real estate agencies" to "Find Your Next Property in Lagos" — Lagos-specific, loses the platform model explanation. Original messaging told visitors what we are and how it works.

**Missing subline:** "Browse approved agencies, inspect their listings, and move from discovery to inquiry with visible ownership at every step" was removed.

**Explainer card deleted:** The "PUBLIC HIERARCHY — Agencies to listings to agents" card was replaced by the search widget instead of coexisting. Both should remain.

**Missing "Latest Verified Listings":** Phase K Task 4 specified two featured sections (agencies + listings); only agencies section remains. Add it back.

**Lagos-specific meta titles:** All page titles and meta descriptions hardcode "Lagos" (e.g., "Properties for Sale & Rent in Lagos"). Page body correctly says "Discover verified homes across Nigeria." Change all titles/meta to Nigeria-wide language.

### Locked UI States Instruction

**Do not remove existing sections during hero or discovery changes.** The agency-hierarchy explainer card and both featured sections (Agencies + Listings) are locked states and must survive any UI refresh. Add new sections alongside, not instead of.

### Agents Page (`/agents`)

**Backend-blocked:** "No agents found" persists after frontend `89f2530` because production `GET /api/v1/agent-profiles/` returns blank `display_name`, blank `company_name`, and no `agency_name` on list rows. Track under `DEF-K-AGENT-DIR-001`. Do not implement frontend fallback joins, placeholder cards, or hardcoded names.

### Agency Counts (`/agencies`)

**Backend-blocked:** Agency cards read `agent_count` and `property_count` from the agency list response, but production `GET /api/v1/agencies/` returns zero counts even where verified properties exist. Track under `DEF-K-AGENCY-COUNTS-001`. Do not implement frontend aggregation or per-card fan-out.

### Filters — INP Performance Issue (248ms / 232ms)

Bedrooms select and listing-type select both fire heavy event handlers on every change, triggering immediate API calls and full re-renders. User experiences scroll snap as page re-renders mid-scroll.

**Fix:** Debounce filter changes (300-400ms). Ensure filter state updates do not trigger scroll position resets.

### Property Type Filter

Filter is frontend-wired to `GET /api/v1/property-types/` and cached as reference data. Production currently returns only `Apartment`, so the "12 types visible" acceptance criterion is backend seed-data blocked. Track under `DEF-K-PROPERTY-TYPE-SEED-001`.

## Frontend Agent Dispatch (After Deployment Confirmed)

1. Revert landing page headline to "Find property through trusted real estate agencies" and restore subline about the agency-first model
2. Restore the agency-hierarchy explainer card alongside the search widget (not instead of)
3. Add "Latest Verified Listings" section back to homepage (Phase K Task 4 specified both)
4. Change all page titles and meta descriptions from "Lagos" to Nigeria-wide language
5. Fix filter INP: debounce all filter change handlers, prevent scroll position resets
6. Fix property-type filter to fetch from `GET /api/v1/property-types/` and show all 12 types
7. Confirm Vercel deployment of `89f2530` fully propagates before closing B.1 and B.3


## Phase K Final Polish (2026-05-24)

- G.1 complete: homepage sections use Featured Properties and Featured Agencies; featured properties render up to 6 cards and hide when empty.
- G.2 complete: homepage search is location autocomplete + backend enum listing type only, navigates to /properties/ with URL params, and does not render a map.
- G.3 complete: /properties/ intro copy is auth-aware and removes before you sign in for authenticated users.
- Locked F.4 debounce was re-verified after touching PropertyFilters.tsx: 350ms debounced filter URL updates remain in place with scroll preservation.

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
