import {
  hasExpiredHistory,
  hasWithdrawnHistory,
  isAgencyRequestedExpiredInvitation,
  resolveInviteeName,
} from "@/lib/membership-lifecycle-messages";
import type {
  AgencyInvitationResponse,
  AgencyJoinRequestResponse,
  MembershipTimelineEntry,
  MyAgencyJoinRequestResponse,
} from "@/types";

export function formatMembershipDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatMembershipAction(action?: string | null) {
  if (!action) return "event";
  return action.replace(/_/g, " ");
}

export function getLatestMembershipRecord(
  records: MembershipTimelineEntry[],
  agencyId?: number | string | null,
) {
  const filtered =
    agencyId == null
      ? records
      : records.filter((record) => record.agency_id != null && String(record.agency_id) === String(agencyId));

  return [...filtered].sort(
    (first, second) =>
      new Date(second.timestamp).getTime() -
      new Date(first.timestamp).getTime(),
  )[0];
}

export function getLatestRevocation(records: MembershipTimelineEntry[]) {
  return getLatestMembershipRecord(
    records.filter((record) => record.action === "revoked"),
  );
}

export function isReturningMembershipAction(action?: string | null) {
  return action === "revoked" || action === "left";
}

export interface RequestLifecycleMatch {
  status?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  originally_expired_at?: string | null;
  reactivation_requested_at?: string | null;
  reactivation_accepted_at?: string | null;
  decided_at?: string | null;
  agency_id?: number | null;
  agency_name?: string | null;
  user_id?: number | null;
}

/* Shared join-request cycle-scoping lives HERE ONLY (canonical membershipHistory module).
   Scopes a timeline to one join request's own lifecycle; downstream membership
   events appended per U-026. Callers: Approved tab (MyJoinRequestsClient),
   Expired tabs (MyJoinRequestsClient, AgencyMembersClient — U-026 parity).
   U-022d: callers serving the Expired tab pass `excludeReactivationSubEvents`
   while the record is mid-cycle, so reactivation sub-events render only via
   resolveJoinRequestReactivationTrace narrative lines, never flattened. */
export function getApprovedRequestCycleHistory(
  history: MembershipTimelineEntry[],
  request: RequestLifecycleMatch,
  opts?: { excludeReactivationSubEvents?: boolean },
): MembershipTimelineEntry[] {
  const submittedTime = request.submitted_at ?? request.created_at;
  const sameLifecycleMoment = (entryTimestamp: string, requestTimestamp: string | null | undefined) =>
    Boolean(requestTimestamp) &&
    Math.abs(new Date(entryTimestamp).getTime() - new Date(requestTimestamp as string).getTime()) <= 5_000;

  const sameDay = (entryTimestamp: string, requestTimestamp: string | null | undefined) => {
    if (!requestTimestamp) return false;
    const entryDate = new Date(entryTimestamp);
    const requestDate = new Date(requestTimestamp);
    return (
      entryDate.getUTCFullYear() === requestDate.getUTCFullYear() &&
      entryDate.getUTCMonth() === requestDate.getUTCMonth() &&
      entryDate.getUTCDate() === requestDate.getUTCDate()
    );
  };

  const cycleTimes = new Set(
    [
      submittedTime,
      request.originally_expired_at,
      request.reactivation_requested_at,
      request.reactivation_accepted_at,
      request.decided_at,
    ]
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime()),
  );

  const selected = history.filter((entry) => {
    if (request.agency_id != null && entry.agency_id != null && entry.agency_id !== request.agency_id) return false;
    if (request.user_id != null && entry.user_id != null && entry.user_id !== request.user_id) return false;
    // U-022d: mid-cycle Expired rendering — reactivation sub-events are
    // reserved for the narrative trace renderer in the caller.
    if (opts?.excludeReactivationSubEvents && ["reactivation_requested", "reactivated"].includes(entry.action ?? "")) {
      return false;
    }

    if (entry.source_type === "join_request") {
      return sameLifecycleMoment(entry.timestamp, submittedTime);
    }
    if (entry.source_type !== "audit_event") return false;
    if (
      !cycleTimes.has(new Date(entry.timestamp).getTime()) &&
      ![
        request.reactivation_requested_at,
        request.reactivation_accepted_at,
        request.originally_expired_at,
        request.decided_at,
      ].some((value) => sameLifecycleMoment(entry.timestamp, value))
    ) {
      if (entry.action === "expired" && hasExpiredHistory(request) && sameDay(entry.timestamp, request.originally_expired_at)) {
        return true;
      }
      return false;
    }
    return ["expired", "reactivation_requested", "reactivated", "joined", "approved"].includes(entry.action ?? "");
  });

  const result = [...selected];

  // U-026: downstream membership-lifecycle events. The Approved tab remains
  // scoped to the join request's own lifecycle (U-022), but audit events
  // `revoked`/`reinstated` on the membership this request CREATED, timestamped
  // after `decided_at`, are appended as additional rows — never renaming the
  // terminal "Approved" label (Rule 21 append-only preserved).
  const decidedTime = request.decided_at ? new Date(request.decided_at).getTime() : null;
  if (decidedTime != null) {
    const downstream = history.filter(
      (entry) =>
        entry.source_type === "audit_event" &&
        (entry.action === "revoked" || entry.action === "reinstated") &&
        new Date(entry.timestamp).getTime() > decidedTime &&
        !(request.agency_id != null && entry.agency_id != null && entry.agency_id !== request.agency_id) &&
        !(request.user_id != null && entry.user_id != null && entry.user_id !== request.user_id),
    );
    for (const entry of downstream) {
      const alreadyPresent = result.some(
        (existing) =>
          (existing.id !== undefined && existing.id === entry.id) ||
          (!existing.action && !entry.action) ||
          (existing.action === entry.action && existing.timestamp === entry.timestamp),
      );
      if (!alreadyPresent) result.push(entry);
    }
  }

  if (!result.some((entry) => entry.source_type === "join_request")) {
    result.push({
      source_type: "join_request",
      author_role: "seeker",
      timestamp: submittedTime || new Date().toISOString(),
      agency_id: request.agency_id ?? undefined,
      agency_name: request.agency_name ?? undefined,
      user_id: request.user_id ?? undefined,
    });
  }

  if (
    hasExpiredHistory(request) &&
    request.originally_expired_at &&
    !result.some((entry) => entry.action === "expired")
  ) {
    result.push({
      source_type: "audit_event",
      action: "expired",
      author_role: "system",
      timestamp: request.originally_expired_at,
      agency_id: request.agency_id ?? undefined,
      agency_name: request.agency_name ?? undefined,
      user_id: request.user_id ?? undefined,
    });
  }

  return annotateApprovalOrigins(result, [request], history);
}

/* Approval origin (U-053 verb rule). Derived per approved entry from its
   anchoring join row — never stored, never migrated (C2: the audit row
   cannot carry origin without a join FK, ruled out). U-051 split order on
   the anchor: reactivation_requested_by set wins, else reapplied_from, else
   reconsideration lineage (an accepted-appeal review linking the anchor's
   OWN id — a declined-then-fresh sibling links a different id and correctly
   misses), else null (fresh/origin-less renders the bare verb). Invitation
   origin needs no anchor: entry.invitation_id set is decisive (C2). */
export type ApprovalOrigin = "reapplication" | "reactivation" | "reconsideration";

export interface ApprovalOriginRow {
  join_request_id?: number | null;
  user_id?: number | null;
  agency_id?: number | null;
  decided_at?: string | null;
  reactivation_requested_by?: number | null;
  reapplied_from_request_id?: number | null;
}

export function resolveApprovalOrigin(
  anchor: ApprovalOriginRow | null,
  history: MembershipTimelineEntry[],
): ApprovalOrigin | null {
  if (anchor == null) return null;
  if (anchor.reactivation_requested_by != null) return "reactivation";
  if (anchor.reapplied_from_request_id != null) return "reapplication";
  const linkedAppeal =
    anchor.join_request_id != null &&
    history.some(
      (entry) =>
        entry.source_type === "review_request" && entry.join_request_id === anchor.join_request_id,
    );
  if (linkedAppeal) return "reconsideration";
  return null;
}

function findAnchorRow(
  entry: MembershipTimelineEntry,
  rows: ApprovalOriginRow[],
): ApprovalOriginRow | null {
  for (const row of rows) {
    if (row.user_id != null && entry.user_id != null && row.user_id !== entry.user_id) continue;
    if (row.agency_id != null && entry.agency_id != null && row.agency_id !== entry.agency_id) continue;
    if (!row.decided_at) continue;
    if (Math.abs(new Date(entry.timestamp).getTime() - new Date(row.decided_at).getTime()) > 5_000) {
      continue;
    }
    return row;
  }
  return null;
}

export type MembershipTimelineEntryWithOrigin = MembershipTimelineEntry & {
  approvalOrigin?: ApprovalOrigin | null;
};

/* Annotate joined/approved entries with their approval origin for the U-017
   map. Invitation-linked entries skip annotation (invitation_id decides
   "Accepted" in the map). Pure: returns new objects, never mutates. */
export function annotateApprovalOrigins(
  entries: MembershipTimelineEntry[],
  rows: ApprovalOriginRow[],
  history: MembershipTimelineEntry[],
): MembershipTimelineEntryWithOrigin[] {
  return entries.map((entry) => {
    if (entry.action !== "joined" && entry.action !== "approved") return entry;
    if (entry.invitation_id != null) return entry;
    const origin = resolveApprovalOrigin(findAnchorRow(entry, rows), history);
    return origin == null ? entry : { ...entry, approvalOrigin: origin };
  });
}

/* Canonical request-lifecycle timeline emitter (Rule 20, decision (a) for the
   request/invitation sub-tabs). Returns MembershipTimelineEntry[] with REAL
   `action`/`source_type`/identity fields so the rows render through the
   canonical MembershipTimeline (accordion + shared badge map + U-028 scoped
   filters), not a hand-rolled sentence loop. Extends
   getApprovedRequestCycleHistory: that stays for the Approved-tab lifecycle;
   this adds `rejected` so the Rejected tab's decision row is canonical too.
   (resolveExpiredNarrativeTimeline converted to entries the same way.) */
export function resolveRequestLifecycleTimeline(
  history: MembershipTimelineEntry[],
  request: RequestLifecycleMatch,
  viewer: { viewerUserId: number | null; viewerIsApplicant: boolean },
): MembershipTimelineEntry[] {
  const submittedAt = request.submitted_at ?? request.created_at;
  const base = getApprovedRequestCycleHistory(history, request);

  const rows: MembershipTimelineEntry[] = [...base];

  // Submitted row (join_request source) — already appended by the base function.
  // Rejected decision: surface as a canonical audit_event so the badge map and
  // the Rejected tab agree (the base allowlist omits "rejected").
  if (request.decided_at && request.status === "rejected") {
    const already = rows.some(
      (entry) => entry.action === "rejected" && entry.timestamp === request.decided_at,
    );
    if (!already) {
      const actorRole = viewer.viewerIsApplicant ? "agency" : "seeker";
      rows.push({
        source_type: "audit_event",
        author_role: actorRole,
        action: "rejected",
        timestamp: request.decided_at,
        agency_id: request.agency_id ?? undefined,
        agency_name: request.agency_name ?? undefined,
        user_id: request.user_id ?? undefined,
      });
    }
  }

  // Ensure a submitted anchor always exists, mirroring the base function.
  if (!rows.some((entry) => entry.source_type === "join_request" && entry.timestamp === submittedAt)) {
    rows.push({
      source_type: "join_request",
      author_role: "seeker",
      timestamp: submittedAt || new Date().toISOString(),
      agency_id: request.agency_id ?? undefined,
      agency_name: request.agency_name ?? undefined,
      user_id: request.user_id ?? undefined,
    });
  }

  // Stable chronological order, same as the narrative resolver.
  return rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/* Shared invitation column timeline lives HERE ONLY (canonical
   membershipHistory module). Synthesizes canonical audit_event rows from
   the invitation's own lifecycle columns — the reliable backbone the
   per-tab contract renders ("Sent", "Withdrawn", "Expired", "Interest
   expressed", "Reactivation requested"). Column truth, never feed-derived:
   the audit feed carries lifecycle rows too, and merging both without this
   split duplicates. The Expired row keys off live status (expires_at alone
   is a deadline, not an event). Both invitation surfaces consume this —
   never hand-roll invitation rows per card. */
export function resolveInvitationColumnTimeline(
  invitation: Pick<
    AgencyInvitationResponse,
    | "agency_id"
    | "agency_name"
    | "created_at"
    | "expires_at"
    | "interest_expressed_at"
    | "invited_user_id"
    | "reactivation_requested_at"
    | "reactivation_requested_by"
    | "rejected_at"
    | "status"
    | "withdrawn_at"
  >,
): MembershipTimelineEntry[] {
  const identity = {
    agency_id: invitation.agency_id ?? undefined,
    agency_name: invitation.agency_name ?? undefined,
    user_id: invitation.invited_user_id ?? undefined,
  };
  const rows: MembershipTimelineEntry[] = [
    {
      source_type: "audit_event",
      action: "sent",
      author_role: "agency",
      timestamp: invitation.created_at,
      ...identity,
    },
  ];
  if (invitation.withdrawn_at) {
    rows.push({
      source_type: "audit_event",
      action: "withdrawn",
      author_role: "agency",
      timestamp: invitation.withdrawn_at,
      ...identity,
    });
  }
  if (invitation.status === "expired") {
    rows.push({
      source_type: "audit_event",
      action: "expired",
      author_role: "system",
      timestamp: invitation.expires_at,
      ...identity,
    });
  }
  // Status-gated like the expired arm above: only rejected invitations
  // render the rejection moment, so Pending/Expired/Withdrawn/Accepted
  // compositions are untouched.
  if (invitation.status === "rejected" && invitation.rejected_at) {
    rows.push({
      source_type: "audit_event",
      action: "rejected",
      author_role: "seeker",
      timestamp: invitation.rejected_at,
      ...identity,
    });
  }
  if (invitation.interest_expressed_at) {
    rows.push({
      source_type: "audit_event",
      action: "interest_expressed",
      author_role: "seeker",
      timestamp: invitation.interest_expressed_at,
      ...identity,
    });
  }
  if (invitation.reactivation_requested_at) {
    rows.push({
      source_type: "audit_event",
      action: "reactivation_requested",
      author_role:
        invitation.reactivation_requested_by != null &&
        invitation.reactivation_requested_by === invitation.invited_user_id
          ? "seeker"
          : "agency",
      timestamp: invitation.reactivation_requested_at,
      ...identity,
    });
  }
  return rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/* Invitation decision-result filter lives HERE ONLY (shared helper
   mirroring getRevokedMembershipHistory). Returns the terminal
   interest-path outcomes from one invitation's audit feed: the queue
   decline (reactivation_rejected) and the queue/inbox accept (joined).
   Lifecycle rows (invited, withdrawn, interest_expressed, reactivated)
   stay out — the column timeline carries the lifecycle, so admitting
   them would render every event twice. */
const INVITATION_DECISION_ACTIONS: ReadonlySet<string> = new Set([
  "reactivation_rejected",
  "joined",
]);

export function getInvitationDecisionResults(
  history: MembershipTimelineEntry[],
): MembershipTimelineEntry[] {
  return history.filter(
    (entry) => entry.action != null && INVITATION_DECISION_ACTIONS.has(entry.action),
  );
}

/* Rejected-then-apply correlation lives HERE ONLY (shared helper, both
   invitation surfaces). Matches join requests that followed a rejected
   invitation for the same person, so the Rejected card gains its later
   "Applied" events. Match key is (agency_id, user_id) ONLY — never email
   (lead ruling on item 2). Missing user ids mean the viewer (the seeker
   list carries no user_id; legacy invitations carry no invitee): the
   applicant view trusts list membership, so NULLs attest; the agency view
   requires the stamped pair, so legacy NULL rows never correlate there.
   Strictly after the rejection; ascending. No rejection date, no match. */
export interface InvitationApplicationCandidate {
  agency_id?: number | null;
  user_id?: number | null;
  submitted_at: string;
}

export function getInvitationSubsequentApplications(
  invitation: {
    agency_id: number;
    invited_user_id?: number | null;
    rejected_at?: string | null;
  },
  requests: InvitationApplicationCandidate[],
  viewer: { viewerUserId: number | null; viewerIsApplicant: boolean },
): InvitationApplicationCandidate[] {
  if (!invitation.rejected_at) return [];
  if (viewer.viewerIsApplicant && viewer.viewerUserId == null) return [];
  const rejectedTime = new Date(invitation.rejected_at).getTime();
  return requests
    .filter((request) => {
      if ((request.agency_id ?? null) !== invitation.agency_id) return false;
      if (new Date(request.submitted_at).getTime() <= rejectedTime) return false;
      if (viewer.viewerIsApplicant) {
        const inviteeIsViewer =
          invitation.invited_user_id == null ||
          invitation.invited_user_id === viewer.viewerUserId;
        const requesterIsViewer =
          request.user_id == null || request.user_id === viewer.viewerUserId;
        return inviteeIsViewer && requesterIsViewer;
      }
      return (
        invitation.invited_user_id != null &&
        request.user_id === invitation.invited_user_id
      );
    })
    .sort(
      (a, b) =>
        new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
    );
}

/* U-030: accepted-invitation downstream events live HERE ONLY (extension
   of the U-026 shape to the invitations lifecycle). An accepted
   invitation's card already carries its own lifecycle as Sent/Accepted
   date lines, so this selector returns ONLY the subsequent
   membership-level events (revoked, reinstated) on the membership the
   acceptance created — matched by (agency_id, user_id) strictly after
   accepted_at, never by email. Invitation-lifecycle rows stay out: the
   card dates speak for them, and admitting them would render every event
   twice. No accepted_at, no downstream. The agency view requires the
   stamped invitee pair; the applicant view trusts own-feed membership, so
   NULLs attest (same rule as getInvitationSubsequentApplications). */
export interface AcceptedInvitationMatch {
  agency_id?: number | null;
  invited_user_id?: number | null;
  accepted_at?: string | null;
}

const ACCEPTED_DOWNSTREAM_ACTIONS: ReadonlySet<string> = new Set([
  "revoked",
  "reinstated",
]);

/* Invitee header qualifiers live HERE ONLY (Rule 20 SSOT / Rule 24 — one
   component, one resolver). Given an invitee key, return the shared
   member-header qualifier lines from whatever member record exists, else
   nothing: invitees who never joined have no roster record, so their
   headers correctly stay name-and-email only. Every invitation header on
   every tab calls this — nothing resolves invitee qualifiers inline. */
export interface HeaderQualifierRecord {
  qualifiers?: string[] | undefined;
}

export function resolveInviteeHeaderQualifiers(
  memberById: ReadonlyMap<number, HeaderQualifierRecord>,
  invitedUserId?: number | null,
): string[] | undefined {
  if (invitedUserId == null) return undefined;
  return memberById.get(invitedUserId)?.qualifiers;
}

/* Agency verification lookup lives HERE ONLY (Rule 20 SSOT — one
   resolver). Given a membership list, return the agency's verified flag
   for agency-entity header display, else undefined (TimelineHeader then
   omits the line): pending invitees hold no membership yet, so their
   headers correctly show no verification state. Every agency-entity
   invitation header calls this — nothing looks it up inline. */
export interface AgencyVerificationRecord {
  agency_id?: number | null;
  is_verified?: boolean | null;
}

export function resolveAgencyIsVerified(
  memberships: ReadonlyArray<AgencyVerificationRecord>,
  agencyId?: number | null,
): boolean | undefined {
  if (agencyId == null) return undefined;
  return memberships.find((m) => m.agency_id === agencyId)?.is_verified ?? undefined;
}

export function getAcceptedInvitationDownstreamEvents(
  history: MembershipTimelineEntry[],
  invitation: AcceptedInvitationMatch,
  viewer: { viewerUserId: number | null; viewerIsApplicant: boolean },
): MembershipTimelineEntry[] {
  if (!invitation.accepted_at) return [];
  const acceptedTime = new Date(invitation.accepted_at).getTime();
  return history
    .filter((entry) => {
      if (entry.source_type !== "audit_event") return false;
      if (entry.action == null || !ACCEPTED_DOWNSTREAM_ACTIONS.has(entry.action)) {
        return false;
      }
      if (new Date(entry.timestamp).getTime() <= acceptedTime) return false;
      if (
        invitation.agency_id != null &&
        entry.agency_id != null &&
        entry.agency_id !== invitation.agency_id
      ) {
        return false;
      }
      if (viewer.viewerIsApplicant) {
        if (viewer.viewerUserId == null) return false;
        const inviteeIsViewer =
          invitation.invited_user_id == null ||
          invitation.invited_user_id === viewer.viewerUserId;
        const subjectIsViewer =
          entry.user_id == null || entry.user_id === viewer.viewerUserId;
        return inviteeIsViewer && subjectIsViewer;
      }
      return (
        invitation.invited_user_id != null &&
        entry.user_id === invitation.invited_user_id
      );
    })
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

/* Accepted-invitation full timeline lives HERE ONLY (U-030 as ruled:
   header plus full timeline; dates are rows, count equals rows). Column
   lifecycle rows plus invitation-scoped audit decision rows plus the
   downstream membership events. The three sources are action-disjoint by
   construction (column never emits joined/revoked/reinstated; decision
   admits only reactivation_rejected/joined; downstream admits only
   revoked/reinstated), so no dedup pass is needed. The accept moment
   itself comes from the joined audit row; legacy acceptances without one
   synthesize it from accepted_at (invitation_id set, so the canonical
   map renders Accepted, never a bare verb) — mutually exclusive with the
   real row, so synthesis can never double-render. */
export interface AcceptedInvitationTimeline {
  invitation_id: number;
  agency_id: number;
  agency_name: string;
  invited_user_id?: number | null;
  accepted_at?: string | null;
  created_at: string;
  expires_at: string;
  interest_expressed_at?: string | null;
  reactivation_requested_at?: string | null;
  reactivation_requested_by?: number | null;
  status: AgencyInvitationResponse["status"];
  withdrawn_at?: string | null;
}

export function resolveAcceptedInvitationTimeline(
  invitation: AcceptedInvitationTimeline,
  history: MembershipTimelineEntry[],
  viewer: { viewerUserId: number | null; viewerIsApplicant: boolean },
): MembershipTimelineEntry[] {
  const rows = [
    ...resolveInvitationColumnTimeline(invitation),
    ...getInvitationDecisionResults(
      history.filter((entry) => entry.invitation_id === invitation.invitation_id),
    ),
    ...getAcceptedInvitationDownstreamEvents(history, invitation, viewer),
  ];
  if (invitation.accepted_at && !rows.some((entry) => entry.action === "joined")) {
    rows.push({
      source_type: "audit_event",
      action: "joined",
      author_role: "seeker",
      timestamp: invitation.accepted_at,
      agency_id: invitation.agency_id ?? undefined,
      agency_name: invitation.agency_name ?? undefined,
      user_id: invitation.invited_user_id ?? undefined,
      invitation_id: invitation.invitation_id,
    });
  }
  return rows.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/* Rejected-invitation full timeline lives HERE ONLY (same ruling).
   Column lifecycle rows (sent plus the status-gated rejected arm) plus
   subsequent applications mapped to canonical rows, ascending. The
   card's ambient sentence is not an event and stays outside the rows. */
export function resolveRejectedInvitationTimeline(
  invitation: Pick<
    AgencyInvitationResponse,
    | "agency_id"
    | "agency_name"
    | "created_at"
    | "expires_at"
    | "interest_expressed_at"
    | "invited_user_id"
    | "reactivation_requested_at"
    | "reactivation_requested_by"
    | "rejected_at"
    | "status"
    | "withdrawn_at"
  >,
  applications: InvitationApplicationCandidate[],
): MembershipTimelineEntry[] {
  return [
    ...resolveInvitationColumnTimeline(invitation),
    ...applications.map((application) => ({
      source_type: "audit_event",
      action: "applied",
      author_role: "seeker",
      timestamp: application.submitted_at,
      agency_id: application.agency_id ?? undefined,
      user_id: application.user_id ?? undefined,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/* Shared Expired-tab narration lives HERE ONLY (canonical membershipHistory module).
   U-022d + expired-tab incident fix (2026-08-29): the Expired tab narrates its
   ENTIRE lifecycle as ONE chronological stream — submitted, expired, reactivation
   requested/accepted, approval, and downstream revoked/reinstated (U-026) — merged
   into a single array carrying real timestamps, sorted ascending, rendered as one
   banded loop. Never two separate lists (that produced out-of-order rows). */
/* Expired-narrative row entries (U-054 conversion): the U-022d wording
   rides narrative_text verbatim while canonical action/source_type/
   identity fields let rows render through the shared timeline
   (badge map, keys, reveal, banding) instead of a hand loop. */
export type ExpiredNarrativeEntry = MembershipTimelineEntry & {
  narrative_text: string;
};

export function resolveExpiredNarrativeTimeline(
  history: MembershipTimelineEntry[],
  request: RequestLifecycleMatch & {
    seeker_name?: string | null;
    reactivation_requested_by?: number | null;
  },
  viewer: { viewerUserId: number | null; viewerIsApplicant: boolean },
): ExpiredNarrativeEntry[] {
  const { viewerUserId, viewerIsApplicant } = viewer;
  const viewerInitiated =
    request.reactivation_requested_by != null &&
    viewerUserId != null &&
    request.reactivation_requested_by === viewerUserId;

  const agencyName = request.agency_name ?? "Agency";
  const seekerName = request.seeker_name ?? "Applicant";
  const identity = {
    agency_id: request.agency_id ?? undefined,
    agency_name: request.agency_name ?? undefined,
    user_id: request.user_id ?? undefined,
  };
  // Actor roles are absolute (mirroring the invitation column arms):
  // the requester is whoever requested_by names, the accepter the
  // other side; expiry is systemic.
  const requesterRole =
    request.reactivation_requested_by != null && request.reactivation_requested_by === request.user_id
      ? "seeker"
      : "agency";
  const accepterRole = requesterRole === "seeker" ? "agency" : "seeker";

  const events: ExpiredNarrativeEntry[] = [];

  const submittedAt = request.submitted_at ?? request.created_at;
  if (submittedAt) {
    events.push({
      source_type: "join_request",
      author_role: "seeker",
      timestamp: submittedAt,
      narrative_text: viewerIsApplicant ? "You submitted application" : `${seekerName} submitted application`,
      ...identity,
    });
  }

  if (request.originally_expired_at) {
    events.push({
      source_type: "audit_event",
      action: "expired",
      author_role: "system",
      timestamp: request.originally_expired_at,
      narrative_text: "Application expired",
      ...identity,
    });
  }

  if (request.reactivation_requested_at) {
    const narrative_text = viewerInitiated
      ? "You requested to reactivate application"
      : viewerIsApplicant
        ? `${agencyName} requested to reactivate application`
        : `${seekerName} requested to reactivate application`;
    events.push({
      source_type: "audit_event",
      action: "reactivation_requested",
      author_role: requesterRole,
      timestamp: request.reactivation_requested_at,
      narrative_text,
      ...identity,
    });
  }

  if (request.reactivation_accepted_at) {
    const narrative_text = viewerInitiated
      ? viewerIsApplicant
        ? `${agencyName} accepted your reactivation request`
        : `${seekerName} accepted your reactivation request`
      : "You accepted reactivation request";
    events.push({
      source_type: "audit_event",
      action: "reactivation_accepted",
      author_role: accepterRole,
      timestamp: request.reactivation_accepted_at,
      narrative_text,
      ...identity,
    });
  }

  if (request.decided_at && (request.status === "approved" || request.status === "reactivated")) {
    events.push({
      source_type: "audit_event",
      action: "approved",
      author_role: "agency",
      timestamp: request.decided_at,
      narrative_text: viewerIsApplicant
        ? `${agencyName} approved application`
        : `You approved ${seekerName}'s application`,
      ...identity,
    });
  }

  // U-026 downstream membership events (revoked/reinstated) tied to the
  // membership this request created, timestamped strictly after approval.
  // The real audit rows pass through (label, badge, keys all real) with
  // the narrative wording attached.
  const decidedTime = request.decided_at ? new Date(request.decided_at).getTime() : null;
  if (decidedTime != null) {
    const downstream = history.filter(
      (entry) =>
        entry.source_type === "audit_event" &&
        (entry.action === "revoked" || entry.action === "reinstated") &&
        new Date(entry.timestamp).getTime() > decidedTime &&
        !(request.agency_id != null && entry.agency_id != null && entry.agency_id !== request.agency_id) &&
        !(request.user_id != null && entry.user_id != null && entry.user_id !== request.user_id),
    );
    for (const entry of downstream) {
      const pastTense = entry.action === "revoked" ? "revoked" : "reinstated";
      events.push({
        ...entry,
        narrative_text: viewerIsApplicant
          ? `${agencyName} ${pastTense} membership`
          : `You ${pastTense} ${seekerName}'s membership`,
      });
    }
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/* Expired pair header badge lives HERE ONLY (Rule 20 SSOT — one
   resolver). U-021: a static "expired" badge conflates when the pair's
   lifecycle moved on (e.g. ends at a revoked membership). Where the
   pair's latest request is expired, show expired; otherwise show the
   live membership status, falling back to the live application status.
   All inputs and outputs are raw status strings (the shared badge map
   formats). */
export function resolveExpiredPairBadgeStatus(
  latestRequestStatus?: string | null,
  memberStatus?: string | null,
): string {
  if (latestRequestStatus === "expired") return "expired";
  return memberStatus ?? latestRequestStatus ?? "expired";
}

/* Shared tab-scoped membership-history filter lives HERE ONLY (canonical
   membershipHistory module). Single implementation of the PREFLIGHT Rule 22
   discriminator contract for membership history tabs: consumes BOTH
   `source_type` and `action`. `action` parameter selects the tab scope
   ('revoked', 'left', ...). Callers: seeker Revoked/Left tabs
   (MyJoinRequestsClient), agency Revoked tab (AgencyMembersClient). */
export function getMembershipHistoryByAction(
  history: MembershipTimelineEntry[],
  match: { agency_id?: number | null; agency_name?: string | null; user_id?: number | null },
  action: string,
): MembershipTimelineEntry[] {
  return history.filter((entry) => {
    if (match.user_id != null && entry.user_id != null && entry.user_id !== match.user_id) return false;
    if (match.agency_id != null && entry.agency_id != null && entry.agency_id !== match.agency_id) return false;
    if (match.agency_name && entry.agency_name && entry.agency_name !== match.agency_name && match.agency_id == null) return false;

    return entry.source_type === "audit_event" && entry.action === action;
  });
}

/**
 * Revoked-tab scope filter (DEF-U-REVOKED-TAB-DISCRIMINATOR-001).
 * Preflight Rule 22 pre-check (2026-08-26): every entry exposed by
 * `/agencies/{id}/membership-history/` carries `source_type` + `action`;
 * this filter consumes BOTH discriminators. Only audit events whose action
 * is literally `revoked` belong on this append-only history tab — join
 * requests, review requests, and other audit actions have their own tabs,
 * and rendering them here was the discriminator gap.
 */
/* ===========================================================================
   Revoked-tab scope filter (DEF-U-REVOKED-TAB-DISCRIMINATOR-001) + U-035
   two-row appeal rendering (supersedes U-034's single-row fold).

   INTENDED SEMANTICS: the appeal (a membership-scoped review_request against
   a revocation) and its resolution are ALWAYS two distinct, permanent,
   canonical rows — structurally identical to how every event already renders
   in the History tab. The request row keeps its canonical "Review requested"
   badge permanently (never mutated in place); the resolution audit event
   (reinstated/review_declined) renders as its own row with its own badge,
   message, timestamp, and actor. The ONLY conditional element is the
   ephemeral "New" marker + ambient notice on the UNRESOLVED request row
   (agency tab only, gated via pendingReviewHighlight), which discharges on
   resolution.

   The `reviewResolution` annotation below is retained SOLELY as the
   unresolved-detection lookup (does a resolution audit exist downstream of
   this request's lineage?) — it never merges or mutates row content
   (U-035; Rule 20 SSOT).
   ========================================================================== */

/* Cumulative request-lifecycle emitter (Rule 20 SSOT for multi-cycle cards).
   One card spans N requests, so the per-request resolveRequestLifecycleTimeline
   cannot serve these tabs (calling it per row would emit N separate timelines
   and destroy the cumulative card). Produces ONE MembershipTimelineEntry[] per
   group with canonical action/source_type/identity fields, rendered through the
   canonical MembershipTimeline rich tier. Consumers: seeker + agency Cancelled
   cards, seeker + agency Rejected cards.
   Card composition (locked): the card holds ONLY its own lineage, in one
   global chronological (ascending) order — Cancelled = submitted/cancelled/
   reapplied rows; approved, reactivation and unrelated pending rows are
   filtered here, never leaked in. Per-row "No reapply"/"Not part of a cycle"
   microcopy is gone with the hand-rolled loops; per-entry Cycle rides the
   preserved cycle_number slot, and group-level CTAs/ambients stay in the
   card shell.
   U-034b terminal discriminator (fresh vs returning-appeal rejections):
   a returning-appeal rejection (reactivation_requested_at set — the U-013
   discriminator) is terminal immediately; otherwise terminal only after a
   second rejection. Cancelled groups are never terminal (Apply Again is gated
   by the cooldown ambient, not terminality). Invitation-scoped OUT. */
export interface CumulativeRequestMatch {
  join_request_id: number;
  status?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  decided_at?: string | null;
  cancel_reason?: string | null;
  rejection_reason?: string | null;
  cover_note?: string | null;
  portfolio_details?: string | null;
  reapplication_message?: string | null;
  reapplied_from_request_id?: number | null;
  reactivation_requested_at?: string | null;
  agency_id?: number | null;
  agency_name?: string | null;
  user_id?: number | null;
  seeker_name?: string | null;
  cycle_number?: number | null;
}

/* Multipath supersession markers (U-055 cross-repo contract — exact
   strings copied from backend agencies.py MULTIPATH_CLOSE_REASON and
   MULTIPATH_CLOSE_REASON_APPROVE). Every row closed by
   _close_multipath_pending_rows carries exactly one: the plain reason
   when invitation-accept resolved the pair, the approve reason when
   join-approve did. Frontend exact-matches the set (isLegacyMachineReason
   precedent) to exclude superseded rows from U-034b counting and CTAs.
   Never reword without a coordinated change. */
const MULTIPATH_SUPERSEDED_REASONS: ReadonlySet<string> = new Set([
  "Auto-closed: membership resolved through another path.",
  "Auto-closed: membership approved through another path.",
]);

export function isMultipathSupersededReason(reason: string | null | undefined): boolean {
  return reason != null && MULTIPATH_SUPERSEDED_REASONS.has(reason);
}

export type MultipathResolution = "accepted" | "approved";

export function resolveMultipathResolution(reason: string | null | undefined): MultipathResolution | null {
  if (reason == null || !MULTIPATH_SUPERSEDED_REASONS.has(reason)) return null;
  return reason === "Auto-closed: membership approved through another path." ? "approved" : "accepted";
}

/* Multipath invitation scan lives HERE ONLY (one scan). Invitations carry
   no reason column, so supersession is read off the withdrawn audit row
   in the invitation's events feed (exact marker match). Marker wins over
   status: a pending-status row carrying the marker is already closed
   server-side (stale view), so it renders superseded. */
export function resolveInvitationMultipathResolution(
  feed: MembershipTimelineEntry[],
): MultipathResolution | null {
  const closing = feed.find(
    (entry) => entry.action === "withdrawn" && isMultipathSupersededReason(entry.reason),
  );
  return closing ? resolveMultipathResolution(closing.reason) : null;
}

export interface CumulativeRequestLifecycle {
  entries: CumulativeRequestLifecycleEntry[];
  /** U-034b group terminality (rejected groups only; always false for
      cancelled). Terminal groups render no-op: no Apply Again, no
      reconsider CTA. */
  terminal: boolean;
  /** True when any rejected row carries the U-013 returning-appeal
      discriminator (reactivation_requested_at). Cards render the terminal
      reactivation message for such groups. */
  hasReturningAppealRejection: boolean;
}

/** A timeline entry annotated by the cumulative emitter with its pending-
    reapply state. Used ONLY for the ephemeral "New" marker + ambient notice
    affordance on the pending reapply's submission row (U-035 family) — never
    merges or mutates row content. Not part of the wire contract. Follows the
    MembershipTimelineEntryWithResolution precedent below. */
export type CumulativeRequestLifecycleEntry = MembershipTimelineEntry & {
  isPendingReapply?: boolean;
  /** Set on a reconsideration-appeal event row while its appeal is live
      (pending_appeal present). Drives the agency-only ephemeral "New"
      marker + ambient notice (Revoked-mechanism reuse, U-035 family) —
      never merges or mutates row content. Not part of the wire contract. */
  isPendingReconsideration?: boolean;
  /** Preserved per-entry cycle attribution (backend cycle_number). Renders
      "Cycle: N" on both rows of a numbered pair; null/undefined renders no
      label (never "Not part of a cycle" / "No reapply"). */
  cycle_number?: number | null;
  /** Carried for the shared label map: submitted anchors of reapply rows
      render "Reapplied" instead of "Submitted" (U-017 extension). */
  reapplied_from_request_id?: number | null;
  /** Multipath supersession (U-055): set on decision rows whose rejection
      reason is a locked close marker. The row renders with the
      resolved-elsewhere notice and no machine reason, and never counts
      toward the U-034b terminal discriminator. */
  multipathResolution?: MultipathResolution | null;
};

/* Shared timeline-entry key lives HERE ONLY (timelineEntryKey). Backend
   ids collide across the three source tables (U-033 found the same
   collision on queue rows), so id-carrying entries key on
   source_type:id, never the bare id — multi-source timelines now put two
   sources on one list. Synthesized entries without an id fall back to
   source+action+timestamp so same-timestamp rows (e.g. a
   null-decided_at cancel sharing its submitted anchor's timestamp) never
   collide as React keys. */
export function timelineEntryKey(entry: {
  id?: number | null;
  source_type: string;
  action?: string | null;
  timestamp: string;
}): string {
  if (entry.id != null) {
    return `${entry.source_type}:${entry.id}`;
  }

  return `${entry.source_type}:${entry.action ?? "row"}:${entry.timestamp}`;
}

/* Shared agency request-cycle grouping lives HERE ONLY (canonical
   membershipHistory module). Groups are anchored by users carrying the
   given anchor; member rows follow the anchor kind: cancelled/rejected
   keep all rows (the cumulative emitter filters each group's rows to its
   own lineage downstream); every other anchor keeps anchor rows only
   (Expired narrative blocks and Approved per-request sections are
   per-row self-contained).
   Consumers: Cancelled + Rejected + Expired + Approved sub-tabs. */
export interface AgencyRequestCycleGroup {
  userId: number;
  seekerName: string;
  seekerEmail?: string | null;
  requests: AgencyJoinRequestResponse[];
}

export type AgencyRequestCycleAnchor = "cancelled" | "rejected" | "expired-history" | "approved";

export function groupAgencyRequestCycles(
  requests: AgencyJoinRequestResponse[],
  anchor: AgencyRequestCycleAnchor,
) {
  const isAnchorRow =
    anchor === "expired-history"
      ? (request: AgencyJoinRequestResponse) => hasExpiredHistory(request)
      : (request: AgencyJoinRequestResponse) => request.status === anchor;
  const userIdsWithAnchor = new Set(
    requests.filter(isAnchorRow).map((request) => request.user_id),
  );
  const groups = new Map<number, AgencyRequestCycleGroup>();

  for (const request of requests) {
    if (!userIdsWithAnchor.has(request.user_id)) continue;
    if (anchor !== "cancelled" && anchor !== "rejected" && !isAnchorRow(request)) continue;
    const current = groups.get(request.user_id);
    if (current) {
      current.requests.push(request);
      continue;
    }

    groups.set(request.user_id, {
      userId: request.user_id,
      seekerName: request.seeker_name ?? "Seeker",
      seekerEmail: request.seeker_email,
      requests: [request],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      requests: [...group.requests].sort(
        (first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
      ),
    }))
    .sort((first, second) => first.seekerName.localeCompare(second.seekerName));
}

/* Shared seeker request-cycle grouping lives HERE ONLY (canonical
   membershipHistory module). One group per agency; cancelledRequests,
   expiredRequests, rejectedRequests and approvedRequests subsets ride
   along; the anchor selects which subset admits the group. Consumers:
   Cancelled + Expired + Rejected + Approved sub-tabs. */
export interface MyJoinRequestCycleGroup {
  agencyId: number;
  agencyName: string;
  requests: MyAgencyJoinRequestResponse[];
  cancelledRequests: MyAgencyJoinRequestResponse[];
  expiredRequests: MyAgencyJoinRequestResponse[];
  rejectedRequests: MyAgencyJoinRequestResponse[];
  approvedRequests: MyAgencyJoinRequestResponse[];
}

export type MyJoinRequestCycleAnchor = "cancelled" | "expired-history" | "rejected" | "approved";

export function groupMyJoinRequestCycles(
  requests: MyAgencyJoinRequestResponse[],
  anchor: MyJoinRequestCycleAnchor = "cancelled",
) {
  const groups = new Map<number, MyJoinRequestCycleGroup>();

  for (const request of requests) {
    // Expired-history anchor admits ONLY rows that ever passed through expired
    // (mirrors the agency grouper) — pending/approved rows in the same agency
    // must not leak Expired sections into the card.
    if (anchor === "expired-history" && !hasExpiredHistory(request)) continue;
    // Rejected anchor admits ONLY rejected rows (card content and the
    // latest-rejection payload for reconsideration stay exact).
    if (anchor === "rejected" && request.status !== "rejected") continue;
    // Approved anchor admits ONLY approved rows (per-request sections
    // inside one pair card render their own lifecycle each).
    if (anchor === "approved" && request.status !== "approved") continue;
    const current = groups.get(request.agency_id);
    if (current) {
      current.requests.push(request);
      if (request.status === "cancelled") current.cancelledRequests.push(request);
      if (hasExpiredHistory(request)) current.expiredRequests.push(request);
      if (request.status === "rejected") current.rejectedRequests.push(request);
      if (request.status === "approved") current.approvedRequests.push(request);
      continue;
    }

    groups.set(request.agency_id, {
      agencyId: request.agency_id,
      agencyName: request.agency_name,
      requests: [request],
      cancelledRequests: request.status === "cancelled" ? [request] : [],
      expiredRequests: hasExpiredHistory(request) ? [request] : [],
      rejectedRequests: request.status === "rejected" ? [request] : [],
      approvedRequests: request.status === "approved" ? [request] : [],
    });
  }

  const subsetKey =
    anchor === "expired-history"
      ? "expiredRequests"
      : anchor === "rejected"
        ? "rejectedRequests"
        : anchor === "approved"
          ? "approvedRequests"
          : "cancelledRequests";
  const bySubmittedAt = (
    first: MyAgencyJoinRequestResponse,
    second: MyAgencyJoinRequestResponse,
  ) =>
    new Date(first.submitted_at).getTime() - new Date(second.submitted_at).getTime();

  return [...groups.values()]
    .filter((group) => group[subsetKey].length > 0)
    .map((group) => ({
      ...group,
      requests: [...group.requests].sort(bySubmittedAt),
      cancelledRequests: [...group.cancelledRequests].sort(bySubmittedAt),
      expiredRequests: [...group.expiredRequests].sort(bySubmittedAt),
      rejectedRequests: [...group.rejectedRequests].sort(bySubmittedAt),
    }))
    .sort((first, second) => first.agencyName.localeCompare(second.agencyName));
}

/* Invitee email normalization lives HERE ONLY (Rule 20 SSOT — one
   normalizer). Email-only invitees (NULL invited_user_id) group by this
   key until the registration stamp lands a user id; stamped rows group
   by user id and never merge into an email-keyed group (no matching by
   email across tables). */
export function normalizeInviteeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

/* Shared agency invitation-cycle grouping lives HERE ONLY (canonical
   membershipHistory module, U-054). One group per invitee: stamped rows
   key on invited_user_id, email-only rows on the normalized email.
   Admission is anchor-rows-only per tab (own lifecycle, U-031); cards
   order latest-activity-first with a key tiebreak, sections ascend.
   Consumers: agency Pending/Accepted/Rejected/Expired/Withdrawn tabs. */
export interface AgencyInvitationCycleGroup {
  key: string;
  userId: number | null;
  inviteeName: string;
  inviteeEmail: string | null;
  invitations: AgencyInvitationResponse[];
}

export type InvitationCycleAnchor =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired-history"
  | "withdrawn-history";

const byInvitationCreatedAt = (
  first: AgencyInvitationResponse,
  second: AgencyInvitationResponse,
) =>
  new Date(first.created_at).getTime() - new Date(second.created_at).getTime() ||
  first.invitation_id - second.invitation_id;

function latestInvitationCreatedAt(group: { invitations: AgencyInvitationResponse[] }): number {
  return group.invitations.reduce(
    (max, invitation) => Math.max(max, new Date(invitation.created_at).getTime()),
    0,
  );
}

function isAnchorInvitation(
  invitation: AgencyInvitationResponse,
  anchor: InvitationCycleAnchor,
  viewerUserId: number | null,
): boolean {
  if (anchor === "expired-history") return hasExpiredHistory(invitation);
  if (anchor === "withdrawn-history") return hasWithdrawnHistory(invitation);
  if (anchor === "pending") {
    // Seeker Pending merges agency-requested expired rows (contract);
    // agency Pending admits live pendings only (the merge predicate is
    // invitee-relative, so agency callers pass no viewer).
    return (
      invitation.status === "pending" ||
      isAgencyRequestedExpiredInvitation(invitation, viewerUserId)
    );
  }
  return invitation.status === anchor;
}

export function groupAgencyInvitationCycles(
  invitations: AgencyInvitationResponse[],
  anchor: InvitationCycleAnchor,
) {
  const groups = new Map<string, AgencyInvitationCycleGroup>();

  for (const invitation of invitations) {
    if (!isAnchorInvitation(invitation, anchor, null)) continue;
    const userId = invitation.invited_user_id ?? null;
    const key =
      userId != null
        ? `user:${userId}`
        : `email:${normalizeInviteeEmail(invitation.email)}`;
    const current = groups.get(key);
    if (current) {
      current.invitations.push(invitation);
      continue;
    }

    groups.set(key, {
      key,
      userId,
      inviteeName: resolveInviteeName(invitation),
      inviteeEmail: invitation.email ?? null,
      invitations: [invitation],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      invitations: [...group.invitations].sort(byInvitationCreatedAt),
    }))
    .sort(
      (first, second) =>
        latestInvitationCreatedAt(second) - latestInvitationCreatedAt(first) ||
        (first.key < second.key ? -1 : first.key > second.key ? 1 : 0),
    );
}

/* Shared seeker invitation-cycle grouping lives HERE ONLY (canonical
   membershipHistory module, U-054). One group per agency; the pending
   anchor merges agency-requested expired rows per the viewer-relative
   contract (viewerUserId required for that anchor only). Consumers:
   seeker Pending/Accepted/Rejected/Expired/Withdrawn tabs. */
export interface MyInvitationCycleGroup {
  agencyId: number;
  agencyName: string;
  invitations: AgencyInvitationResponse[];
}

export function groupMyInvitationCycles(
  invitations: AgencyInvitationResponse[],
  anchor: InvitationCycleAnchor,
  viewerUserId: number | null = null,
) {
  const groups = new Map<number, MyInvitationCycleGroup>();

  for (const invitation of invitations) {
    if (!isAnchorInvitation(invitation, anchor, viewerUserId)) continue;
    const current = groups.get(invitation.agency_id);
    if (current) {
      current.invitations.push(invitation);
      continue;
    }

    groups.set(invitation.agency_id, {
      agencyId: invitation.agency_id,
      agencyName: invitation.agency_name,
      invitations: [invitation],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      invitations: [...group.invitations].sort(byInvitationCreatedAt),
    }))
    .sort(
      (first, second) =>
        latestInvitationCreatedAt(second) - latestInvitationCreatedAt(first) ||
        first.agencyId - second.agencyId,
    );
}

/* Distinct-entity counting lives HERE ONLY (Rule 20 SSOT — one
   counter). Broad container tabs count each entity once even when it
   appears in several sub-tabs (U-031 fixed placement allows that);
   sub-tab counters read their own group's length. Callers pass the
   union of visible group keys — never raw rows. */
export function countDistinctEntities(keys: Array<string | number>): number {
  return new Set(keys).size;
}

export function resolveCumulativeRequestLifecycleTimeline(
  requests: CumulativeRequestMatch[],
  entity: { kind: "cancelled" | "rejected" },
): CumulativeRequestLifecycle {
  const submittedTimeOf = (request: CumulativeRequestMatch) =>
    request.submitted_at ?? request.created_at ?? new Date().toISOString();

  const sorted = [...requests].sort((first, second) => {
    const timeDiff =
      new Date(submittedTimeOf(first)).getTime() - new Date(submittedTimeOf(second)).getTime();
    if (timeDiff !== 0) return timeDiff;
    return first.join_request_id - second.join_request_id;
  });

  // Lineage filter: only rows belonging to this card's lifecycle. Everything
  // else (approved rows, reactivation rows, unrelated pendings) has its own
  // tab and must not leak in.
  const lineage =
    entity.kind === "cancelled"
      ? sorted.filter(
          (request) =>
            request.status === "cancelled" ||
            (request.status === "pending" && request.reapplication_message != null),
        )
      : sorted.filter((request) => request.status === "rejected");

  // U-034b terminal discriminator. Returning-appeal rejections (U-013:
  // reactivation_requested_at set) are terminal immediately; fresh requests
  // stay actionable until a second rejection lands. Multipath-superseded
  // rows (U-055 locked marker) are not real rejections and never count.
  const rejectedRows =
    entity.kind === "rejected"
      ? lineage.filter((request) => !isMultipathSupersededReason(request.rejection_reason))
      : [];
  const hasReturningAppealRejection = rejectedRows.some(
    (request) => request.reactivation_requested_at != null,
  );
  const terminal =
    entity.kind === "rejected" &&
    (hasReturningAppealRejection || rejectedRows.length >= 2);

  const entries: CumulativeRequestLifecycleEntry[] = [];
  for (const request of lineage) {
    const submittedAt = submittedTimeOf(request);
    const identity = {
      agency_id: request.agency_id ?? undefined,
      agency_name: request.agency_name ?? undefined,
      user_id: request.user_id ?? undefined,
    };
    // Submitted anchor. Per-cycle messages ride the canonical verbatim slots
    // (rendered by the rich tier); values are raw, never prefixed — canonical
    // parity with every other timeline surface.
    entries.push({
      source_type: "join_request",
      author_role: "seeker",
      timestamp: submittedAt,
      cover_note: request.cover_note ?? null,
      portfolio_details: request.portfolio_details ?? null,
      reapplication_message: request.reapplication_message ?? null,
      cycle_number: request.cycle_number ?? null,
      reapplied_from_request_id: request.reapplied_from_request_id ?? null,
      isPendingReapply:
        entity.kind === "cancelled" &&
        request.status === "pending" &&
        request.reapplication_message != null,
      ...identity,
    });
    // Decision row. Rejected rows record the reason inline (U-026 downstream
    // extension: everything downstream of the first canonical rejection,
    // including decision reason/message, stays visible in the card).
    if (entity.kind === "cancelled" && request.status === "cancelled") {
      entries.push({
        source_type: "audit_event",
        author_role: "seeker",
        action: "cancelled",
        timestamp: request.decided_at ?? submittedAt,
        reason: request.cancel_reason ?? null,
        cycle_number: request.cycle_number ?? null,
        ...identity,
      });
    }
    if (entity.kind === "rejected" && request.status === "rejected") {
      // U-055: superseded rows keep their decision row (audit trail) but the
      // machine reason never renders (U-053) — the tier shows the
      // resolved-elsewhere notice from the annotation instead.
      const multipathResolution = resolveMultipathResolution(request.rejection_reason);
      entries.push({
        source_type: "audit_event",
        author_role: "agency",
        action: "rejected",
        timestamp: request.decided_at ?? submittedAt,
        reason: multipathResolution ? null : (request.rejection_reason ?? null),
        cycle_number: request.cycle_number ?? null,
        multipathResolution,
        ...identity,
      });
    }
  }

  // One global chronological order, ascending (narrative reading order,
  // matching the migrated hand-rolled loops).
  entries.sort(
    (first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime(),
  );
  return { entries, terminal, hasReturningAppealRejection };
}

export type MembershipReviewResolutionAction = "reinstated" | "review_declined";

/** A timeline entry annotated by the Revoked-tab filter with its matched
    resolution action. Used ONLY for unresolved-detection of the ephemeral
    "New" marker / ambient notice affordance (U-035) — never merges or
    mutates row content. Not part of the wire contract. */
export type MembershipTimelineEntryWithResolution = MembershipTimelineEntry & {
  reviewResolution?: MembershipReviewResolutionAction;
};

export function getRevokedMembershipHistory(
  history: MembershipTimelineEntry[],
  match: { agency_id?: number | null; agency_name?: string | null; user_id?: number | null },
  opts?: { includeReviewRequests?: boolean },
): MembershipTimelineEntryWithResolution[] {
  const revoked = getMembershipHistoryByAction(history, match, "revoked");
  if (!opts?.includeReviewRequests) return revoked;

  const entityMatch = (entry: MembershipTimelineEntry): boolean => {
    if (match.user_id != null && entry.user_id != null && entry.user_id !== match.user_id) return false;
    if (match.agency_id != null && entry.agency_id != null && entry.agency_id !== match.agency_id) return false;
    return true;
  };

  // The appeal is a SINGLE row. Filter for membership-scoped review_request
  // rows (no join linkage — only the reconsideration flow links), then
  // annotate each with its matched resolution action (the latest
  // reinstated/review_declined audit for the same agency+user that happened
  // AFTER this appeal). Do NOT append those audit events as separate rows.
  // Join-linked reconsideration appeals belong to Rejected cards
  // (getRejectedAppealHistory), never here.
  const reviewRows: MembershipTimelineEntryWithResolution[] = history
    .filter((entry) => entry.source_type === "review_request" && entry.join_request_id == null && entityMatch(entry))
    .map((entry) => {
      const entityTime = (x: MembershipTimelineEntry) => new Date(x.timestamp).getTime();

      // Find the immediately following resolution event for this specific appeal
      const resolutionEvent = history
        .filter(
          (other) =>
            other.source_type === "audit_event" &&
            (other.action === "review_declined" || other.action === "reinstated") &&
            entityMatch(other) &&
            (other.agency_id ?? null) === (entry.agency_id ?? null) &&
            (other.user_id ?? null) === (entry.user_id ?? null) &&
            entityTime(other) > entityTime(entry),
        )
        .sort((a, b) => entityTime(a) - entityTime(b))[0];

      const reviewResolution =
        resolutionEvent?.action === "reinstated" || resolutionEvent?.action === "review_declined"
          ? resolutionEvent.action
          : undefined;

      return {
        ...entry,
        reviewResolution,
      };
    });

  // Resolution rows: EVERY reinstated/review_declined audit event on this
  // entity renders as its own permanent, canonical row (U-035) — with or
  // without a preceding review_request — identical in shape to how the
  // History tab already renders these events.
  const resolutionRows = history.filter(
    (entry) =>
      entry.source_type === "audit_event" &&
      (entry.action === "reinstated" || entry.action === "review_declined") &&
      entityMatch(entry),
  );

  // Single uniform chronological sort by each row's OWN timestamp, descending
  // (newest first) — no resolvedAt substitution, matching MembershipTimeline's
  // default sort and the History tab exactly (U-035).
  return [...revoked, ...reviewRows, ...resolutionRows].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/* Canonical rejected-appeal filter lives HERE ONLY (shared helper mirroring
   getRevokedMembershipHistory). Returns the reconsideration-appeal history
   rows for one Rejected card: source review_request rows carrying join
   linkage (the reconsideration POST is the sole linking flow), matched by
   user+agency. Untouched rows — the label resolves through the shared U-017
   map, so History and Rejected render the identical row identically.
   pending_appeal stays OUT of this filter: it is only the gate and the
   ambient discharge signal, supplied by the caller as markLive. */
export function getRejectedAppealHistory(
  history: MembershipTimelineEntry[],
  match: { agency_id?: number | null; user_id?: number | null },
  markLive: boolean,
): CumulativeRequestLifecycleEntry[] {
  return history
    .filter(
      (entry) =>
        entry.source_type === "review_request" &&
        entry.join_request_id != null &&
        (match.user_id == null || entry.user_id == null || entry.user_id === match.user_id) &&
        (match.agency_id == null || entry.agency_id == null || entry.agency_id === match.agency_id),
    )
    .map((entry) => ({
      ...entry,
      isPendingReconsideration: markLive || undefined,
    }));
}
