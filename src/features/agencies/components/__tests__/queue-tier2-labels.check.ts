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

// 3b. Invitation origin: withdrawn-interest rows render the full stem;
//     unknown invitation origins fall back to the family word.
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 13, source_type: "invitation", origin: "withdrawn_interest" }),
  ) === "Reactivation of withdrawn invitation",
  "withdrawn-interest rows render the full stem",
);
assert(
  reviewQueueSourceLabel(queueRow({ id: 14, source_type: "invitation" })) === "Review",
  "unknown invitation origin falls back to Review",
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
