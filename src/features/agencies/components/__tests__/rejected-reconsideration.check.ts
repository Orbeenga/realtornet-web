/**
 * F4 Rejected-rebuild checks: the canonical reconsideration-appeal filter
 * (real history rows into Rejected cards, Revoked mechanism), the seeker
 * rejected grouper anchor, and the agency New-marker notice copy.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/rejected-reconsideration.check.ts
 */
import { resolveReconsiderationPendingNotice } from "@/lib/membership-lifecycle-messages";
import type { MembershipTimelineEntry, MyAgencyJoinRequestResponse } from "@/types";
import {
  getRejectedAppealHistory,
  getRevokedMembershipHistory,
  groupMyJoinRequestCycles,
} from "../membershipHistory";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function historyEntry(
  partial: Partial<MembershipTimelineEntry> & { id: number },
): MembershipTimelineEntry {
  return {
    source_type: "review_request",
    author_role: "seeker",
    timestamp: "2026-09-06T10:00:00Z",
    user_id: 7,
    agency_id: 42,
    ...partial,
  } as MembershipTimelineEntry;
}

// 1. Matches linked reconsideration rows by user + agency; everything else
//    excluded (other entities, non-review sources, unlinked rows).
const appeals = getRejectedAppealHistory(
  [
    historyEntry({ id: 1, join_request_id: 9, review_message: "Please reconsider" }),
    historyEntry({ id: 2, user_id: 8, join_request_id: 9, review_message: "Other user" }),
    historyEntry({ id: 3, agency_id: 43, join_request_id: 9, review_message: "Other agency" }),
    historyEntry({ id: 4, source_type: "audit_event", action: "note", review_message: null }),
    historyEntry({ id: 5, review_message: "Unlinked appeal" }),
  ],
  { user_id: 7, agency_id: 42 },
  true,
);
assert(appeals.length === 1 && appeals[0]?.id === 1, "filter matches linked user+agency reconsiderations only");

// 2. Membership appeals (no linkage) stay out of Rejected cards.
const membership = getRejectedAppealHistory(
  [historyEntry({ id: 6, review_message: null, reason: "I believe this was a mistake" })],
  { user_id: 7, agency_id: 42 },
  true,
);
assert(membership.length === 0, "membership-scoped rows stay out of Rejected cards");

// 3. Untouched rows, liveness, and message passthrough. The label resolves in
//    the shared map (see timeline-labels) — no action annotation is added.
assert(appeals[0]?.action == null, "appeal row passes through unannotated");
assert(appeals[0]?.isPendingReconsideration === true, "live appeal annotated for the New marker");
assert(
  appeals[0]?.review_message === "Please reconsider",
  "real row carries its message (no synthesis)",
);
const quiet = getRejectedAppealHistory(
  [historyEntry({ id: 7, join_request_id: 9, review_message: "Old appeal" })],
  { user_id: 7, agency_id: 42 },
  false,
);
assert(
  quiet.length === 1 && quiet[0]?.isPendingReconsideration == null,
  "resolved appeal renders unannotated (transcript left behind)",
);

// 4. Revoked excludes join-linked reconsiderations, keeps membership appeals.
const revokedView = getRevokedMembershipHistory(
  [
    historyEntry({ id: 8, source_type: "audit_event", action: "revoked", timestamp: "2026-08-10T10:00:00Z" }),
    historyEntry({ id: 9, review_message: null, reason: "Membership appeal" }),
    historyEntry({ id: 10, join_request_id: 9, review_message: "Reconsideration appeal" }),
  ],
  { user_id: 7, agency_id: 42 },
  { includeReviewRequests: true },
);
const revokedReviewIds = revokedView.filter((e) => e.source_type === "review_request").map((e) => e.id);
assert(revokedReviewIds.includes(9), "Revoked keeps membership appeals");
assert(!revokedReviewIds.includes(10), "Revoked excludes join-linked reconsiderations");

// 5. Seeker "rejected" anchor: only agencies with rejected rows admit a
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

// 6. Other anchors unaffected by the new subset field.
const stillCancelled = groupMyJoinRequestCycles(
  [seekerRequest({ join_request_id: 71, status: "cancelled" })],
  "cancelled",
);
assert(
  stillCancelled.length === 1 && stillCancelled[0]?.rejectedRequests.length === 0,
  "cancelled anchor still groups by live status with empty rejected subset",
);

// 7. Agency New-marker notice copy: exact text, caution tone.
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
