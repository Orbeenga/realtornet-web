/**
 * Timeline label regression check (F2, U-017 extension; verb rule U-053):
 * join_request rows carrying reapplied_from_request_id render "Reapplied"
 * instead of "Submitted"; agency decisions render Approved (+ origin stem),
 * invitation origin renders Accepted, restoration renders Reinstated; legacy
 * machine reasons never render as messages. All other shapes keep their
 * canonical labels.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/timeline-labels.check.ts
 */
import { resolveTimelineLabel } from "../MembershipHistoryList";
import {
  annotateApprovalOrigins,
  resolveApprovalOrigin,
} from "../membershipHistory";
import { isLegacyMachineReason } from "@/lib/membership-lifecycle-messages";
import type { MembershipTimelineEntry } from "@/types";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function entry(partial: Record<string, unknown>): MembershipTimelineEntry {
  return {
    timestamp: "2026-09-12T10:00:00Z",
    ...partial,
  } as unknown as MembershipTimelineEntry;
}

assert(
  resolveTimelineLabel(entry({ source_type: "join_request" })) === "Submitted",
  "first submission stays Submitted",
);
assert(
  resolveTimelineLabel(entry({ source_type: "join_request", reapplied_from_request_id: null })) ===
    "Submitted",
  "explicit null reapplied marker stays Submitted",
);
assert(
  resolveTimelineLabel(entry({ source_type: "join_request", reapplied_from_request_id: 12 })) ===
    "Reapplied",
  "reapply submission renders Reapplied",
);
assert(
  resolveTimelineLabel(entry({ source_type: "join_request", action: "cancelled" })) === "Cancelled",
  "decision actions keep their mapped labels",
);
assert(
  resolveTimelineLabel(entry({ source_type: "review_request" })) === "Review requested",
  "review_request shape unchanged",
);
assert(
  resolveTimelineLabel(entry({ source_type: "review_request", join_request_id: 9 })) ===
    "Reconsideration requested",
  "linked appeal renders Reconsideration requested in every tab",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event" })) === "Event",
  "unknown shape still falls back to Event",
);

// U-053 verb rule: agency-decides renders Approved (+ stem), never bare Accepted.
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "joined" })) === "Approved",
  "origin-less joined renders bare Approved (fresh default)",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "approved" })) === "Approved",
  "origin-less approved renders bare Approved",
);
assert(
  resolveTimelineLabel(
    entry({ source_type: "audit_event", action: "joined", approvalOrigin: "reapplication" }),
  ) === "Reapplication approved",
  "reapply origin renders Reapplication approved",
);
assert(
  resolveTimelineLabel(
    entry({ source_type: "audit_event", action: "joined", approvalOrigin: "reactivation" }),
  ) === "Reactivation approved",
  "reactivation origin renders Reactivation approved",
);
assert(
  resolveTimelineLabel(
    entry({ source_type: "audit_event", action: "approved", approvalOrigin: "reconsideration" }),
  ) === "Reconsideration approved",
  "reconsideration origin renders Reconsideration approved",
);
assert(
  resolveTimelineLabel(
    entry({ source_type: "audit_event", action: "joined", invitation_id: 7 }),
  ) === "Accepted",
  "invitation origin renders Accepted",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "reinstated" })) ===
    "Reinstated",
  "restoration still renders Reinstated",
);

// Origin derivation: U-051 split order on the anchor, reconsideration via
// own-id review linkage (C2).
const DECIDED = "2026-11-10T12:00:00Z";
function row(partial: Record<string, unknown>) {
  return {
    join_request_id: 41,
    user_id: 9,
    agency_id: 3,
    decided_at: DECIDED,
    ...partial,
  };
}
function histEntry(partial: Record<string, unknown>): MembershipTimelineEntry {
  return entry({ timestamp: DECIDED, user_id: 9, agency_id: 3, ...partial });
}
assert(
  resolveApprovalOrigin(row({ reactivation_requested_by: 9, reapplied_from_request_id: 40 }), []) ===
    "reactivation",
  "origin: reactivation_requested_by wins the split",
);
assert(
  resolveApprovalOrigin(row({ reapplied_from_request_id: 40 }), []) === "reapplication",
  "origin: reapplied_from_request_id resolves reapplication",
);
assert(
  resolveApprovalOrigin(row({}), [
    histEntry({ source_type: "review_request", join_request_id: 41 }),
  ]) === "reconsideration",
  "origin: own-id review linkage resolves reconsideration",
);
assert(
  resolveApprovalOrigin(row({ join_request_id: 42 }), [
    histEntry({ source_type: "review_request", join_request_id: 41 }),
  ]) === null,
  "origin: declined-then-fresh sibling linkage correctly misses",
);
assert(
  resolveApprovalOrigin(row({}), []) === null,
  "origin: fresh row resolves null (bare verb)",
);
assert(resolveApprovalOrigin(null, []) === null, "origin: missing anchor resolves null");

// Annotator: joined/approved entries gain origin; invitation entries skip;
// other actions pass through untouched (same refs).
const joinedEntry = histEntry({ source_type: "audit_event", action: "joined" });
const revokedEntry = histEntry({ source_type: "audit_event", action: "revoked" });
const annotated = annotateApprovalOrigins(
  [joinedEntry, revokedEntry],
  [row({ reapplied_from_request_id: 40 })],
  [],
);
assert(
  (annotated[0] as { approvalOrigin?: string }).approvalOrigin === "reapplication",
  "annotator tags joined entries",
);
assert(annotated[1] === revokedEntry, "annotator passes other actions through untouched");
const invitedAnnotated = annotateApprovalOrigins(
  [histEntry({ source_type: "audit_event", action: "joined", invitation_id: 7 })],
  [row({ reapplied_from_request_id: 40 })],
  [],
);
assert(
  !("approvalOrigin" in invitedAnnotated[0]),
  "annotator skips invitation-linked entries",
);

// Legacy machine reasons never render as messages (backstop for pre-fix rows).
assert(
  isLegacyMachineReason("Agency reapply approved"),
  "suppress: Agency reapply approved",
);
assert(
  isLegacyMachineReason("Agency invitation accepted"),
  "suppress: Agency invitation accepted",
);
assert(
  !isLegacyMachineReason("Welcome aboard — see you Monday"),
  "suppress: person text passes through",
);
assert(!isLegacyMachineReason(null), "suppress: null passes through");
assert(!isLegacyMachineReason(""), "suppress: empty passes through");
assert(
  !isLegacyMachineReason("agency reapply approved"),
  "suppress: matching is exact (case-sensitive)",
);

// Invitation lifecycle actions render through the generic verb mapping —
// the Withdrawn-tab column timeline and decision rows depend on these.
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "sent" })) === "Sent",
  "invitation sent renders Sent",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "withdrawn" })) === "Withdrawn",
  "invitation withdrawn renders Withdrawn",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "expired" })) === "Expired",
  "invitation expired renders Expired",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "interest_expressed" })) ===
    "Interest expressed",
  "interest expressed renders Interest expressed",
);
assert(
  resolveTimelineLabel(entry({ source_type: "audit_event", action: "reactivation_rejected" })) ===
    "Reactivation rejected",
  "declined interest renders Reactivation rejected",
);

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("timeline-labels check passed");
