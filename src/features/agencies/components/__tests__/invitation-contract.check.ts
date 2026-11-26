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
  resolveInvitationPendingSeekerText,
  resolveInvitationRejectedAgencyText,
  resolveInvitationWithdrawnAgencyText,
  resolveInvitationWithdrawnInterestAgencyText,
  resolveInvitationWithdrawnInterestSeekerText,
  resolveInvitationWithdrawnSeekerText,
  resolveInviteeName,
  resolvePriorInvitationContextLine,
} from "@/lib/membership-lifecycle-messages";
import {
  countDistinctEntities,
  getAcceptedInvitationDownstreamEvents,
  getInvitationDecisionResults,
  getInvitationSubsequentApplications,
  groupAgencyInvitationCycles,
  groupMyInvitationCycles,
  normalizeInviteeEmail,
  resolveAcceptedInvitationTimeline,
  resolveAgencyIsVerified,
  resolveInvitationColumnTimeline,
  resolveInviteeHeaderQualifiers,
  resolveRejectedInvitationTimeline,
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

// 1. Pending descriptions, per viewer, verbatim: the event restated
//    with its direction.
assert(
  resolveInvitationPendingAgencyText({ name: "seeker@example.com" }) ===
    "Invitation is pending a response from seeker@example.com.",
  "pending agency ambient is verbatim",
);
assert(
  resolveInvitationPendingSeekerText({ agencyName: "Apine Real Estate" }) ===
    "Apine Real Estate has invited you to join their agency.",
  "pending seeker description is verbatim",
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

// 12. U-030 Accepted downstream: ONLY revoked/reinstated strictly after
//     accepted_at, ascending. The card dates already speak for the
//     invitation lifecycle, so lifecycle rows stay out (no repetition).
//     Agency view requires the stamped invitee pair; applicant view
//     trusts own-feed membership so NULLs attest.
const acceptedInvitation = invitation({
  invitation_id: 11,
  agency_id: 467,
  invited_user_id: 7,
  status: "accepted",
  accepted_at: "2026-11-20T10:00:00Z",
});
const acceptedFeed = [
  feedEntry({ id: 1, action: "invited", invitation_id: 11, timestamp: "2026-11-18T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 2, action: "joined", invitation_id: 11, timestamp: "2026-11-20T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 4, action: "revoked", timestamp: "2026-11-22T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 5, action: "reinstated", timestamp: "2026-11-23T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 6, action: "revoked", timestamp: "2026-11-19T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 7, action: "cancelled", timestamp: "2026-11-24T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 8, action: "revoked", timestamp: "2026-11-22T10:00:00Z", agency_id: 999, user_id: 7 }),
  feedEntry({ id: 9, action: "revoked", timestamp: "2026-11-22T10:00:00Z", agency_id: 467, user_id: 8 }),
];
const AGENCY_VIEWER = { viewerUserId: 2, viewerIsApplicant: false };
assert(
  getAcceptedInvitationDownstreamEvents(acceptedFeed, acceptedInvitation, AGENCY_VIEWER)
    .map((e) => e.action)
    .join(",") === "revoked,reinstated",
  "agency downstream shows post-accept revoked/reinstated only, ascending",
);
assert(
  getAcceptedInvitationDownstreamEvents(
    acceptedFeed.filter((e) => e.invitation_id === 11),
    acceptedInvitation,
    AGENCY_VIEWER,
  ).length === 0,
  "invitation-lifecycle rows never render twice (card dates speak)",
);
assert(
  getAcceptedInvitationDownstreamEvents(
    acceptedFeed,
    { ...acceptedInvitation, invited_user_id: null },
    AGENCY_VIEWER,
  ).length === 0,
  "agency view needs the stamped invitee pair for downstream",
);
assert(
  getAcceptedInvitationDownstreamEvents(
    acceptedFeed,
    { ...acceptedInvitation, accepted_at: null },
    AGENCY_VIEWER,
  ).length === 0,
  "no accepted_at means no downstream",
);
assert(
  getAcceptedInvitationDownstreamEvents(
    [
      feedEntry({ id: 10, action: "revoked", timestamp: "2026-11-22T10:00:00Z", agency_id: 467 }),
      feedEntry({ id: 11, action: "revoked", timestamp: "2026-11-22T10:00:00Z", agency_id: 467, user_id: 8 }),
    ],
    acceptedInvitation,
    { viewerUserId: 7, viewerIsApplicant: true },
  ).length === 1,
  "applicant view attests NULL subjects but excludes other users",
);
assert(
  getAcceptedInvitationDownstreamEvents(
    acceptedFeed,
    acceptedInvitation,
    { viewerUserId: null, viewerIsApplicant: true },
  ).length === 0,
  "applicant downstream needs a viewer",
);
assert(
  getAcceptedInvitationDownstreamEvents([], acceptedInvitation, AGENCY_VIEWER).length === 0,
  "empty feed yields no timeline",
);

// 13. Invitee header qualifiers (Rule 20/24): one resolver over the
//     shared member map. Record present returns its lines; missing key
//     or missing invitee returns nothing (name-and-email headers stay).
const qualifierMembers = new Map([
  [7, { qualifiers: ["Sales", "2 active listings."] }],
  [9, { qualifiers: [] }],
]);
assert(
  JSON.stringify(resolveInviteeHeaderQualifiers(qualifierMembers, 7)) ===
    JSON.stringify(["Sales", "2 active listings."]),
  "member record returns its qualifier lines",
);
assert(
  resolveInviteeHeaderQualifiers(qualifierMembers, 42) === undefined,
  "unknown invitee returns nothing",
);
assert(
  resolveInviteeHeaderQualifiers(qualifierMembers, null) === undefined,
  "legacy invitee without a user id returns nothing",
);
assert(
  JSON.stringify(resolveInviteeHeaderQualifiers(qualifierMembers, 9)) ===
    JSON.stringify([]),
  "applicant-only record returns its empty lines",
);

// 14. Agency verification lookup (Rule 20): membership match returns its
//     flag; missing agency or missing membership returns nothing (the
//     header line stays off).
const verificationMemberships = [
  { agency_id: 467, is_verified: true },
  { agency_id: 468, is_verified: false },
];
assert(
  resolveAgencyIsVerified(verificationMemberships, 467) === true,
  "member agency returns its verified flag",
);
assert(
  resolveAgencyIsVerified(verificationMemberships, 468) === false,
  "unverified member agency returns false (renders Unverified)",
);
assert(
  resolveAgencyIsVerified(verificationMemberships, 999) === undefined,
  "no membership returns nothing",
);
assert(
  resolveAgencyIsVerified(verificationMemberships, null) === undefined,
  "no agency id returns nothing",
);

// 15. Column rejected arm: status-gated like the expired arm. Rejected
//     invitations render Sent, Rejected; every other status stays silent
//     even with a stray rejected_at (no ripple to live tabs).
const rejectedColumnRows = resolveInvitationColumnTimeline(
  invitation({ invitation_id: 21, status: "rejected", rejected_at: "2026-10-20T10:00:00Z" }),
);
assert(
  rejectedColumnRows.map((r) => r.action).join(",") === "sent,rejected",
  "rejected invitation yields Sent, Rejected",
);
assert(
  resolveInvitationColumnTimeline(
    invitation({ invitation_id: 22, status: "pending", rejected_at: "2026-10-20T10:00:00Z" }),
  ).every((r) => r.action !== "rejected"),
  "rejected arm never fires off-status",
);
assert(
  resolveInvitationColumnTimeline(
    invitation({ invitation_id: 23, status: "rejected", rejected_at: null }),
  ).every((r) => r.action !== "rejected"),
  "rejected arm needs its date",
);

// 16. Full-timeline composers (Option A): dates are rows, count equals
//     rows. Sources are action-disjoint by construction, so nothing
//     renders twice; legacy acceptances without a joined audit row
//     synthesize it from accepted_at (invitation-linked, canonical map
//     renders Accepted).
const acceptedFull = invitation({
  invitation_id: 31,
  agency_id: 467,
  invited_user_id: 7,
  status: "accepted",
  created_at: "2026-11-12T10:00:00Z",
  accepted_at: "2026-11-13T10:00:00Z",
});
const acceptedFullFeed = [
  feedEntry({ id: 31, action: "invited", invitation_id: 31, timestamp: "2026-11-12T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 32, action: "joined", invitation_id: 31, timestamp: "2026-11-13T10:00:00Z", agency_id: 467, user_id: 7 }),
  feedEntry({ id: 33, action: "revoked", timestamp: "2026-11-25T10:00:00Z", agency_id: 467, user_id: 7 }),
];
assert(
  resolveAcceptedInvitationTimeline(acceptedFull, acceptedFullFeed, AGENCY_VIEWER)
    .map((e) => e.action)
    .join(",") === "sent,joined,revoked",
  "accepted composes column plus decision plus downstream, ascending",
);
const legacyRows = resolveAcceptedInvitationTimeline(
  acceptedFull,
  acceptedFullFeed.filter((e) => e.action !== "joined"),
  AGENCY_VIEWER,
);
assert(
  legacyRows.map((e) => e.action).join(",") === "sent,joined,revoked" &&
    legacyRows.find((e) => e.action === "joined")?.timestamp === "2026-11-13T10:00:00Z" &&
    legacyRows.find((e) => e.action === "joined")?.invitation_id === 31,
  "legacy acceptance synthesizes one invitation-linked joined row from accepted_at",
);
assert(
  resolveAcceptedInvitationTimeline(acceptedFull, acceptedFullFeed, AGENCY_VIEWER).filter(
    (e) => e.action === "joined",
  ).length === 1,
  "synthesis never doubles a real joined row",
);
const rejectedFull = invitation({
  invitation_id: 41,
  status: "rejected",
  created_at: "2026-11-12T10:00:00Z",
  rejected_at: "2026-11-14T10:00:00Z",
});
assert(
  resolveRejectedInvitationTimeline(rejectedFull, [
    { agency_id: 42, user_id: 7, submitted_at: "2026-11-28T10:00:00Z" },
    { agency_id: 42, user_id: 7, submitted_at: "2026-11-25T10:00:00Z" },
  ])
    .map((e) => e.action)
    .join(",") === "sent,rejected,applied,applied",
  "rejected composes column plus applied rows, ascending",
);
assert(
  resolveRejectedInvitationTimeline(rejectedFull, [])
    .map((e) => e.action)
    .join(",") === "sent,rejected",
  "rejected without applications renders lifecycle only",
);
assert(
  resolveRejectedInvitationTimeline(rejectedFull, [
    { agency_id: 42, user_id: 7, submitted_at: "2026-11-25T10:00:00Z" },
  ]).find((e) => e.action === "applied")?.timestamp === "2026-11-25T10:00:00Z",
  "applied rows carry the application submit time",
);

// 17. Agency pair grouping (U-054): stamped rows key on invited_user_id,
//     email-only rows on the normalized email; anchors admit own rows only.
assert(normalizeInviteeEmail("  Seeker@Example.com ") === "seeker@example.com", "email key trims and lowercases");
assert(normalizeInviteeEmail(null) === "", "missing email normalizes empty");
const pairFeed = [
  invitation({ invitation_id: 51, status: "pending", invited_user_id: 7, email: "zed@example.com", created_at: "2026-11-10T10:00:00Z" }),
  invitation({ invitation_id: 52, status: "pending", invited_user_id: 7, email: "zed@example.com", created_at: "2026-11-12T10:00:00Z" }),
  invitation({ invitation_id: 53, status: "pending", invited_user_id: null, email: "Amy@Example.com", created_at: "2026-11-11T10:00:00Z" }),
  invitation({ invitation_id: 54, status: "pending", invited_user_id: null, email: " amy@example.com ", created_at: "2026-11-13T10:00:00Z" }),
  invitation({ invitation_id: 55, status: "expired", invited_user_id: 7, email: "zed@example.com", created_at: "2026-11-14T10:00:00Z" }),
];
const pendingPairs = groupAgencyInvitationCycles(pairFeed, "pending");
assert(
  pendingPairs.length === 2 &&
    pendingPairs[0]?.key === "email:amy@example.com" &&
    pendingPairs[0]?.invitations.map((i) => i.invitation_id).join(",") === "53,54" &&
    pendingPairs[1]?.key === "user:7" &&
    pendingPairs[1]?.invitations.map((i) => i.invitation_id).join(",") === "51,52",
  "pending groups by stamped user and normalized email, sections ascending",
);
assert(
  groupAgencyInvitationCycles(pairFeed, "expired-history").length === 1 &&
    groupAgencyInvitationCycles(pairFeed, "expired-history")[0]?.invitations.length === 1,
  "expired-history admits only expired rows (no pending leak)",
);
const splitFeed = [
  invitation({ invitation_id: 61, status: "pending", invited_user_id: 9, email: "split@example.com" }),
  invitation({ invitation_id: 62, status: "pending", invited_user_id: null, email: "split@example.com" }),
];
assert(
  groupAgencyInvitationCycles(splitFeed, "pending").length === 2,
  "stamped and email-only rows for one address never merge (no email matching)",
);
const orderFeed = [
  invitation({ invitation_id: 71, status: "pending", invited_user_id: 7, created_at: "2026-11-10T10:00:00Z" }),
  invitation({ invitation_id: 72, status: "pending", invited_user_id: 8, created_at: "2026-11-15T10:00:00Z" }),
];
assert(
  groupAgencyInvitationCycles(orderFeed, "pending").map((g) => g.key).join(",") === "user:8,user:7",
  "cards order latest-activity-first",
);

// 18. Seeker pair grouping (U-054): one group per agency; the pending
//     anchor merges agency-requested expired rows for the viewer only.
const seekerFeed = [
  invitation({ invitation_id: 81, agency_id: 2, agency_name: "Beta", status: "pending", invited_user_id: 5 }),
  invitation({
    invitation_id: 82,
    agency_id: 2,
    agency_name: "Beta",
    status: "expired",
    invited_user_id: 5,
    reactivation_requested_at: "2026-11-20T10:00:00Z",
    reactivation_requested_by: 99,
  }),
  invitation({
    invitation_id: 83,
    agency_id: 3,
    agency_name: "Gamma",
    status: "expired",
    invited_user_id: 5,
    reactivation_requested_at: "2026-11-20T10:00:00Z",
    reactivation_requested_by: 5,
  }),
  invitation({ invitation_id: 84, agency_id: 3, agency_name: "Gamma", status: "accepted", invited_user_id: 5 }),
];
const seekerPending = groupMyInvitationCycles(seekerFeed, "pending", 5);
assert(
  seekerPending.length === 1 &&
    seekerPending[0]?.agencyId === 2 &&
    seekerPending[0]?.invitations.map((i) => i.invitation_id).join(",") === "81,82",
  "seeker pending merges the agency-requested expired row, drops self-requested",
);
assert(
  groupMyInvitationCycles(seekerFeed, "pending", null).length === 1 &&
    groupMyInvitationCycles(seekerFeed, "pending", null)[0]?.invitations.length === 1,
  "pending merge needs a viewer (no viewer, live pendings only)",
);
assert(
  groupMyInvitationCycles(seekerFeed, "accepted").length === 1 &&
    groupMyInvitationCycles(seekerFeed, "accepted")[0]?.agencyId === 3,
  "accepted admits accepted rows only, keyed by agency",
);
assert(
  groupMyInvitationCycles(seekerFeed, "expired-history").length === 2,
  "expired-history admits every expired row across agencies",
);

// 19. Broad-tab entity parity: container tabs count each entity once
//     across sub-tabs (a pair may sit on several tabs, U-031).
const broadFeed = [
  invitation({ invitation_id: 91, status: "pending", invited_user_id: 7, agency_id: 2, agency_name: "Beta" }),
  invitation({ invitation_id: 92, status: "expired", invited_user_id: 7, agency_id: 2, agency_name: "Beta" }),
  invitation({ invitation_id: 93, status: "pending", invited_user_id: null, email: "solo@example.com", agency_id: 3, agency_name: "Gamma" }),
];
const broadKeys = (["pending", "accepted", "rejected", "expired-history", "withdrawn-history"] as const).flatMap(
  (anchor) => groupAgencyInvitationCycles(broadFeed, anchor).map((g) => g.key),
);
assert(
  broadFeed.length === 3 && countDistinctEntities(broadKeys) === 2,
  "broad agency counter reads 2 entities for 3 rows across 2 tabs",
);
const broadAgencyIds = (["pending", "accepted", "rejected", "expired-history", "withdrawn-history"] as const).flatMap(
  (anchor) => groupMyInvitationCycles(broadFeed, anchor, 7).map((g) => g.agencyId),
);
assert(
  countDistinctEntities(broadAgencyIds) === 2,
  "broad seeker counter reads 2 agencies for 3 rows across 2 tabs",
);
assert(countDistinctEntities([]) === 0, "empty union counts zero");

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll invitation-contract checks passed.");
