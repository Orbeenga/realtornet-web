/**
 * Invitation per-tab contract checks (Tier-1 invitations crossover): the
 * shared-resolver ambient strings for the rebuilt Pending/Withdrawn tabs,
 * the column-driven invitation timeline rows, and the Withdrawn decision
 * result filter. Verbatim copy — any drift fails.
 *
 * Run: pnpm exec tsx src/features/agencies/components/__tests__/invitation-contract.check.ts
 */
import {
  isAgencyRequestedExpiredInvitation,
  resolveInvitationExpiredAgencyText,
  resolveInvitationExpiredOfferedAgencyText,
  resolveInvitationExpiredOfferedSeekerText,
  resolveInvitationExpiredRequestedAgencyText,
  resolveInvitationExpiredRequestedSeekerText,
  resolveInvitationExpiredSeekerText,
  resolveInvitationPendingAgencyText,
  resolveInvitationRejectedAgencyText,
  resolveInvitationWithdrawnAgencyText,
  resolveInvitationWithdrawnInterestAgencyText,
  resolveInvitationWithdrawnInterestSeekerText,
  resolveInvitationWithdrawnSeekerText,
  resolveInviteeName,
  resolvePriorInvitationContextLine,
} from "@/lib/membership-lifecycle-messages";
import {
  getInvitationDecisionResults,
  getInvitationSubsequentApplications,
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

// 1. Agency Pending keeps its ambient (contractual context: where the
//    invitation went and the pending action). Seeker Pending stays bare:
//    action tabs carry the event plus CTAs only, no ambient.
assert(
  resolveInvitationPendingAgencyText({ name: "seeker@example.com" }) ===
    "Invitation is pending a response from seeker@example.com.",
  "pending agency ambient is verbatim",
);

// 2. Withdrawn seeker ambient, verbatim.
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
const requestedRows = resolveInvitationColumnTimeline(
  invitation({
    invitation_id: 5,
    status: "expired",
    reactivation_requested_at: "2026-11-05T10:00:00Z",
    reactivation_requested_by: 7,
    invited_user_id: 7,
  }),
);
assert(
  requestedRows.map((r) => r.action).join(",") === "sent,expired,reactivation_requested",
  "requested reactivation adds a Reactivation requested row",
);
assert(
  requestedRows[2]?.author_role === "seeker",
  "own request attributes the seeker",
);
assert(
  resolveInvitationColumnTimeline(
    invitation({
      invitation_id: 6,
      status: "expired",
      reactivation_requested_at: "2026-11-05T10:00:00Z",
      reactivation_requested_by: 2,
      invited_user_id: 7,
    }),
  )[2]?.author_role === "agency",
  "agency request attributes the agency",
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

// 5. Prior-invitation context line (agency Pending card), verbatim.
assert(
  resolvePriorInvitationContextLine({
    sent_at: "2026-10-01T10:00:00Z",
    rejected_at: "2026-10-03T10:00:00Z",
  }) === "Previously invited Oct 1, 2026, declined Oct 3, 2026",
  "context line is verbatim with both dates",
);
assert(
  resolvePriorInvitationContextLine({
    sent_at: "2026-10-01T10:00:00Z",
    rejected_at: null,
  }) === "Previously invited Oct 1, 2026",
  "context line degrades without a declined date",
);

// 6. Subsequent-application correlation: (agency_id, user_id) only —
//    never email — strictly after the rejection, ascending.
const rejectedInvitation = {
  agency_id: 42,
  invited_user_id: 7,
  rejected_at: "2026-10-03T10:00:00Z",
};
const candidateRequests = [
  { agency_id: 42, user_id: 7, submitted_at: "2026-10-05T10:00:00Z" },
  { agency_id: 42, user_id: 7, submitted_at: "2026-10-01T10:00:00Z" },
  { agency_id: 42, user_id: 8, submitted_at: "2026-10-06T10:00:00Z" },
  { agency_id: 43, user_id: 7, submitted_at: "2026-10-06T10:00:00Z" },
  { agency_id: 42, user_id: 7, submitted_at: "2026-10-03T10:00:00Z" },
];
assert(
  getInvitationSubsequentApplications(rejectedInvitation, candidateRequests, {
    viewerUserId: 99,
    viewerIsApplicant: false,
  }).map((r) => r.submitted_at).join(",") === "2026-10-05T10:00:00Z",
  "agency view matches same pair strictly after rejection only",
);
assert(
  getInvitationSubsequentApplications(
    rejectedInvitation,
    [{ agency_id: 42, submitted_at: "2026-10-05T10:00:00Z" }],
    { viewerUserId: 7, viewerIsApplicant: true },
  ).length === 1,
  "applicant view treats missing user ids as the viewer",
);
assert(
  getInvitationSubsequentApplications(
    { agency_id: 42, invited_user_id: null, rejected_at: "2026-10-03T10:00:00Z" },
    [{ agency_id: 42, submitted_at: "2026-10-05T10:00:00Z" }],
    { viewerUserId: 7, viewerIsApplicant: true },
  ).length === 1,
  "legacy NULL invitee still correlates for the viewer (list attested)",
);
assert(
  getInvitationSubsequentApplications(
    { agency_id: 42, invited_user_id: null, rejected_at: "2026-10-03T10:00:00Z" },
    [{ agency_id: 42, user_id: 7, submitted_at: "2026-10-05T10:00:00Z" }],
    { viewerUserId: 99, viewerIsApplicant: false },
  ).length === 0,
  "legacy NULL invitee never correlates agency-side (no email fallback)",
);
assert(
  getInvitationSubsequentApplications(
    { agency_id: 42, invited_user_id: 7, rejected_at: null },
    [{ agency_id: 42, user_id: 7, submitted_at: "2026-10-05T10:00:00Z" }],
    { viewerUserId: 99, viewerIsApplicant: false },
  ).length === 0,
  "missing rejection date correlates nothing",
);
assert(
  getInvitationSubsequentApplications(rejectedInvitation, candidateRequests, {
    viewerUserId: null,
    viewerIsApplicant: true,
  }).length === 0,
  "applicant view without a viewer correlates nothing",
);

// 7. Invitee display name: registered accounts render as Invitee, the
//    invitation payload carries no display names.
assert(
  resolveInviteeName({ email: "a@example.com", invited_user_id: 7 }) === "Invitee",
  "registered invitee renders as Invitee",
);
assert(
  resolveInviteeName({ email: "a@example.com", invited_user_id: null }) === "a@example.com",
  "unregistered invitee renders as email",
);
assert(
  resolveInviteeName({ email: "a@example.com", invited_user_id: 7, invitee_display_name: "Ada Obi" }) ===
    "Ada Obi",
  "served display name wins over Invitee",
);
assert(
  resolveInviteeName({ email: "a@example.com", invited_user_id: 7, invitee_display_name: "" }) ===
    "Invitee",
  "blank display name falls back to Invitee",
);
assert(
  resolveInviteeName({ email: "a@example.com", invited_user_id: 7, invitee_display_name: null }) ===
    "Invitee",
  "null display name falls back to Invitee",
);

// 8. Expired matrix ambients, per viewer and state, verbatim.
assert(
  resolveInvitationExpiredSeekerText({ agencyName: "Apine Real Estate" }) ===
    "Your invitation from Apine Real Estate has expired. You can request reactivation, or wait for them to reach out.",
  "expired initial seeker ambient is verbatim",
);
assert(
  resolveInvitationExpiredAgencyText({ name: "Invitee" }) ===
    "Invitation to Invitee has expired. Request them to reactivate it.",
  "expired initial agency ambient is verbatim",
);
assert(
  resolveInvitationExpiredRequestedSeekerText({ agencyName: "Apine Real Estate" }) ===
    "Your request is pending a response from Apine Real Estate.",
  "expired requested seeker ambient is verbatim",
);
assert(
  resolveInvitationExpiredRequestedAgencyText({ name: "Invitee" }) ===
    "Invitee has requested to reactivate their expired invitation. Respond to it in Review Requests.",
  "expired requested agency ambient is verbatim",
);
assert(
  resolveInvitationExpiredOfferedSeekerText({ agencyName: "Apine Real Estate" }) ===
    "Apine Real Estate has requested to reactivate your expired invitation. Respond to it in Pending.",
  "expired offered seeker ambient is verbatim",
);
assert(
  resolveInvitationExpiredOfferedAgencyText({ name: "Invitee" }) ===
    "Request is pending a response from Invitee.",
  "expired offered agency ambient is verbatim",
);

// 9. Withdrawn matrix ambients: agency initial + interest, seeker interest.
assert(
  resolveInvitationWithdrawnAgencyText({ name: "Invitee" }) ===
    "Invitee can see their withdrawn invitation. They can express interest.",
  "withdrawn initial agency ambient is verbatim",
);
assert(
  resolveInvitationWithdrawnInterestAgencyText({ name: "Invitee" }) ===
    "Invitee has expressed interest in their withdrawn invitation. Respond to it in Review Requests.",
  "withdrawn interest agency ambient is verbatim",
);
assert(
  resolveInvitationWithdrawnInterestSeekerText({ agencyName: "Apine Real Estate" }) ===
    "Your expression of interest is awaiting a response from Apine Real Estate.",
  "withdrawn interest seeker ambient is verbatim",
);

// 10. Rejected agency sentence, verbatim.
assert(
  resolveInvitationRejectedAgencyText({ name: "Invitee" }) ===
    "Invitee rejected membership invitation. They can still apply to join any time.",
  "rejected agency sentence is verbatim",
);

// 11. Agency-requested expired rows (seeker Pending merge): expired with a
//     live request from someone other than the invitee, viewer is invitee.
const agencyReqRow = {
  status: "expired",
  reactivation_requested_at: "2026-11-20T10:00:00Z",
  reactivation_requested_by: 2,
  invited_user_id: 7,
};
assert(
  isAgencyRequestedExpiredInvitation(agencyReqRow, 7) === true,
  "agency request merges for the invitee",
);
assert(
  isAgencyRequestedExpiredInvitation(
    { ...agencyReqRow, reactivation_requested_by: 7 },
    7,
  ) === false,
  "own request never merges",
);
assert(
  isAgencyRequestedExpiredInvitation({ ...agencyReqRow, status: "pending" }, 7) === false,
  "non-expired rows never merge",
);
assert(
  isAgencyRequestedExpiredInvitation(
    { status: "expired", reactivation_requested_at: null, reactivation_requested_by: null, invited_user_id: 7 },
    7,
  ) === false,
  "unrequested rows never merge",
);
assert(
  isAgencyRequestedExpiredInvitation(agencyReqRow, null) === false,
  "no merge without a viewer",
);
assert(
  isAgencyRequestedExpiredInvitation(agencyReqRow, 9) === false,
  "no merge for other viewers",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll invitation-contract checks passed.");
