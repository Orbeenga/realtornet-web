# RealtorNet Phase I Workbook

Communications Completion, Membership Intelligence, and Mobile Performance.
This Markdown companion mirrors the Phase I `.docx` workbook and incorporates
the Phase H close-context needed for implementation sessions.

## Preflight

| Item | Value |
|---|---|
| Phase H closed | May 2026; all exit criteria met, `DEFERRED.md` updated, `CLAUDE.md` committed to both repos |
| Backend | v0.5.3+ on Railway; 1856 tests, 94.54% coverage, 0 Pyright errors |
| Frontend | Next.js 16.2.1 on Vercel; production build clean |
| Stack | Next.js, TypeScript, Supabase, TanStack Query, FastAPI, Resend email |
| Deploy targets | Vercel frontend, Railway backend, Supabase DB/Auth |
| Production Supabase | `avkhpachzsbgmbnkfnhu`; do not mix with deprecated dev project `umhtnqxdvffpifqbdtjs` |
| Production DB head | `a6b2d9f4c801` |
| Phase I opens | May 2026 |

## Phase H Exit State

Phase I starts from a mostly closed Phase H. The only meaningful carry-forwards
are mobile performance, smoke runner cleanup, and lower-priority operational
items. Resend is the canonical email provider going forward; any older Mailgun
done-when language should be updated in `CLAUDE.md` and project docs.

| Item | State |
|---|---|
| Email infrastructure with Resend; all six Phase H email types delivered | Closed |
| Agency inquiry aggregation, `GET /agencies/{id}/inquiries/` | Closed |
| Moderation UI consistency; `is_verified` replaced with full enum handling | Closed |
| TBT reduction | Desktop closed; mobile carries into Phase I |
| UX completeness and error/empty states | Closed |
| Listing filter enums API-driven or constants-driven | Closed |
| `storage_services.py` coverage at 89% | Closed |
| `DEF-007` psycopg3 `prepare_threshold=None` validation | Closed |
| Railway `ENV=production` | Closed |
| Landing redirect fix; route-agnostic auth guard removed | Closed |
| Backend contract sweep B1-B3 | Closed |
| Frontend endpoint wiring F1-F3 | Closed |
| Smoke runner auto-teardown | Open; Phase I carry-forward |

## Governing Principle

Phase I makes RealtorNet self-aware and fully communicating. Users receive
email for every significant event. Membership dynamics govern role state in
real time. The platform knows every user's full agency history and acts on it.
Mobile performance closes the gap with desktop before the marketplace scales.

## Opening Backlog

| ID | Item | Priority | Owner |
|---|---|---|---|
| `DEF-I-EMAIL-001` | Inquiry received email notification to listing agent | High | Backend |
| `DEF-I-EMAIL-002` | Property moderation outcome email to agent | High | Backend |
| `DEF-I-EMAIL-003` | Role change email to affected user | High | Backend |
| `DEF-I-MEM-001` | Membership-driven role resolution; auto-demotion on last membership revoked | High | Backend + Frontend |
| `DEF-I-MEM-002` | Membership audit trail for every user-agency relationship | High | Backend |
| `DEF-I-MEM-003` | Contextual post-revocation dashboard | High | Frontend |
| `DEF-I-MEM-004` | Agency page CTA intelligence: Apply vs Request to Rejoin vs Pending | High | Frontend |
| `DEF-H4-MOBILE-TBT` | Mobile performance on `/properties`, `/agencies`, `/agents` | Medium | Frontend |
| `DEF-I-LOC-001` | Location hierarchy; currently flat Lagos seed data only | Medium | Backend + Frontend |
| `DEF-H-SMOKE` | Smoke runner auto-teardown in `scripts/phase_g7_production_smoke.py` | Medium | Backend |
| `DEF-I-SEARCH-001` | Saved search notifications | Medium | Backend + Frontend |
| `DEF-G-POLYFILL-001` | Residual third-party `core-js` cleanup | Low | Frontend |
| `DEF-002` | Audit log retention policy after real traffic | Low | Backend |
| `DEF-H-DOMAIN` | Custom domain setup | Low | Ops |
| `DEF-H-MAP-001` | Advanced map view | Low | Frontend |

## Membership Resolution Model

This model is the architectural centrepiece of Phase I. Read this section
before any I.3-I.5 implementation begins. It governs backend schema, role
resolution logic, JWT invalidation, and all contextual frontend surfaces.

### Core Principle

A user's effective role is not just a static field on the `users` table. It is
the computed intersection of their `user_role` enum value and their current
active membership state. The system must know this at all times and act on it
immediately when membership state changes.

### Five Rules

| Rule | Behaviour |
|---|---|
| Single active membership revoked | Agent has exactly one active membership. When it is revoked, the system atomically counts active memberships, finds zero, updates `user_role` to `seeker`, increments `role_version`, and writes a `revoked` audit record with `actor_id` and `reason`. The user next lands on a contextual post-revocation dashboard, not a blank seeker home. |
| Multiple active memberships, one revoked | Agent belongs to Agency A and Agency B. If Agency A revokes them, the system does not demote the role. Agency B context remains intact. Agency A context shows revoked status plus Request Review or Apply to Rejoin. |
| New user with no membership history | Seeker has no audit records for the agency. The UI renders a clean Apply to Join flow with no pre-filled history. |
| Returning applicant with prior membership | Prior membership exists, whether voluntary or revoked. CTA changes from Apply to Join to Request to Rejoin. The rejoin request carries tenure dates, departure type, and revocation reason when available. |
| Voluntary departure vs revocation | Audit distinguishes `left` from `revoked`. Voluntary departures get a simpler rejoin path; revocations surface the original reason prominently to the agency owner. |

### Agent Membership Audit Table

Create an append-only `agent_membership_audit` table or equivalent immutable
history layer.

| Column | Type | Purpose |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Row identifier |
| `user_id` | FK to `users` | Agent whose membership changed |
| `agency_id` | FK to `agencies` | Agency the event concerns |
| `action` | enum | `invited`, `joined`, `suspended`, `revoked`, `left`, `reinstated` |
| `actor_id` | FK to `users`, nullable for backfill | User who performed the action |
| `reason` | text nullable | Required for `revoked` and `suspended`; optional otherwise |
| `prior_role` | `user_role_enum` nullable | Role before the event |
| `post_role` | `user_role_enum` nullable | Role after the event |
| `created_at` | timestamptz default `now()` | Immutable event timestamp |

### JWT Invalidation

Supabase does not provide server-side token blacklisting natively. Phase I uses
`role_version` invalidation.

| Step | Implementation |
|---|---|
| Add `role_version` | `ALTER TABLE users ADD COLUMN role_version INTEGER NOT NULL DEFAULT 1` |
| Include in JWT claims | Supabase custom claims include `role_version` alongside `user_role` |
| Verify in middleware | Auth middleware compares JWT `role_version` with DB value |
| Increment on demotion | Last-membership revocation increments `role_version` in the same transaction as role demotion |
| Frontend on mismatch | Old JWT receives 401, silent refresh fetches current role and `role_version`, UI routes to contextual state |

### Contextual Dashboard States

| User state | Dashboard landing | CTAs |
|---|---|---|
| Active agent, all memberships intact | Normal agent dashboard | Standard agent actions |
| Agent with one of many memberships revoked | Normal agent dashboard, revoked agency flagged | Request Review, Apply to Rejoin, Dismiss |
| Demoted seeker after last membership revoked | Contextual seeker landing with agency name, reason, and date | Browse Agencies, Request Review, Apply to Join a New Agency |
| Seeker with no membership history | Standard seeker dashboard | Browse Agencies, Apply to Join |
| Seeker with prior voluntary departure | Standard seeker dashboard with history visible in profile | Request to Rejoin prior agencies |

## Streams

| Stream | Focus | Phases | Owner | Blocks? |
|---|---|---|---|---|
| A | Communications completion | I.1-I.2 | Backend | Yes |
| B | Membership intelligence and role resolution | I.3-I.5 | Backend + Frontend | Yes |
| C | Mobile performance | I.6 | Frontend | No, but required before scaling |
| D | Operational and deferred items | I.7 | Both | No, runs throughout |

Stream B depends on stable communication infrastructure. I.1 should close before
I.3 begins. Streams C and D can run in parallel once I.1 is stable.

## I.1 Inquiry And Moderation Email Notifications

Goal: agents receive email when a lead arrives, agents are notified of every
moderation outcome, and affected users are notified of every role change.

| Task | Notes |
|---|---|
| Add `inquiry_received_email` task | Fires on `POST /api/v1/inquiries/`; sends to listing agent with seeker details, message, and `/account/inquiries` link |
| Add `property_verified_email` task | Fires when `moderation_status` becomes `verified`; includes public property link |
| Add `property_rejected_email` task | Fires when `moderation_status` becomes `rejected`; includes required moderation reason and next steps |
| Add `property_revoked_email` task | Fires when `moderation_status` becomes `revoked`; includes reason and appeal/review path |
| Add `role_change_email` task | Fires on admin role changes; includes prior role, new role, and account context |
| Wire all five tasks to endpoint events | Follow existing Resend task pattern; do not add a second email provider |
| Raise coverage | Email task coverage at least 80%; mock Resend client; fail open on provider errors |

Done when: all five email types deliver in staging, Resend confirms delivery,
inquiry email arrives within 60 seconds, moderation and role-change emails send,
and email failure never blocks the primary endpoint action.

## I.2 Saved Search Notifications

Goal: seekers with saved searches receive email when matching listings are
published.

| Task | Notes |
|---|---|
| Audit saved search schema | Confirm criteria fields such as price range, bedrooms, location, and property type |
| Add match detection | Runs when a listing becomes `verified`; query saved searches in batches |
| Add `saved_search_match_email` task | Includes property thumbnail if available, title, price, and property link |
| Respect notification frequency | If preferences exist, honor them; otherwise default to immediate and defer preference UI |
| Add unsubscribe token | `unsubscribe_token UUID` on saved search rows |
| Add public unsubscribe endpoint | `GET /api/v1/saved-searches/unsubscribe/{token}/` sets `is_active = false` without requiring login |

Done when: a seeker receives email when a matching listing is verified,
unsubscribe works without login, and match detection has no N+1 query pattern.

## I.3 Membership Audit And Backend Role Resolution

Goal: the database has a complete immutable audit trail of every user-agency
relationship, and the backend atomically resolves role changes when membership
state changes.

| Task | Notes |
|---|---|
| Migration: `agent_membership_audit` | Append-only table with membership action enum and role transition fields |
| Migration: `users.role_version` | Integer, not null, default `1` |
| Supabase custom claims | Include `role_version` alongside `user_role` |
| JWT middleware | Verify token `role_version` against DB value on authenticated requests |
| Revocation endpoint | `PATCH /agencies/{id}/members/{user_id}/revoke/` counts active memberships, demotes on zero, increments `role_version`, writes audit, all in one transaction |
| Audit all membership endpoints | `invited`, `joined`, `suspended`, `left`, and `reinstated` all write audit rows |
| User history endpoint | `GET /api/v1/users/me/membership-history/`, scoped to the authenticated user's own records |
| Agency member history endpoint | `GET /api/v1/agencies/{id}/member-history/{user_id}/`, role-gated to agency owner and admin |
| Backfill | Existing active memberships get a `joined` audit record with `actor_id = NULL` |
| Gates | Pyright 0 errors and pytest passing after meaningful changes |

Done when: audit records are written on every membership event, `role_version`
is in JWT claims and verified, last-membership revocation atomically demotes to
`seeker`, and membership history endpoints return complete data.

## I.4 Contextual Post-Revocation Frontend

Goal: the frontend surfaces the correct contextual state based on full
membership history. No user sees a generic blank state when their situation has
history.

| Task | Notes |
|---|---|
| Add `useMembershipHistory()` | TanStack Query hook for `GET /api/v1/users/me/membership-history/` |
| Build `PostRevocationDashboard` | Renders for seeker role plus revoked membership history; shows agency name, reason, date, and CTAs |
| Update dashboard routing | If prior session was agent and refreshed role is seeker, render contextual state rather than silently redirecting |
| Agency page CTA intelligence | Render Apply to Join, Request to Rejoin, Rejoin Request Pending, or Active Member from auth + history |
| Membership History tab | Read-only account tab showing agency relationships, statuses, tenure dates, and reasons |
| Agency owner review context | Returning applicants show prior membership dates, departure type, and revocation reason |
| No wrong CTA flash | Unauthenticated users see Apply to Join; authenticated users with history see contextual CTA after auth state resolves |

Done when: a demoted agent lands on agency-specific post-revocation UI, agency
CTA states are correct for all scenarios, membership history renders in account,
and review queue cards surface returning applicant history.

## I.5 Multi-Agency Revocation And Review Flow

Goal: agents with multiple active memberships retain valid agency contexts when
one membership is revoked, and review/rejoin works end to end.

| Task | Notes |
|---|---|
| Add review request create endpoint | `POST /api/v1/agencies/{id}/review-requests/`; any authenticated user |
| Add review request list endpoint | `GET /api/v1/agencies/{id}/review-requests/`; agency owner and admin; includes membership history |
| Add accept endpoint | Accepting creates active membership, writes `reinstated`, sends role-change email if demotion reverses |
| Add decline endpoint | Declining updates status and emails the requestor with optional reason |
| Frontend review tab | Agency owner dashboard tab with pending count, history context, Accept and Decline |
| Request Review action | Post-revocation dashboard submits review request, confirms pending state, prevents duplicates |
| Multi-agency integration test | Agency A revokes, Agency B remains intact, role remains `agent`, Agency A shows revoked context only |

Done when: one revoked membership does not demote a multi-agency agent, a
single-agency demoted agent can request review, agency owner can accept or
decline with full context, and duplicate review requests are impossible.

## I.6 Mobile Performance

Goal: mobile TBT below 300ms on `/properties`, `/agencies`, and `/agents`, with
mobile LCP consistently below 2.5s where practical.

Context correction from Phase H: the workbook listed `2966ms`, `2033ms`, and
`3968ms` as TBT, but final deferred evidence labels those as mobile LCP values.
The final local production Lighthouse numbers were:

| Route | Mobile LCP | Mobile TBT |
|---|---:|---:|
| `/properties` | 2966ms | 304ms |
| `/agencies` | 2033ms | 490ms |
| `/agents` | 3968ms | 382ms |

| Task | Notes |
|---|---|
| Capture traces first | Run Chrome DevTools Performance traces for all three routes; attribute long tasks to modules |
| Evaluate RSC boundaries | Move data-fetch-only listing/directory components to React Server Components where compatible with the current Next.js docs |
| Dynamic import form-only libraries | Keep Zod and React Hook Form off non-form route critical paths where feasible |
| Analyze large chunks | Run `NEXT_ANALYZE=true pnpm build`; inspect large shared chunks and lazy-load heavy modules |
| Eliminate residual `core-js` | Identify third-party deps causing polyfills and decide replacement/configuration |
| Test incrementally | Rerun Lighthouse mobile after each meaningful change and record before/after |

Important: this repo uses a Next.js version with breaking changes. Before any
Next.js implementation work, read the relevant guide in
`node_modules/next/dist/docs/`.

Done when: mobile TBT is below 300ms on all three routes, before/after scores
are recorded, critical-path bundles contain no unexpected heavy modules, and
any remaining unreachable target is documented with evidence for Phase J.

## I.7 Operational And Deferred Items

Goal: close the remaining operational items carried from Phase H.

| Task | Notes |
|---|---|
| Smoke runner auto-teardown | Add cleanup to `scripts/phase_g7_production_smoke.py`; all created smoke records are soft-deleted automatically |
| Audit retention decision | Use traffic evidence; implement age-based cleanup if warranted, otherwise document Phase J decision |
| Location hierarchy assessment | Decide whether flat Lagos seed data is enough or whether Nominatim/structured hierarchy starts now |
| Custom domain setup | Configure Vercel/Railway/CORS/`NEXT_PUBLIC_API_URL` if pursued; document in `CLAUDE.md` |
| Update all `CLAUDE.md` files | Root, frontend, backend reflect Phase I state and any new routes/contracts |

Done when: smoke cleanup is automatic, audit retention decision has evidence,
location hierarchy has a recommendation, domain state is documented, and
`CLAUDE.md` files are current.

## Exit Criteria

| Exit criterion | Verification | Stream |
|---|---|---|
| Inquiry received email delivered within 60 seconds | Submit inquiry and check agent inbox | A |
| Property moderation outcome emails for verified/rejected/revoked | Admin changes status and agent receives email | A |
| Role change email to affected user | Promote, demote, deactivate test user | A |
| Saved search match email | Verify matching listing and receive seeker email | A |
| Unsubscribe works without login | Token URL deactivates saved search | A |
| `agent_membership_audit` records all membership events | SQL confirms rows for invited/joined/revoked/left flows | B |
| `role_version` in JWT and middleware | Increment DB value; old JWT returns 401 | B |
| Last-membership revocation demotes atomically | `user_role = seeker`, `role_version` incremented, audit row written in one transaction | B |
| Multi-agency revocation does not demote agent | Two memberships, revoke one, remaining agency context intact | B |
| `PostRevocationDashboard` renders with agency-specific context | Demoted agent sees agency name, reason, and CTAs | B |
| Agency page CTA states correct | Apply, Request to Rejoin, Pending, Active scenarios verified | B |
| Membership History tab complete | All membership events visible in `/account` | B |
| Agency owner review queue surfaces prior history | Returning applicant card includes previous membership context | B |
| Review request accept/decline works | Accept reinstates, decline notifies | B |
| Mobile TBT below 300ms on three public routes | Lighthouse mobile reports recorded | C |
| Smoke runner auto-teardown confirmed | Smoke run leaves no manual cleanup | D |
| Frontend type gate | `pnpm tsc --noEmit` returns 0 errors | B/C |
| Backend type gate | Pyright returns 0 errors | A/B |
| Backend tests and coverage | Pytest passes with coverage at least 95% | A/B |
| Frontend build | `pnpm build` succeeds | C |
| `DEFERRED.md` updated | Phase I items closed or promoted to Phase J | All |
| All `CLAUDE.md` files committed | Root, frontend, backend Phase I close state | All |

## Execution Sequence

| # | Phase | Dependency | Parallel? | Stream |
|---|---|---|---|---|
| 1 | I.1 Inquiry and moderation emails | None | No | A |
| 2 | I.2 Saved search notifications | I.1 Resend pattern stable | Yes, with I.3 | A |
| 3 | I.3 Membership audit and role resolution | I.1 closed | No | B |
| 4 | I.4 Contextual frontend | I.3 closed | Yes, with I.5 | B |
| 5 | I.5 Multi-agency revocation and review | I.3 closed | Yes, with I.4 | B |
| 6 | I.6 Mobile performance | I.1 closed | Yes, with I.4/I.5 | C |
| 7 | I.7 Operational items | Runs throughout | Yes | D |
| 8 | Exit sweep | I.1-I.7 closed | No | All |

## Deferred To Phase J

| Item | Rationale |
|---|---|
| Advanced map view | Leaflet/OSM is enough for Lagos MVP until users report map quality friction |
| Nominatim/OSM geocoding | Phase I assesses need; full implementation waits for validated traffic need |
| Agency owner self-service onboarding | Requires abuse prevention, email verification, and duplicate organization detection |
| TBT below 100ms | Requires broader RSC/island migration after traffic validates investment |
| Advanced admin analytics | Needs real traffic data for meaningful cohort and retention metrics |
| Agency public directory aggregation optimization | Defer until traffic sizes the N+1/stat aggregation problem |
| Notification frequency preference UI | Saved search emails default to immediate in Phase I |
| In-app messaging/inquiry reply | Requires a separate thread model beyond lead capture |
| Audit log retention | Implement in I.7 only if volume warrants; otherwise Phase J with evidence |

## Session Opening Template

Use this as the opening prompt for Phase I implementation sessions, replacing
`[I.X]` and `[SPECIFIC TASK]`.

```text
Continuing RealtorNet Phase I from [I.X]. Phase H closed May 2026. Backend
v0.5.3+ on Railway (realtornet-production.up.railway.app), pytest 1856,
coverage 94.54%, pyright 0. Frontend Next.js 16.2.1 on Vercel
(realtornet-web.vercel.app), tsc 0, lint clean, build clean. Production
Supabase: avkhpachzsbgmbnkfnhu. DB head: a6b2d9f4c801. Four roles live:
seeker / agent / agency_owner / admin. Moderation enum: pending_review /
verified / rejected / revoked. Resend email is live. Redis-backed rate limiting
is live.

Governing model: Membership-driven role resolution is the centrepiece of Phase
I. A user's effective role is computed from current active membership state and
the system acts on membership changes immediately. Read Section 2 of the Phase I
workbook before any I.3-I.5 work begins.

Today's task: [SPECIFIC TASK FROM WORK PLAN]. Attach Phase I workbook,
DEFERRED.md, and all three CLAUDE.md files.
```

## Production Reference

| Service | URL / Reference |
|---|---|
| Frontend | `https://realtornet-web.vercel.app` |
| Backend | `https://realtornet-production.up.railway.app` |
| Supabase production | `https://avkhpachzsbgmbnkfnhu.supabase.co` |
| Supabase dev, deprecated | `umhtnqxdvffpifqbdtjs`; do not use for production diagnostics |
| Email service | Resend; live message ID `c781de39-42d6-4a58-9ec3-4a774f8f53c3` |

## Production Accounts

| user_id | Email | Role | Agency |
|---:|---|---|---|
| 5 | `apineorbeenga@gmail.com` | admin | NULL |
| 74 | `apineorbeenga@outlook.com` | agent | 1 |
| 76 | `apineorbeenga@yahoo.com` | seeker | NULL |
| 85 | `godwinemagun@gmail.com` | seeker | NULL |

RealtorNet Phase I Workbook v1.0. Derived from Phase H close state, backend
v0.5.3+, and frontend Next.js 16.2.1.
