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

// 1. Tier-2 review_request origins.
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 1, source_type: "review_request", join_request_id: 9, origin_status: "rejected" }),
  ) === "Reconsideration requested",
  "rejected-origin appeal labels Reconsideration requested",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 2, source_type: "review_request", join_request_id: 9, origin_status: "expired" }),
  ) === "Reactivation requested",
  "expired-origin appeal labels Reactivation requested",
);
assert(
  reviewQueueSourceLabel(queueRow({ id: 3, source_type: "review_request" })) ===
    "Returning applicant review",
  "unlinked review rows keep the tier-1 label",
);

// 2. Tier-2 join_request origins.
assert(
  reviewQueueSourceLabel(queueRow({ id: 4, source_type: "join_request", status: "pending" })) ===
    "Reapplication",
  "pending join rows keep Reapplication",
);
assert(
  reviewQueueSourceLabel(
    queueRow({ id: 5, source_type: "join_request", status: "expired", reactivation_requested_by: 99 }),
  ) === "Reactivation requested",
  "B2 expired rows label Reactivation requested",
);

// 3. Untouched kinds.
assert(
  reviewQueueSourceLabel(queueRow({ id: 6, source_type: "membership_review_request" })) ===
    "Membership reinstatement appeal",
  "membership rows keep the tier-1 label",
);
assert(
  reviewQueueSourceLabel(queueRow({ id: 7, source_type: null })) === null,
  "unknown source yields no badge",
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
