/**
 * F4 Rejected-rebuild checks: the canonical reconsideration-appeal matcher
 * (§2.3 agency ambient record — latest linked review_request row per card).
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/rejected-reconsideration.check.ts
 */
import {
  findLatestReconsiderationReview,
  resolveReconsiderationPendingNotice,
} from "@/lib/membership-lifecycle-messages";
import type { MyAgencyJoinRequestResponse } from "@/types";
import { groupMyJoinRequestCycles } from "../membershipHistory";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

interface ReviewRow {
  id: number;
  source_type?: string | null;
  join_request_id?: number | null;
  message?: string | null;
}

// 1. Empty queue: no ambient.
assert(
  findLatestReconsiderationReview([], [7]) === undefined,
  "empty queue yields no reconsideration record",
);

// 2. Wrong source table rows never match (merged-queue discriminator).
assert(
  findLatestReconsiderationReview(
    [{ id: 1, source_type: "join_request", join_request_id: 7, message: "Reapply" }],
    [7],
  ) === undefined,
  "join_request rows are ignored (source discriminator)",
);
assert(
  findLatestReconsiderationReview(
    [{ id: 2, source_type: "membership_review_request", join_request_id: 7, message: "Appeal" }],
    [7],
  ) === undefined,
  "membership_review_request rows are ignored (source discriminator)",
);

// 3. Origin linkage: null or foreign join_request_id never matches.
assert(
  findLatestReconsiderationReview(
    [{ id: 3, source_type: "review_request", join_request_id: null, message: "No link" }],
    [7],
  ) === undefined,
  "unlinked review rows are ignored (null join_request_id)",
);
assert(
  findLatestReconsiderationReview(
    [{ id: 4, source_type: "review_request", join_request_id: 99, message: "Foreign" }],
    [7],
  ) === undefined,
  "review rows for other requests are ignored (foreign join_request_id)",
);

// 4. Linked row matches, with its message intact for the ambient record.
const linked: ReviewRow[] = [
  { id: 5, source_type: "review_request", join_request_id: 7, message: "Please reconsider" },
];
const found = findLatestReconsiderationReview(linked, [7, 8]);
assert(found?.id === 5, "linked review row matches its card");
assert(found?.message === "Please reconsider", "requester message rides through for the ambient");

// 5. Latest by id wins when several appeals exist for the card.
const multi: ReviewRow[] = [
  { id: 6, source_type: "review_request", join_request_id: 7, message: "First" },
  { id: 9, source_type: "review_request", join_request_id: 8, message: "Second" },
  { id: 7, source_type: "review_request", join_request_id: 7, message: "Third" },
];
assert(
  findLatestReconsiderationReview(multi, [7, 8])?.id === 9,
  "latest appeal by id wins across the card's requests",
);

// 6. Accepts a Set as well as an array.
assert(
  findLatestReconsiderationReview(linked, new Set([7]))?.id === 5,
  "matcher accepts a ReadonlySet of ids",
);

// 7. Seeker "rejected" anchor: only agencies with rejected rows admit a
//    group, and group.requests holds ONLY rejected rows (live rows in the
//    same agency never leak into Rejected sections or the payload).
function seekerRequest(
  partial: Partial<MyAgencyJoinRequestResponse> & { join_request_id: number },
): MyAgencyJoinRequestResponse {
  return {
    agency_id: 42,
    agency_name: "Staging Test Agency",
    is_verified: false,
    status: "rejected",
    submitted_at: "2026-09-01T10:00:00Z",
    ...partial,
  };
}
const rejectedGroups = groupMyJoinRequestCycles(
  [
    seekerRequest({ join_request_id: 61, agency_id: 2, agency_name: "Beta", submitted_at: "2026-09-03T10:00:00Z" }),
    seekerRequest({ join_request_id: 62, agency_id: 2, agency_name: "Beta", status: "pending", submitted_at: "2026-09-04T10:00:00Z" }),
    seekerRequest({ join_request_id: 63, agency_id: 1, agency_name: "Alpha", status: "approved", submitted_at: "2026-09-01T10:00:00Z" }),
    seekerRequest({ join_request_id: 64, agency_id: 3, agency_name: "Gamma", submitted_at: "2026-09-02T10:00:00Z" }),
  ],
  "rejected",
);
assert(rejectedGroups.length === 2, `rejected anchor admits only rejected agencies, got ${rejectedGroups.length} groups`);
assert(
  rejectedGroups.map((g) => g.agencyName).join(",") === "Beta,Gamma",
  "rejected groups sort alphabetically by agency name",
);
assert(
  rejectedGroups[0]?.requests.length === 1 && rejectedGroups[0]?.requests[0]?.join_request_id === 61,
  "rejected group.requests holds ONLY rejected rows (live pending row excluded)",
);
assert(
  rejectedGroups[0]?.rejectedRequests.length === 1 && rejectedGroups[0]?.cancelledRequests.length === 0,
  "rejected/cancelled subsets stay consistent",
);

// 8. Other anchors unaffected by the new subset field.
const stillCancelled = groupMyJoinRequestCycles(
  [seekerRequest({ join_request_id: 71, status: "cancelled" })],
  "cancelled",
);
assert(
  stillCancelled.length === 1 && stillCancelled[0]?.rejectedRequests.length === 0,
  "cancelled anchor still groups by live status with empty rejected subset",
);

// 9. Agency New-marker notice copy: exact text, caution tone.
const notice = resolveReconsiderationPendingNotice({ seekerName: "Seeker Alpha" });
assert(
  notice.text === "Seeker Alpha requested reconsideration of their rejected application. Respond to it in Review Requests.",
  "reconsideration notice copy is exact",
);
assert(notice.tone === "caution", "reconsideration notice uses caution tone");
assert(
  resolveReconsiderationPendingNotice({}).text.startsWith("This seeker requested reconsideration"),
  "reconsideration notice falls back without a name",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll rejected-reconsideration checks passed.");
