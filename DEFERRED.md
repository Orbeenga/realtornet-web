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
