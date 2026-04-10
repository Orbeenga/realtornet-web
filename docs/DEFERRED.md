# RealtorNet Frontend — Deferred Implementations

Logged during D.6 Integration Validation. These are known gaps and product
decisions deferred to Phase E or post-MVP. None block Phase D exit.

---

## DEF-001 — Back Navigation Stack (Journey 6–7)
**Observed:** Navigating property → agent → agency and pressing back
frog-leaps to /properties instead of reversing the chain step by step.
**Expected:** Full browser history stack maintained across the detail chain.
**Fix:** Audit router.push() calls on agent/agency link components.
Consider router.back() or href-based <Link> navigation instead of
programmatic pushes where the destination is a detail page.
**Priority:** Low — does not break any journey. UX refinement.
**Phase:** E

---

## DEF-002 — Audit Log Retention at Scale (Journey 8)
**Observed:** Every favorite/unfavorite action writes a row with deleted_at.
At millions of users this table will grow unboundedly.
**Recommended:** Implement Postgres table partitioning by created_at month.
Archive partitions older than 6 months to cold storage (S3).
Read path (WHERE deleted_at IS NULL) is index-safe and unaffected.
**Priority:** Medium — not a concern at MVP scale. Required before launch.
**Phase:** E / pre-launch

---

## DEF-003 — Agent Favouriting UX (Journey 8)
**Observed:** Agent-role users can favourite properties. No restriction exists.
**Decision:** Allow agent favouriting — agents legitimately save listings for
reference or on behalf of clients. Blocking it is an arbitrary restriction.
**Refinement:** Surface favourites with role-aware labelling in Phase E
(agents: "Saved for reference" vs seekers: "Saved homes"). Do not change
current behaviour.
**Priority:** Low — UX label only. Current behaviour is correct.
**Phase:** E

---

## DEF-004 — Agent Listing Management UI (Journey 12)
**Observed:** No frontend implementation exists for agent CRUD on own listings.
The backend endpoints are live and tested (GET/POST/PATCH/DELETE /properties/
with role-gating). The agent profile page shows "No active listings" but has
no create/edit/delete controls.
**Required pages/components:**
- /account/listings — agent's own listing dashboard
- /account/listings/new — create listing form
- /account/listings/[id]/edit — edit listing form
- Delete / mark inactive action on each listing row
- Role gate: seeker and public users cannot access these routes
**Priority:** HIGH — this is a D.6 open item. Must be built before Phase D exit.
**Phase:** D.7 (build now, before pre-deploy hardening)

---

## DEF-005 — Listing Verification / Moderation Workflow
**Observed:** Properties are created with is_verified=False. The agent
dashboard (GET /agent-profiles/{id}/properties) filters WHERE is_verified=True,
so newly created listings never appear in the agent's own dashboard.
**Required:**
- Agent dashboard should show ALL own listings regardless of is_verified,
  with a "Pending" badge on unverified ones
- Public /properties feed continues to filter is_verified=True only
- Admin moderation UI (approve/reject) is a post-MVP feature
**Priority:** HIGH — blocks agent from seeing their own listings
**Phase:** D.7
 
---
 
## DEF-006 â€” Silent JWT refresh on 401
**Observed:** Authenticated requests can intermittently return 401 when the
JWT expires mid-session. The auth flow recovers automatically, but the failed
request is not retried.
**Required:** Add silent token refresh and request retry in the API client
layer so in-flight authenticated actions recover without surfacing an error to
the user.
**Priority:** Medium â€” intermittent and self-healing, but user-visible when it
hits writes such as image deletion.
**Phase:** E
