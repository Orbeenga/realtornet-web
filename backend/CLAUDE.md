# RealtorNet - Backend Claude Context

## Entry State

Phase I is closed as of 2026-05-07 and Phase J is open. Backend production runs on Railway at
`realtornet-production.up.railway.app`; Railway service `imaginative-peace` must
run with `ENV=production`.

Phase I backend I.1, I.2, I.3, and I.5 are production-confirmed by handoff.
Frontend I.4/I.5 is closed in `2d8b0fb`; single-agency revocation/review smoke
passed. Phase I closeout is pushed in `8e74e18`, with agency-owner session
persistence fixed and live in `c83e800`.

Phase J opens with `DEF-I-MEM-SMOKE-001` and `DEF-I-COV-001`. Multi-agency
revocation smoke remains tracked until a deliberate two-agency test account can
be provisioned. Backend coverage is recorded at 94.15% against the Phase I 95%
exit target and needs focused backend tests in Phase J.

## Email Contract

- Provider: Resend.
- Temporary sender: `onboarding@resend.dev`.
- Future sender: switch to the project custom domain after registration and
  domain verification.
- Required Railway variable: `RESEND_API_KEY` in `imaginative-peace` Variables.
- H.1 status: closed. Resend delivery was confirmed and the live smoke passed.

## Database And Migrations

- Current migration head: `a6b2d9f4c801`.
- Never ship code that depends on a migration until that migration has been
  confirmed against the production database.

## Phase H Backend Changes

- Legacy membership aliases removed.
- `GET /api/v1/properties/` supports `property_type_id`.
- Agency-owner safe `PUT /api/v1/agencies/{agency_id}` is open for own-agency
  public profile fields only; status and owner-control fields remain admin-only.
- Agent directory filters support `agency_id` and `location_id`.
- Email infrastructure uses Resend and production Railway variables.
- Railway `ENV=production` is fixed and locked.
- Location free-text resolution is backend-owned. Browser clients call
  `GET /api/v1/locations/search?q=&limit=` or submit `location_name` on
  property create/update; backend performs any Nominatim lookup server-side and
  stores canonical rows through the existing location persistence layer.

## Latest Backend Quality Gate

- `pyright`: 0 errors.
- `pytest`: 1856 passed.
- Coverage: 94.54%.
- I.7 operational evidence on 2026-05-07: `/admin/stats` returned 7 users,
  2 properties, and 4 inquiries, so audit retention remains evidence-deferred
  rather than implemented without traffic volume.

## Locked Contracts

- Backend remains source of truth for roles, permissions, property moderation,
  agency membership state, email dispatch, and location references.
- Nominatim or other geocoding providers must not be called directly from the
  frontend browser.
- Public signup creates seeker behavior only; agent, agency owner, and admin
  roles remain backend-authoritative.
- Admin-only lifecycle fields must not be opened to agency owners or agents.
- Use generated OpenAPI types on the frontend after every backend schema change.

## Phase K Stream B — Deployment and Data Findings (2026-05-24)

### Deployment Propagation Issue

Vercel deployment of commit `89f2530` is not fully propagated. Homepage is current, but `/properties/`, `/agencies/`, and `/agents/` still run `efbca07`. Blocks validation of B.1, B.3, and related changes. **Confirm full propagation before accepting Phase K Stream B.**

### Agency Listing Count Issue

All agencies show "0 listings" including agencies with live properties (e.g., Apine with property 6). Related to deployment propagation (B.3 fix in `89f2530` hasn't reached `/agencies/` yet). Once deployment propagates, verify that `property_count` on agency responses matches the canonical query: verified listings only, not deleted rows.

## Phase L — Deferred: Three-Tier Listing Moderation (`DEF-L-MOD-001`)

### Rationale

Current flow: Agent creates → `pending_review` → Admin verifies → public immediately.

Proposed flow (industry-standard for trust-layered marketplaces):
- Agent creates listing → `pending_review`
- Agency owner approves → `agency_approved` (agency roster only, not public)
- Admin reviews agency-approved pool → publishes to `verified` (public feed)

This scales better (admin not overwhelmed by raw agent submissions) and enables institutional accountability (agencies screen their own inventory first). Admin becomes a final gatekeeper, not a first-line reviewer.

### Technical Requirements

**New moderation state:** Add `agency_approved` to the enum. Current enum is `pending_review / verified / rejected / revoked`. `agency_approved` sits between `pending_review` and `verified`.

**Visibility rules:**
- `pending_review`: agency owner can see only their own (in private agency dashboard queue)
- `agency_approved`: visible only in the agency's roster dashboard, excluded from public `/properties/` feed
- `verified`: public `/properties/` feed
- `rejected` / `revoked`: hidden from public and agency views

**New surfaces:**
- Agency owner sees queue of their own `pending_review` listings to approve/reject
- Admin sees separate queue of `agency_approved` listings to promote to `verified` or reject
- Both queues paginated and filterable

### Implementation Scope

- Migration: add `agency_approved` to enum
- Visibility filters: public `/properties/` excludes `pending_review` and `agency_approved` (verified only)
- Agency roster filters: include `pending_review` and `agency_approved` for owner visibility
- Admin queue: new endpoint or filter to show `agency_approved` listings across all agencies
- Agency owner action: approve/reject endpoint on listing (sets state, optional reason)
- Admin action: promote to verified or reject from `agency_approved` state
- Frontend: agency dashboard listing queue, admin moderation redesign with separate tabs or queues
