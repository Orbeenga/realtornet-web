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
- Public signup creates seeker behavior only; agent, agency owner, and admin
  roles remain backend-authoritative.
- Admin-only lifecycle fields must not be opened to agency owners or agents.
- Use generated OpenAPI types on the frontend after every backend schema change.
