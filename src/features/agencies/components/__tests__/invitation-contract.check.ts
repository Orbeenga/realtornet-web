/**
 * Invitation per-tab contract checks (Tier-1 invitations crossover): the
 * shared-resolver ambient strings for the rebuilt Pending/Withdrawn tabs,
 * the column-driven invitation timeline rows, and the Withdrawn decision
 * result filter. Verbatim copy — any drift fails.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/invitation-contract.check.ts
 */
import {
  resolveInvitationPendingAgencyText,
  resolveInvitationPendingSeekerText,
  resolveInvitationWithdrawnSeekerText,
} from "@/lib/membership-lifecycle-messages";
import {
  getInvitationDecisionResults,
  resolveInvitationColumnTimeline,
} from "../membershipHistory";
import type { AgencyInvitationResponse, MembershipTimelineEntry } from "@/types";

let failures = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function invitation(
  partial: Partial<AgencyInvitationResponse> & { invitation_id: number },
): AgencyInvitationResponse {
  return {
    agency_id: 42,
    agency_name: "Apine Real Estate",
    email: "seeker@example.com",
    status: "pending",
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    expires_at: "2026-10-31T10:00:00Z",
    ...partial,
  } as AgencyInvitationResponse;
}

function feedEntry(
  partial: Partial<MembershipTimelineEntry> & { id: number },
): MembershipTimelineEntry {
  return {
    source_type: "audit_event",
    timestamp: "2026-10-05T10:00:00Z",
    ...partial,
  } as MembershipTimelineEntry;
}

// 1. Pending ambients, per viewer, verbatim.
assert(
  resolveInvitationPendingAgencyText({ name: "seeker@example.com" }) ===
    "Invitation is pending a response from seeker@example.com.",
  "pending agency ambient is verbatim",
);
assert(
  resolveInvitationPendingSeekerText({ agencyName: "Apine Real Estate" }) ===
    "Apine Real Estate has invited you to join their agency. Find it in Pending.",
  "pending seeker ambient is verbatim",
);

// 2. Withdrawn seeker ambient, verbatim. The agency Withdrawn card carries
//    no ambient — timeline rows plus the queue decision surface only.
assert(
  resolveInvitationWithdrawnSeekerText({ agencyName: "Apine Real Estate" }) ===
    "Apine Real Estate has withdrawn their invitation to you. You can express interest.",
  "withdrawn seeker ambient is verbatim",
);

// 3. Column timeline: Sent always; Withdrawn/Expired/Interest iff set.
const pendingRows = resolveInvitationColumnTimeline(invitation({ invitation_id: 1 }));
assert(
  pendingRows.length === 1 && pendingRows[0]?.action === "sent",
  "pending invitation yields Sent only",
);
const withdrawnRows = resolveInvitationColumnTimeline(
  invitation({ invitation_id: 2, status: "withdrawn", withdrawn_at: "2026-10-03T10:00:00Z" }),
);
assert(
  withdrawnRows.map((r) => r.action).join(",") === "sent,withdrawn",
  "withdrawn invitation yields Sent, Withdrawn",
);
const interestRows = resolveInvitationColumnTimeline(
  invitation({
    invitation_id: 3,
    status: "withdrawn",
    withdrawn_at: "2026-10-03T10:00:00Z",
    interest_expressed_at: "2026-10-04T10:00:00Z",
  }),
);
assert(
  interestRows.map((r) => r.action).join(",") === "sent,withdrawn,interest_expressed",
  "interest adds an Interest expressed row",
);
const expiredRows = resolveInvitationColumnTimeline(
  invitation({ invitation_id: 4, status: "expired" }),
);
assert(
  expiredRows.map((r) => r.action).join(",") === "sent,expired",
  "expired invitation yields Sent, Expired",
);
assert(
  expiredRows[1]?.timestamp === "2026-10-31T10:00:00Z",
  "expired row carries the expiry timestamp",
);

// 4. Decision results: only terminal interest-path outcomes pass —
//    column rows carry the lifecycle, so feed lifecycle rows stay out.
const results = getInvitationDecisionResults([
  feedEntry({ id: 1, action: "invited" }),
  feedEntry({ id: 2, action: "withdrawn" }),
  feedEntry({ id: 3, action: "interest_expressed" }),
  feedEntry({ id: 4, action: "reactivation_rejected" }),
  feedEntry({ id: 5, action: "joined", invitation_id: 9 }),
]);
assert(
  results.map((r) => r.action).join(",") === "reactivation_rejected,joined",
  "only terminal outcomes pass the decision filter",
);
assert(
  getInvitationDecisionResults([feedEntry({ id: 6, action: "reactivated" })]).length === 0,
  "reactivation lifecycle rows stay out of results",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll invitation-contract checks passed.");
