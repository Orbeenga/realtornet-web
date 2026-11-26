/**
 * F3 Expired-grouping + U-050 double-gate checks: expired-history groupers
 * (agency + seeker), ordered Gate-1 checks 1→2→3 with exact toast copy,
 * Gate-2 message validator.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/expired-grouping-double-gate.check.ts
 */
import {
  doubleGateOrderedToast,
  resolveNudgePendingSides,
  runNudgeGateChecks,
  validateDoubleGateMessage,
} from "@/lib/membership-lifecycle-messages";
import type { AgencyJoinRequestResponse, MyAgencyJoinRequestResponse } from "@/types";
import { groupAgencyRequestCycles, groupMyJoinRequestCycles } from "../membershipHistory";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function agencyRequest(
  partial: Partial<AgencyJoinRequestResponse> & { join_request_id: number },
): AgencyJoinRequestResponse {
  return {
    agency_id: 42,
    user_id: 7,
    is_verified: false,
    status: "expired",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    ...partial,
  };
}

function seekerRequest(
  partial: Partial<MyAgencyJoinRequestResponse> & { join_request_id: number },
): MyAgencyJoinRequestResponse {
  return {
    agency_id: 42,
    agency_name: "Staging Test Agency",
    is_verified: false,
    status: "expired",
    submitted_at: "2026-09-01T10:00:00Z",
    ...partial,
  };
}

// 1. Agency expired-history anchor admits users with >=1 expired-history row:
//    status expired, or reactivation trace (requested/accepted) on any status.
const agencyGroups = groupAgencyRequestCycles(
  [
    agencyRequest({ join_request_id: 1, user_id: 7, seeker_name: "Zed", status: "expired", created_at: "2026-09-03T10:00:00Z" }),
    agencyRequest({ join_request_id: 2, user_id: 7, seeker_name: "Zed", status: "approved", created_at: "2026-09-04T10:00:00Z" }),
    agencyRequest({
      join_request_id: 3, user_id: 9, seeker_name: "Amy", status: "pending",
      created_at: "2026-09-02T10:00:00Z", reactivation_requested_at: "2026-09-05T10:00:00Z",
    }),
    agencyRequest({ join_request_id: 4, user_id: 11, seeker_name: "Nope", status: "pending", created_at: "2026-09-01T10:00:00Z" }),
  ],
  "expired-history",
);
assert(agencyGroups.length === 2, `agency admits only expired-history users, got ${agencyGroups.length} groups`);
assert(
  agencyGroups[0]?.seekerName === "Amy" && agencyGroups[1]?.seekerName === "Zed",
  "agency groups sort alphabetically by seeker name",
);
const zed = agencyGroups.find((g) => g.userId === 7);
assert(
  zed?.requests.length === 1 && zed.requests[0]?.join_request_id === 1,
  "agency group holds ONLY expired-history rows (approved row of same user excluded)",
);
const amy = agencyGroups.find((g) => g.userId === 9);
assert(
  amy?.requests.length === 1 && amy.requests[0]?.status === "pending",
  "pending row with a reactivation trace is admitted via expired history",
);

// 2. Agency expired-history requests sort ascending by created_at.
const agencyOrdered = groupAgencyRequestCycles(
  [
    agencyRequest({ join_request_id: 11, user_id: 7, created_at: "2026-09-03T10:00:00Z" }),
    agencyRequest({ join_request_id: 12, user_id: 7, created_at: "2026-09-01T10:00:00Z" }),
  ],
  "expired-history",
);
assert(
  agencyOrdered[0]?.requests.map((r) => r.join_request_id).join(",") === "12,11",
  "agency expired requests sort ascending by created_at",
);

// 3. Cancelled anchor is untouched (status-based, no expired-history filter).
const agencyCancelled = groupAgencyRequestCycles(
  [agencyRequest({ join_request_id: 21, user_id: 7, status: "cancelled" })],
  "cancelled",
);
assert(
  agencyCancelled.length === 1 && agencyCancelled[0]?.requests.length === 1,
  "agency cancelled anchor still groups by live status",
);

// 4. Seeker expired-history anchor: only agencies with expired rows admit a
//    group, and group.requests holds ONLY expired-history rows (no leak of
//    live pending/approved rows from the same agency into Expired sections).
const seekerGroups = groupMyJoinRequestCycles(
  [
    seekerRequest({ join_request_id: 31, agency_id: 2, agency_name: "Beta", status: "expired", submitted_at: "2026-09-03T10:00:00Z" }),
    seekerRequest({ join_request_id: 32, agency_id: 2, agency_name: "Beta", status: "pending", submitted_at: "2026-09-04T10:00:00Z" }),
    seekerRequest({ join_request_id: 33, agency_id: 1, agency_name: "Alpha", status: "approved", submitted_at: "2026-09-01T10:00:00Z" }),
  ],
  "expired-history",
);
assert(seekerGroups.length === 1, `seeker admits only expired-history agencies, got ${seekerGroups.length} groups`);
assert(seekerGroups[0]?.agencyName === "Beta", "seeker group carries the agency identity");
assert(
  seekerGroups[0]?.requests.length === 1 && seekerGroups[0]?.requests[0]?.join_request_id === 31,
  "seeker group.requests holds ONLY expired-history rows (live pending row excluded)",
);
assert(
  seekerGroups[0]?.expiredRequests.length === 1 && seekerGroups[0]?.cancelledRequests.length === 0,
  "seeker expired/cancelled subsets stay consistent",
);

// 5. Seeker expired-history requests sort ascending by submitted_at; groups by agency name.
const seekerOrdered = groupMyJoinRequestCycles(
  [
    seekerRequest({ join_request_id: 41, agency_id: 2, agency_name: "Beta", submitted_at: "2026-09-03T10:00:00Z" }),
    seekerRequest({ join_request_id: 42, agency_id: 2, agency_name: "Beta", submitted_at: "2026-09-01T10:00:00Z" }),
    seekerRequest({ join_request_id: 43, agency_id: 1, agency_name: "Alpha", submitted_at: "2026-09-02T10:00:00Z" }),
  ],
  "expired-history",
);
assert(
  seekerOrdered.map((g) => g.agencyName).join(",") === "Alpha,Beta",
  "seeker groups sort alphabetically by agency name",
);
assert(
  seekerOrdered[1]?.requests.map((r) => r.join_request_id).join(",") === "42,41",
  "seeker expired requests sort ascending by submitted_at",
);

// 5b. Approved anchor (U-054 addendum): groups admit users/agencies with
// >=1 approved row and hold ONLY approved rows (per-request sections).
const approvedAgency = groupAgencyRequestCycles(
  [
    agencyRequest({ join_request_id: 51, user_id: 7, seeker_name: "Zed", status: "approved" }),
    agencyRequest({ join_request_id: 52, user_id: 7, seeker_name: "Zed", status: "pending" }),
    agencyRequest({ join_request_id: 53, user_id: 9, seeker_name: "Amy", status: "pending" }),
  ],
  "approved",
);
assert(
  approvedAgency.length === 1 && approvedAgency[0]?.userId === 7,
  "agency approved anchor admits only users with an approved row",
);
assert(
  approvedAgency[0]?.requests.length === 1 && approvedAgency[0]?.requests[0]?.join_request_id === 51,
  "agency approved group holds ONLY approved rows",
);
const approvedSeeker = groupMyJoinRequestCycles(
  [
    seekerRequest({ join_request_id: 61, agency_id: 2, agency_name: "Beta", status: "approved" }),
    seekerRequest({ join_request_id: 62, agency_id: 2, agency_name: "Beta", status: "pending" }),
    seekerRequest({ join_request_id: 63, agency_id: 1, agency_name: "Alpha", status: "pending" }),
  ],
  "approved",
);
assert(
  approvedSeeker.length === 1 && approvedSeeker[0]?.agencyId === 2,
  "seeker approved anchor admits only agencies with an approved row",
);
assert(
  approvedSeeker[0]?.requests.length === 1 &&
    approvedSeeker[0]?.approvedRequests.length === 1 &&
    approvedSeeker[0]?.requests[0]?.join_request_id === 61,
  "seeker approved group holds ONLY approved rows (subset consistent)",
);

// 6. Default (cancelled) anchor is untouched.
const seekerCancelled = groupMyJoinRequestCycles(
  [seekerRequest({ join_request_id: 51, status: "cancelled" })],
  "cancelled",
);
assert(
  seekerCancelled.length === 1 && seekerCancelled[0]?.cancelledRequests.length === 1,
  "seeker cancelled anchor still groups by live status",
);

// 7. U-050 Gate-1 exact toast template: never paraphrased (no trailing period).
assert(
  doubleGateOrderedToast("reactivation", "Beta") === "A reactivation is already pending with Beta",
  "Gate-1 toast copy is exact for reactivation",
);
assert(
  doubleGateOrderedToast("reapplication", "Beta") === "A reapplication is already pending with Beta",
  "Gate-1 toast copy is exact for reapplication",
);
assert(
  doubleGateOrderedToast("reconsideration", "Beta") === "A reconsideration is already pending with Beta",
  "Gate-1 toast copy is exact for reconsideration",
);

// 8. Gate-2 message validation: blank blocked, non-blank passes.
assert(
  validateDoubleGateMessage("") === "Enter a message before continuing.",
  "Gate-2 blocks empty message with the exact copy",
);
assert(
  validateDoubleGateMessage("   ") === "Enter a message before continuing.",
  "Gate-2 blocks whitespace-only message",
);
assert(validateDoubleGateMessage("Hello") === null, "Gate-2 passes a non-blank message");

// 9. U-050 checks 1-2, reactivation, seeker view: agency-nudged (must accept)
//    is this-side; seeker-nudged (agency must decide) is other-side.
const applicantId = 7;
const ownerId = 99;
const agencyInitiated = {
  status: "expired", user_id: applicantId,
  reactivation_requested_at: "2026-09-05T10:00:00Z", reactivation_requested_by: ownerId,
};
const seekerInitiated = {
  status: "expired", user_id: applicantId,
  reactivation_requested_at: "2026-09-05T10:00:00Z", reactivation_requested_by: applicantId,
};
assert(
  JSON.stringify(resolveNudgePendingSides("reactivation", [agencyInitiated], applicantId, true)) ===
    JSON.stringify({ otherSide: false, thisSide: true }),
  "seeker view: agency nudge awaiting my accept is this-side",
);
assert(
  runNudgeGateChecks({
    action: "reactivation", requests: [agencyInitiated],
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: false,
  }) === "A reactivation is already pending with you",
  "seeker view: this-side toast addresses the viewer as you",
);
assert(
  runNudgeGateChecks({
    action: "reactivation", requests: [seekerInitiated],
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: false,
  }) === "A reactivation is already pending with Beta",
  "seeker view: other-side toast names the agency",
);

// 10. U-050 checks 1-2, reactivation, agency view: mirrored sides.
assert(
  runNudgeGateChecks({
    action: "reactivation", requests: [agencyInitiated],
    viewerUserId: ownerId, viewerIsApplicant: false,
    counterpartyName: "Seeker Alpha", includeCooldownCheck: false,
  }) === "A reactivation is already pending with Seeker Alpha",
  "agency view: applicant-must-accept is other-side",
);
assert(
  runNudgeGateChecks({
    action: "reactivation", requests: [seekerInitiated],
    viewerUserId: ownerId, viewerIsApplicant: false,
    counterpartyName: "Seeker Alpha", includeCooldownCheck: false,
  }) === "A reactivation is already pending with you",
  "agency view: must-decide-in-queue is this-side",
);

// 11. U-050 order: check 1 (other side) wins when both sides pend; initial,
//     terminal, and empty groups are clear.
const bothSides = [agencyInitiated, seekerInitiated];
assert(
  runNudgeGateChecks({
    action: "reactivation", requests: bothSides,
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: false,
  }) === "A reactivation is already pending with Beta",
  "check order: other-side toast wins when both sides pend",
);
assert(
  runNudgeGateChecks({
    action: "reactivation", requests: [{ status: "expired", user_id: applicantId }],
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: false,
  }) === null,
  "Gate-1 passes when nothing was requested (initial)",
);
assert(
  runNudgeGateChecks({
    action: "reactivation",
    requests: [{ status: "approved", user_id: applicantId, reactivation_requested_at: "2026-09-05T10:00:00Z" }],
    viewerUserId: ownerId, viewerIsApplicant: false,
    counterpartyName: "Seeker Alpha", includeCooldownCheck: false,
  }) === null,
  "Gate-1 passes a terminal (approved) row — resolved, not pending",
);
assert(
  runNudgeGateChecks({
    action: "reactivation", requests: [],
    viewerUserId: ownerId, viewerIsApplicant: false,
    counterpartyName: "Seeker Alpha", includeCooldownCheck: false,
  }) === null,
  "Gate-1 passes an empty group",
);

// 12. U-050 reconsideration: pending_appeal blocks other-side; none is clear.
assert(
  runNudgeGateChecks({
    action: "reconsideration",
    requests: [{ status: "rejected", pending_appeal: { review_request_id: 5, created_at: "2026-09-06T10:00:00Z" } }],
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: false,
  }) === "A reconsideration is already pending with Beta",
  "reconsideration: pending appeal blocks other-side",
);
assert(
  runNudgeGateChecks({
    action: "reconsideration",
    requests: [{ status: "rejected", pending_appeal: null }],
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: false,
  }) === null,
  "reconsideration: no pending appeal is clear",
);

// 13. U-050 reapplication + check 3: pending reapply blocks other-side;
//     cooldown toasts with the unlock date; pending beats cooldown.
assert(
  runNudgeGateChecks({
    action: "reapplication",
    requests: [{ status: "pending", reapplication_message: "again" }],
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: true,
  }) === "A reapplication is already pending with Beta",
  "reapply: pending reapplication blocks other-side",
);
const cooldownToast = runNudgeGateChecks({
  action: "reapplication",
  requests: [{ status: "cancelled", cooldown_unlock_at: "2026-12-08T00:00:00Z" }],
  viewerUserId: applicantId, viewerIsApplicant: true,
  counterpartyName: "Beta", includeCooldownCheck: true,
});
assert(
  cooldownToast !== null &&
    cooldownToast.startsWith("Limit exceeded. Apply again after ") &&
    cooldownToast.endsWith(".") &&
    cooldownToast.includes("2026"),
  `check 3: cooldown toast carries the unlock date, got ${JSON.stringify(cooldownToast)}`,
);
assert(
  runNudgeGateChecks({
    action: "reapplication",
    requests: [{ status: "cancelled", cooldown_unlock_at: "2026-12-08T00:00:00Z" }],
    viewerUserId: applicantId, viewerIsApplicant: true,
    counterpartyName: "Beta", includeCooldownCheck: false,
  }) === null,
  "check 3: skipped when the caller opts out",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll expired-grouping double-gate checks passed.");
