## Phase E Deferrals

| ID | Item | Phase |
|---|---|---|
| DEF-FE-001 | Mobile LCP optimisation - LCP element is a <p> CTA tag, target <2.5s not met on mobile (current: 4.4s) | Phase F |
| DEF-FE-002 | TBT reduction - 304 KiB unused JS on initial load, TBT 270ms desktop / 130ms mobile (target <100ms) | Phase F |
| DEF-FE-003 | Sentry deferred initialisation - blocking ~300ms on mobile LCP | Phase F |
| DEF-FE-004 | Legacy JS polyfills - Array.prototype.at, Object.hasOwn etc being shipped unnecessarily | Phase F |
| DEF-FE-005 | CSS render-blocking chunk (12.5 KiB) on critical path | Phase F |
| DEF-FE-006 | Mobile TBT 250ms (target <100ms) - PropertiesExplorer client bundle needs deeper code splitting | Phase F |
| DEF-FE-007 | Select elements missing associated labels in filter UI - accessibility fix needed | Phase F |
| DEF-FE-004A | Browserslist target updated, residual core-js from third-party deps - full elimination requires dependency audit in Phase G. Does not block F.5. | Phase G |
| DEF-F4-TBT | TBT exit criterion revised. Original target: <100ms desktop and mobile. Revised target: <300ms desktop and mobile. Rationale: Next.js 16 framework baseline + React hydration floor makes 100ms unachievable at this bundle size without architectural changes (RSC migration, islands pattern) that are out of scope for Phase F. Current state: ~800ms median - further reduction attempted via PropertiesExplorer code split and bundle cleanup. Remaining gap is framework baseline, not addressable in Phase F. Promoted to Phase G for RSC evaluation. | Phase G |
| DEF-G-MOD-001 | Full moderation status workflow - Replace is_verified boolean with explicit moderation_status enum (pending_review, verified, rejected, revoked). Add rejection reason field, backend-driven notifications, agent inbox, moderation history, admin filters, and resubmit flow. Design backend schema first before any frontend work begins. | Phase G |

DEF-002 - Audit log retention
Deferred to Phase G. No real traffic data to size policy against.
Revisit after 60 days of production usage. Decision at that point:
rolling window (e.g. 90 days) or archive-to-cold-storage strategy.

DEF-G-AG-001 - Property card agency branding
Closed in Phase G opening pass. Production PropertyResponse now includes
agency_name from the regenerated OpenAPI contract, and property cards render it
directly without per-card agency fetches.

DEF-G-INQ-002 - Inquiry cards on agent /account/inquiries show seeker contact but no property title/link. Secondary fetch for GET /api/v1/properties/{id}/ returns 204 with no body - origin unknown (backend rules it out, frontend normalization is clean, suspected Vercel to Railway proxy layer). Needs live Network tab inspection with auth headers visible. Backend gap also exists: /received does not join property data, relying on frontend N+1 hydration from property_id.

Closed in Phase H F2. Backend `/inquiries/received/` now returns embedded
property/seeker data and the frontend inquiry directory uses that embedded
payload directly for the received-inquiries view instead of issuing property,
image, or user hydration queries.

DEF-H4-MOBILE-TBT - H.4 desktop TBT target met after deferring ReviewSection, agency stats fan-out, and location label hydration. Final Railway-backed local Lighthouse: /properties desktop 66ms TBT, /agencies desktop 177ms TBT. Mobile remains above the 300ms target on throttled Lighthouse: /properties 984ms TBT, /agencies 776ms TBT. Root cause is primarily Next/Turbopack framework/runtime boot cost in `.next/static/chunks/0lto~oj879hx..js` plus shared runtime/polyfill chunks, not remaining Zod/RHF/Sonner form code on the list routes. Phase I should evaluate deeper RSC/island boundaries or framework/runtime reduction rather than more local component splitting.

Phase H F3 final local production Lighthouse after clean server restart:
`/properties` mobile accessibility 1.00, LCP 2966ms, TBT 304ms;
`/agencies` mobile accessibility 1.00, LCP 2033ms, TBT 490ms;
`/agents` mobile accessibility 1.00, LCP 3968ms, TBT 382ms. Revised Phase I
scope: public discovery pages need deeper server-component/island work and data
payload timing reduction to consistently keep mobile LCP below 2.5s and TBT
below 300ms across all three routes.

Closed in Phase I I.6 on 2026-05-07. The shared `(main)` layout was restored
to a server component, `/account` auth gating moved to its own client layout,
and non-critical public-directory hydration was deferred past initial
interactivity. Local production Lighthouse after rebuild: `/properties` mobile
performance 97, accessibility 100, LCP 2523ms, TBT 42ms, CLS 0;
`/agencies` mobile performance 100, accessibility 100, LCP 1339ms, TBT 0ms,
CLS 0; `/agents` mobile performance 100, accessibility 100, LCP 982ms,
TBT 0ms, CLS 0.

DEF-H5-PROPERTY-TYPE-FILTER - Public listing filters can fetch the property
type catalogue through `/api/v1/property-types/`, but live Railway OpenAPI for
`GET /api/v1/properties/` does not accept a `property_type_id` query parameter.
Do not add a frontend property-type filter until the backend list endpoint
supports it; otherwise the UI would display a filter that has no effect.

Closed in Phase H F1. Backend B1 added and tested `property_type_id` on
`GET /api/v1/properties/`; frontend filters now use the property type catalogue
and persist `property_type_id` in URL search params.

DEF-I-LOC-001 - Location hierarchy seed breadth remains sparse. The frontend
cascade was wired in Phase J to the existing public location contracts rather
than keeping the old flat picker. Live Railway evidence on 2026-05-07:
`/locations/states` returns `["lagos"]`, `/locations/?limit=100` returns one
record (`lagos` / `lekki` / `phase 1`, `location_id=2`), and the city and
neighbourhood endpoints return only `lekki` and `phase 1`. The rich
Nigeria-wide/global UX is now data-seeding work against the existing PostGIS
location infrastructure. Current `GET /properties/` still filters by
`location_id`, so state/city/neighbourhood URL params are UI state until they
resolve to a concrete backend location row.

Closed in Phase J on 2026-05-08. Backend now exposes
`GET /api/v1/locations/search?q=&limit=` and property create/update accepts
`location_name`. The frontend autocomplete calls the backend search endpoint,
and listing forms submit `location_name` when no existing `location_id` is
selected. Location expansion is now dynamic through backend server-side
resolution and `get_or_create()` storage; do not add browser-direct geocoding.

H.1-EMAIL-RESEND - Closed in Phase H. Live email delivery is confirmed through
Resend, the smoke passed, and Railway `RESEND_API_KEY` propagation on
`imaginative-peace` is resolved. Temporary sender is `onboarding@resend.dev`
until the project custom domain is registered and verified.

H.1-RAILWAY-ENV - Closed in Phase H. Railway production was running with a dev
mode environment; `ENV=production` is fixed and locked for production deploys.

DEF-I-MEM-SMOKE-001 - Closed in Phase J on 2026-05-08. Production API smoke
verified Rule 2 of the membership resolution model: agent `user_id=90` retained
`user_role=agent` and `role_version=6` after one of two active memberships was
revoked. The original membership stayed active, the temporary membership became
inactive, and temporary agency `12`, owner `92`, invite `4`, and membership `7`
were soft-deleted after verification. UI-level browser smoke can be added later
when a real multi-agency account exists, but the backend membership rule is
closed with production evidence.

DEF-I-OPS-AUDIT-001 - Audit log retention remains deferred to Phase J. I.7
production evidence on 2026-05-07 shows low current volume (`/admin/stats`:
7 users, 2 properties, 4 inquiries, 3 new users in the last 7 days). There is
not enough traffic to size a retention window responsibly. Revisit after real
usage growth or 60 days of production audit volume.

DEF-I-DOMAIN-001 - Custom domain setup not started in I.7. Current documented
production frontend remains `realtornet-web.vercel.app`; backend remains
`realtornet-production.up.railway.app`; email sender remains
`onboarding@resend.dev` until a verified sender domain is registered.

DEF-I-COV-001 - Closed in Phase J on 2026-05-08. Backend commit `7e8fd35`
raised coverage to 95.03%; `pyright` returned 0 errors and full `pytest -q`
passed.

## Phase J workbook and active backlog (May 13, 2026)

The Phase J workbook is attached at repository root as `RealtorNet_Phase_J_Workbook.md` and is the current execution reference.

Active Phase J items:
- `DEF-J-EMAIL-DOMAIN-001`: real-user email delivery remains blocked until a verified Resend sender domain is configured and Railway `MAIL_FROM` is updated.
- `DEF-J-LOC-001`: location breadth/result-quality monitoring; frontend must call backend location search and must never call Nominatim directly.
- `DEF-J-FREQ-001`: saved-search notification frequency preferences; current behavior remains immediate delivery.
- `DEF-J-MSG-001`: in-app messaging / inquiry reply thread model.
- `DEF-J-AGG-001`: agency public-directory aggregation optimization after traffic data.
- `DEF-002`: audit log retention decision after enough production volume exists.

DEF-J-MAP-001 - Closed in Phase K frontend map pass on 2026-05-13
(`3c77776`). `/properties?view=map` now renders a Leaflet/OpenStreetMap map
from the same filtered property result set as the grid view. Browser smoke
against the live Railway API confirmed two mapped markers, OSM attribution,
pin popup content and listing link, `/properties?view=grid` unaffected, mobile
375px map rendering with the unmapped/sidebar section below the map, and
`bedrooms=3` filtering reduced the map to one marker from one filtered result.

DEF-J-HERO-001 - Closed in Phase K offline frontend pass on 2026-05-13.
Homepage hero no longer hotlinks Pinterest; it uses a local Tailwind gradient
fallback until a properly licensed hosted hero asset is selected.

DEF-K-AGENT-DIR-001 - Public agent directory completeness filtering currently
derives display names from `company_name` and agency names from the agencies
catalogue because live `GET /api/v1/agent-profiles/` does not yet return
`display_name` or `agency_name` on each list item. Backend should add those
fields to the directory response so the frontend can filter cards without
joining auxiliary data.

DEF-K-PROPS-AGENCY-FILTER-001 - Agency owner My Listings uses
`GET /api/v1/agencies/{agency_id}/properties` because OpenAPI for
`GET /api/v1/properties/` does not document an `agency_id` query param.
If the list endpoint gains `agency_id`, the owner listings hook can switch to
that canonical filter.

Closed in Phase K frontend Stream B commit `89f2530`. Railway OpenAPI now
documents `agency_id` on `GET /api/v1/properties/`, and agency-owner My
Listings uses the canonical `/api/v1/properties/?agency_id=` filter.

DEF-K-AGENT-DIR-001 - Public `/agents/` remains backend-blocked. Frontend
commit `89f2530` removed the agency-association completeness requirement and
requires only a valid public display name, but production
`GET /api/v1/agent-profiles/` returns blank `display_name`, blank
`company_name`, and no `agency_name` on list rows. Do not implement frontend
fallback joins, placeholder cards, or hardcoded names. Backend should expose
displayable agent identity and agency name on the agents list endpoint.

DEF-K-AGENCY-COUNTS-001 - Public `/agencies/` agency counts remain
backend-blocked. Frontend commit `89f2530` reads `agent_count` and
`property_count` from the agency list contract, but production
`GET /api/v1/agencies/` returns zero counts even when verified properties exist
for agencies. Do not implement frontend aggregation or per-card fan-out.
Backend should fix agency list aggregation for active agents and verified
properties.

DEF-K-PROPERTY-TYPE-SEED-001 - F.5 frontend wiring is complete because the
property type filter is sourced from `GET /api/v1/property-types/` and cached
as reference data, but production currently returns only `Apartment`. The
"12 property types visible" acceptance criterion is backend seed-data blocked
until production contains the missing property type rows.

DEF-L-ADMIN-AUDIT-001 - Closed in Phase L frontend pass. Added Audit Activity
section to `/account/admin/analytics` using `useAdminAudit` TanStack Query hook.
Displays `creation_count_30d` and `deletion_count_30d` via existing `MetricCard`
components, plus a table of `recent_changes` showing entity type, action,
timestamp, and actor. Section is gated to admin role only. Types regenerated
from production OpenAPI. `tsc`, `lint`, and `build` gates passed clean.

DEF-L-MOD-001 - CLOSED (2026-05-30): Backend L.2 deployed and frontend L.3
implemented. `pnpm gen:types` confirmed `agency_approved` in `ModerationStatus`
enum and agency-approve/reject endpoints. Frontend changes:
- `moderation.ts`: added `agency_approved` constant, label "Admin review",
  badge variant "warning".
- Agent dashboard: updated pending_review label to "Agency review" and added
  amber note "Awaiting agency review — your listing will be sent to admin after
  agency approval."
- Agency owner dashboard (`AgentListingsManagerClient`): added "Pending queue",
  "Sent to admin", and "All listings" tabs with Approve/Reject actions calling
  PATCH `/api/v1/properties/{id}/agency-approve` and `/agency-reject`.
- Admin moderation page (`AdminPropertiesClient`): default tab changed to
  `agency_approved`, server-side filtering via `?moderation_status=agency_approved`,
  removed `pendingReview` tab, updated labels per new moderation flow.
- New hooks: `useAgencyApproveProperty`, `useAgencyRejectProperty`.
- Quality gates: `tsc 0`, `lint 0`, `build 0`.

DEF-L-MOD-001 - Three-tier listing moderation: agent creates → agency approves
(agency roster only, not public) → admin publishes (public feed). Requires an
`agency_approved` enum state between `pending_review` and `verified`, updated
visibility filters on public feed, agency dashboard queue UI, and admin
moderation queue for agency-approved listings.

DEF-L-REVIEW-001 - CLOSED (2026-05-31): Review system role correction + agency
review backend fully wired.
- `pnpm gen:types` picked up `AgencyReviewCreate`, `AgencyReviewResponse`,
  GET `/api/v1/reviews/agency/{agency_id}`, and POST `/api/v1/reviews/agency/{agency_id}`.
- Seeker /account/reviews: "My Reviews" with Property, Agent, and Agency review tabs.
  Agency tab wired to `useMyAgencyReviews` (calls `/api/v1/reviews/by-user/agency/`).
  Note: backend endpoint for by-user agency reviews was added; if 404, the tab shows
  empty state.
- Agent /account/reviews: "Received Reviews" with "Reviews on listings" and
  "Reviews On me" tabs. Read-only.
- Agency owner /account/reviews: "Agency Reputation" with "Reviews on agency"
  (wired to `useAgencyReviews(agencyId)`), "Reviews on agents", and "Reviews on
  listings" tabs. Read-only. Placeholders removed.
- `ReviewSection.tsx` gated to hide "Leave a review" form for non-seeker roles.
- New `AgencyReviewSection` component on agency profile page (`/agencies/{id}`)
  displays agency reviews and exposes a "Leave a review" form for seekers calling
  POST `/api/v1/reviews/agency/{agency_id}`.
- `/agents/page.tsx` inspected — no routing bug found.
- Quality gates: `tsc 0`, `lint 0`, `build 0`.

DEF-L-FRONT-001 - CLOSED (2026-05-31): Phase L Frontend Dispatch — UI gaps,
moderation wiring, and site-wide polish.
- P.4 `PropertyCard.tsx`: location display now prefers `property.location_name`
  before falling back to `locationLabel` prop or raw `location_id`.
- P.2 `PropertiesExplorer.tsx`: added `min-h-[28rem]` wrapper around grid/map
  content to prevent viewport snap when toggling between views.
- H.1 `HomeHeroSearch.tsx`: Buy/Rent/Lease toggle and search bar now share equal
  width on desktop (`lg:grid-cols-2`, toggle buttons `flex-1`).
- H.3 `HomeHeroSearch.tsx`: Filters popover deduplicated — removed Property Type,
  Price, and Bedrooms from popover body (already in quick filter row). Added
  Listing Status select. Removed unused `PriceField` component and `clearKey` state.
- L3.2 `AgentListingsManagerClient.tsx`: agency owner reject action now uses
  `shadcn/ui Dialog` with a textarea reason input instead of `window.prompt`.
- AG.2 `AgentDirectoryClient.tsx`: added page hero consistent with `/agencies/`,
  client-side search input filtering by `display_name`, single-row flex layout
  for search + agency dropdown.
- AG.3 `AgentDirectoryClient.tsx`: empty state now differentiates between
  "no matching filters" and "no verified agents" with contextual messages.
- A.1 `AgencyProfileClient.tsx`: added early `Number.isNaN(numericAgencyId)`
  guard before API calls to prevent blank pages on invalid agency IDs.
- L3.4 sitewide moderation label verification: grep confirmed no raw
  `pending_review` / `agency_approved` strings in `.tsx/.ts` source outside
  generated types; all labels flow through `moderationStatusLabel` map.
- Quality gates: `tsc 0`, `lint 0`, `build 0`.
