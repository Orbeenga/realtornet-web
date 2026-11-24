/**
 * Review-queue tier-2 label + B2 actionability checks: origin-precision
 * badges derived client-side from source_type + linkage/status, and the
 * actionable-row predicate admitting B2 expired rows to decisions.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/queue-tier2-labels.check.ts
 */
import type { AgencyReviewRequestResponse } from "@/types";
import {
  groupAgencyReviewRequests,
  isQueueActionableRequest,
  queueRowActionableAt,
  resolveReviewQueuePresentation,
  reviewQueueEventLine,
  reviewQueueNarrativeEvent,
  reviewQueueSourceLabel,
} from "../AgencyMembersClient";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function queueRow(
  partial: Partial<AgencyReviewRequestResponse> & { id: number },
): AgencyReviewRequestResponse {
  return {
    user_id: 7,
    agency_id: 42,
    status: "pending",
    created_at: "2026-09-06T10:00:00Z",
    updated_at: "2026-09-06T10:00:00Z",
    ...partial,
  } as AgencyReviewRequestResponse;
}

// 1. One-word review_request origins (lead sign-off 2026-11-19).
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 1, source_type: "review_request", join_request_id: 9, origin_status: "rejected" }),
  ) === "Reconsideration",
  "rejected-origin appeal labels Reconsideration",
);
assert(
  JSON.stringify(
    resolveReviewQueuePresentation(
      queueRow({ id: 28, source_type: "invitation", origin: "withdrawn_interest" }),
    ),
  ) === JSON.stringify({ label: "Interest", narrativeEvent: "Interest expressed" }),
  "shared resolver returns the complete withdrawn-interest presentation",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 2, source_type: "review_request", join_request_id: 9, origin_status: "expired" }),
  ) === "Reactivation",
  "expired-origin appeal labels Reactivation",
);
assert(
  reviewQueueSourceLabel(queueRow({ id: 3, source_type: "review_request" })) === "Review",
  "unlinked review rows fall back to Review",
);

// 2. Join split rule: reactivation_requested_by wins over reapplied_from.
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 4, source_type: "join_request", status: "pending", reactivation_requested_by: 3, reapplied_from_request_id: 68 }),
  ) === "Reactivation",
  "requested_by set means Reactivation even with a reapply parent",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 5, source_type: "join_request", status: "expired", reactivation_requested_by: 7 }),
  ) === "Reactivation",
  "B2 expired rows label Reactivation",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 6, source_type: "join_request", status: "pending", reapplied_from_request_id: 68 }),
  ) === "Reapplication",
  "reapply-only rows label Reapplication",
);

// 3. Membership split by served prior status; blocked has no badge.
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 7, source_type: "membership_review_request", prior_membership_status: "revoked" }),
  ) === "Review",
  "revoked-origin appeal labels Review",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 8, source_type: "membership_review_request", prior_membership_status: "suspended" }),
  ) === "Reinstatement",
  "suspended-origin appeal labels Reinstatement",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 9, source_type: "membership_review_request", prior_membership_status: "left" }),
  ) === "Return",
  "voluntary-leave appeal labels Return",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 10, source_type: "membership_review_request", prior_membership_status: "blocked" }),
  ) === null,
  "blocked origin yields no badge (no return path)",
);
assert(
  reviewQueueSourceLabel(queueRow({ id: 11, source_type: "membership_review_request" })) ===
    "Reinstatement",
  "unknown prior status falls back to Reinstatement",
);
assert(
  reviewQueueSourceLabel(queueRow({ id: 12, source_type: null })) === null,
  "unknown source yields no badge",
);

// 3b. Invitation origins render one-word labels; the narrative event
//     beside them carries the lifecycle wording. Unknown invitation
//     origins fall back to the family word.
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 13, source_type: "invitation", origin: "withdrawn_interest" }),
  ) === "Interest",
  "withdrawn-interest rows render Interest",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 14, source_type: "invitation", origin: "reactivation" }),
  ) === "Reactivation",
  "invitation reactivation rows render Reactivation",
);
assert(
  reviewQueueSourceLabel(queueRow({ id: 21, source_type: "invitation" })) === "Review",
  "unknown invitation origin falls back to Review",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 22, source_type: "invitation", origin: "withdrawn_interest" }),
  ) === "Interest expressed",
  "withdrawn-interest event is Interest expressed",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 23, source_type: "invitation", origin: "reactivation" }),
  ) === "Invitation reactivation requested",
  "invitation reactivation event names the lifecycle",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 24, source_type: "join_request", reactivation_requested_by: 7 }),
  ) === "Application reactivation requested",
  "application reactivation event names the lifecycle",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 25, source_type: "review_request", origin_status: "rejected" }),
  ) === "Reconsideration requested",
  "rejected-origin appeal event is Reconsideration requested",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 26, source_type: "review_request", origin_status: "expired" }),
  ) === "Application reactivation requested",
  "expired-origin appeal shares the application event",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 39, source_type: "review_request", origin_status: null }),
  ) === "Review requested",
  "unknown review origin falls back to Review requested",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 29, source_type: "join_request", reapplied_from_request_id: 3 }),
  ) === "Reapplication submitted",
  "reapplication event is Reapplication submitted",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 30, source_type: "membership_review_request", prior_membership_status: "suspended" }),
  ) === "Reinstatement requested",
  "suspended appeal event is Reinstatement requested",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 31, source_type: "membership_review_request", prior_membership_status: "left" }),
  ) === "Return requested",
  "left appeal event is Return requested",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 32, source_type: "membership_review_request", prior_membership_status: "revoked" }),
  ) === "Review requested",
  "revoked appeal event is Review requested",
);
assert(
  reviewQueueNarrativeEvent(
    queueRow({ id: 33, source_type: "membership_review_request", prior_membership_status: "blocked" }),
  ) === null,
  "blocked origin renders no event (matches null badge)",
);
assert(
  reviewQueueNarrativeEvent(queueRow({ id: 34, source_type: null })) === null,
  "unknown source renders no event (matches null badge)",
);
assert(
  reviewQueueNarrativeEvent(queueRow({ id: 40, source_type: "invitation" })) ===
    "Review requested",
  "unknown invitation origin falls back to Review requested",
);
assert(
  reviewQueueNarrativeEvent(queueRow({ id: 41, source_type: "membership_review_request" })) ===
    "Reinstatement requested",
  "unknown prior status falls back to Reinstatement requested",
);

// 3d. Merged event lines: one self-explanatory "{narrative} {date}" row.
// Dates render through the card's short-date format; expected values use
// the identical formatter so the pin holds in any timezone.
function expectedCardDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
assert(
  reviewQueueEventLine(
    queueRow({
      id: 35,
      source_type: "invitation",
      origin: "withdrawn_interest",
      interest_expressed_at: "2026-11-18T12:00:00Z",
    }),
  ) === `Interest expressed ${expectedCardDate("2026-11-18T12:00:00Z")}`,
  "actionable rows merge event and date in one line",
);
assert(
  reviewQueueEventLine(
    queueRow({
      id: 36,
      source_type: "membership_review_request",
      prior_membership_status: "blocked",
      status: "pending",
    }),
  ) === `Requested ${expectedCardDate("2026-09-06T10:00:00Z")}`,
  "null-event actionable rows keep the legacy Requested line",
);
assert(
  reviewQueueEventLine(
    queueRow({ id: 37, source_type: "join_request", status: "accepted" }),
  ) === `Accepted ${expectedCardDate("2026-09-06T10:00:00Z")}`,
  "decided rows keep the decision line",
);
assert(
  reviewQueueEventLine(
    queueRow({ id: 38, source_type: "review_request", origin_status: "rejected", status: "declined" }),
  ) === `Declined ${expectedCardDate("2026-09-06T10:00:00Z")}`,
  "declined rows keep the decision line",
);

// 3c. Invitation rows are actionable at the interest moment, not the send.
assert(
  queueRowActionableAt(
    queueRow({
      id: 15,
      source_type: "invitation",
      created_at: "2026-08-01T10:00:00Z",
      interest_expressed_at: "2026-11-20T10:00:00Z",
    }),
  ) === "2026-11-20T10:00:00Z",
  "invitation rows date at interest_expressed_at",
);
assert(
  queueRowActionableAt(
    queueRow({ id: 16, source_type: "invitation", interest_expressed_at: null }),
  ) === "2026-09-06T10:00:00Z",
  "invitation rows without interest fall back to created_at",
);
assert(
  queueRowActionableAt(queueRow({ id: 17, source_type: "join_request" })) ===
    "2026-09-06T10:00:00Z",
  "non-invitation rows keep created_at",
);
assert(
  queueRowActionableAt(
    queueRow({
      id: 27,
      source_type: "invitation",
      origin: "reactivation",
      created_at: "2026-08-01T10:00:00Z",
      reactivation_requested_at: "2026-11-21T10:00:00Z",
    }),
  ) === "2026-11-21T10:00:00Z",
  "invitation reactivation rows date at the request moment",
);

// 4. B2 actionability: pending as before; expired join rows only with a
//    recorded requester (agency-requested pre-consent rows never qualify
//    without one, and other sources never qualify expired).
assert(
  isQueueActionableRequest(queueRow({ id: 10, source_type: "join_request", status: "pending" })) === true,
  "pending join rows stay actionable",
);
assert(
  isQueueActionableRequest(
    queueRow({ id: 11, source_type: "join_request", status: "expired", reactivation_requested_by: 7 }),
  ) === true,
  "B2 expired requested rows are actionable",
);
assert(
  isQueueActionableRequest(
    queueRow({ id: 12, source_type: "join_request", status: "expired", reactivation_requested_by: null }),
  ) === false,
  "expired rows without a requester stay non-actionable",
);
assert(
  isQueueActionableRequest(queueRow({ id: 13, source_type: "join_request", status: "accepted" })) === false,
  "resolved rows stay non-actionable",
);
assert(
  isQueueActionableRequest(queueRow({ id: 14, source_type: "review_request", status: "pending" })) === true,
  "pending review rows stay actionable",
);

// 5. Grouper admits B2 rows to cards; resolved rows stay excluded (Rule 21
//    staleness defense at the grouping layer, not just the card layer).
const grouped = groupAgencyReviewRequests([
  queueRow({ id: 20, user_id: 7, source_type: "join_request", status: "expired", reactivation_requested_by: 7 }),
  queueRow({ id: 21, user_id: 7, source_type: "join_request", status: "accepted" }),
  queueRow({ id: 22, user_id: 8, source_type: "join_request", status: "pending" }),
]);
assert(grouped.length === 2, `grouper keeps B2 groups, got ${grouped.length} groups`);
assert(
  grouped.find((g) => g.userId === 7)?.requests.length === 1 &&
    grouped.find((g) => g.userId === 7)?.requests[0]?.id === 20,
  "B2 expired rows group; resolved rows excluded",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll queue tier-2 label checks passed.");
