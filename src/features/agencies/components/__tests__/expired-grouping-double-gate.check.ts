/**
 * F3 Expired-grouping + double-gate checks: expired-history groupers (agency +
 * seeker), Gate-1 pending predicate, Gate-2 message validator, exact toast copy.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/expired-grouping-double-gate.check.ts
 */
import {
  doubleGatePendingToast,
  hasPendingReactivation,
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

// 6. Default (cancelled) anchor is untouched.
const seekerCancelled = groupMyJoinRequestCycles(
  [seekerRequest({ join_request_id: 51, status: "cancelled" })],
  "cancelled",
);
assert(
  seekerCancelled.length === 1 && seekerCancelled[0]?.cancelledRequests.length === 1,
  "seeker cancelled anchor still groups by live status",
);

// 7. Gate-1 exact toast copy (U-038): never paraphrased.
assert(
  doubleGatePendingToast("review request") === "You already have a pending review request for this agency.",
  "Gate-1 toast copy is exact for the reactivation noun",
);
assert(
  doubleGatePendingToast("reapplication") === "You already have a pending reapplication for this agency.",
  "Gate-1 toast copy is exact for reapplication",
);
assert(
  doubleGatePendingToast("appeal") === "You already have a pending appeal for this agency.",
  "Gate-1 toast copy is exact for appeal",
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

// 9. Gate-1 predicate: live reactivation stages block, initial/terminal/empty do not.
const applicantId = 7;
const ownerId = 99;
assert(
  hasPendingReactivation(
    [{ status: "expired", user_id: applicantId }],
    ownerId,
    false,
  ) === false,
  "Gate-1 passes when nothing was requested (initial)",
);
assert(
  hasPendingReactivation(
    [{ status: "expired", user_id: applicantId, reactivation_requested_at: "2026-09-05T10:00:00Z", reactivation_requested_by: ownerId }],
    ownerId,
    false,
  ) === true,
  "Gate-1 blocks an agency-initiated pending nudge (agency view)",
);
assert(
  hasPendingReactivation(
    [{ status: "expired", user_id: applicantId, reactivation_requested_at: "2026-09-05T10:00:00Z", reactivation_requested_by: applicantId }],
    applicantId,
    true,
  ) === true,
  "Gate-1 blocks a seeker-initiated pending nudge (seeker view)",
);
assert(
  hasPendingReactivation(
    [{
      status: "pending", user_id: applicantId, reactivation_requested_at: "2026-09-05T10:00:00Z",
      reactivation_requested_by: ownerId, reactivation_accepted_at: "2026-09-06T10:00:00Z",
    }],
    applicantId,
    true,
  ) === true,
  "Gate-1 blocks an accepted-but-unresolved round-trip",
);
assert(
  hasPendingReactivation(
    [{ status: "approved", user_id: applicantId, reactivation_requested_at: "2026-09-05T10:00:00Z" }],
    ownerId,
    false,
  ) === false,
  "Gate-1 passes a terminal (approved) row — resolved, not pending",
);
assert(
  hasPendingReactivation(
    [
      { status: "expired", user_id: applicantId },
      { status: "expired", user_id: applicantId, reactivation_requested_at: "2026-09-05T10:00:00Z", reactivation_requested_by: ownerId },
    ],
    ownerId,
    false,
  ) === true,
  "Gate-1 blocks when ANY group row is mid-reactivation",
);
assert(hasPendingReactivation([], ownerId, false) === false, "Gate-1 passes an empty group");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll expired-grouping double-gate checks passed.");
