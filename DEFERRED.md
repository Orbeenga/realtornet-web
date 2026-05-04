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

DEF-H5-PROPERTY-TYPE-FILTER - Public listing filters can fetch the property
type catalogue through `/api/v1/property-types/`, but live Railway OpenAPI for
`GET /api/v1/properties/` does not accept a `property_type_id` query parameter.
Do not add a frontend property-type filter until the backend list endpoint
supports it; otherwise the UI would display a filter that has no effect.

Closed in Phase H F1. Backend B1 added and tested `property_type_id` on
`GET /api/v1/properties/`; frontend filters now use the property type catalogue
and persist `property_type_id` in URL search params.

DEF-I-LOC-001 - Hierarchical location filter awaiting structured location data.
Phase H F3 live Railway check on `/api/v1/locations/states` returned a flat
string list with only `lagos`, not structured state/city/neighborhood records.
Keep the existing flat `location_id` picker until the backend provides real
hierarchical data from `/locations/states`, `/locations/cities`, and
`/locations/neighborhoods`.
