# RealtorNet Frontend - Deferred Implementations

Logged during D.6 integration validation and refreshed after Phase D.7 record
updates. These are the remaining deferred or blocked items after the completed
frontend work captured in this session.

---

## Resolved in D.7

## DEF-004 - Agent listing management UI
**Status:** Resolved in D.7.
**Delivered:** `/account/listings`, `/account/listings/new`,
`/account/listings/[id]/edit`, role-gated listing management actions, and the
shared account dashboard layout standard.

---

## DEF-005 - Listing verification visibility gap
**Status:** Resolved in D.7.
**Delivered:** Listing management flows now support the current agent
experience expected for Phase D, including image handling and listing edit
surfaces required to operate on owned listings.

---

## DEF-008 - Listing media and amenities management gap
**Status:** Resolved in D.7.
**Delivered:** Property image upload UI, image rendering in feed and My
Listings, amenity selection, centralized API routing, and the related form/page
standards are now in place.

---

## Still Deferred

## DEF-001 - Back navigation stack (Journey 6-7)
**Observed:** Navigating property -> agent -> agency and pressing back can jump
to `/properties` instead of reversing the chain step by step.
**Expected:** Full browser history stack maintained across the detail chain.
**Fix:** Audit router navigation for detail-page links and prefer normal link
navigation where appropriate.
**Priority:** Low.
**Phase:** E

---

## DEF-002 - Audit log retention at scale (Journey 8)
**Observed:** Every favorite/unfavorite action writes a row with `deleted_at`.
At millions of users this table will grow unboundedly.
**Recommended:** Partition by `created_at`, archive older partitions, and keep
the active read path index-safe.
**Priority:** Medium.
**Phase:** E / pre-launch

---

## DEF-003 - Agent favouriting UX (Journey 8)
**Observed:** Agent-role users can favorite properties and the current behavior
is intentionally allowed.
**Decision:** Keep the behavior and revisit role-aware labels later.
**Priority:** Low.
**Phase:** E

---

## DEF-006 - Silent JWT refresh on 401
**Observed:** Authenticated requests can intermittently return `401` when a JWT
expires mid-session. Auth eventually recovers, but the failed request is not
retried.
**Required:** Add silent token refresh and request retry in the API client so
in-flight authenticated actions recover without surfacing an avoidable error.
**Priority:** Medium.
**Phase:** E

---

## DEF-007 - Local Windows `next build` spawn EPERM blocker
**Observed:** `next build` can fail on Windows during page data collection with
`spawn EPERM`.
**Impact:** This blocks local completion of D.7.5 on affected Windows setups,
but it is not currently tracking as a frontend code defect.
**Current understanding:** CI commands remain correct and the app is otherwise
ready for typecheck, lint, and build validation outside the affected local
environment.
**Next step:** Use one of the three remediation paths documented in the session
handover to unblock local builds, then proceed with D.7.6 and D.7.7.
**Priority:** High.
**Phase:** D.7.5 unblock
