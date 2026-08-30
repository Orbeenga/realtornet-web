import { hasExpiredHistory } from "@/lib/membership-lifecycle-messages";
import type { MembershipTimelineEntry } from "@/types";

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

  return result;
}

/* Shared Expired-tab narration lives HERE ONLY (canonical membershipHistory module).
   U-022d + expired-tab incident fix (2026-08-29): the Expired tab narrates its
   ENTIRE lifecycle as ONE chronological stream — submitted, expired, reactivation
   requested/accepted, approval, and downstream revoked/reinstated (U-026) — merged
   into a single array carrying real timestamps, sorted ascending, rendered as one
   banded loop. Never two separate lists (that produced out-of-order rows). */
export function resolveExpiredNarrativeTimeline(
  history: MembershipTimelineEntry[],
  request: RequestLifecycleMatch & {
    seeker_name?: string | null;
    reactivation_requested_by?: number | null;
  },
  viewer: { viewerUserId: number | null; viewerIsApplicant: boolean },
): Array<{ text: string; at: string }> {
  const { viewerUserId, viewerIsApplicant } = viewer;
  const viewerInitiated =
    request.reactivation_requested_by != null &&
    viewerUserId != null &&
    request.reactivation_requested_by === viewerUserId;

  const agencyName = request.agency_name ?? "Agency";
  const seekerName = request.seeker_name ?? "Applicant";

  const events: Array<{ text: string; at: string }> = [];

  const submittedAt = request.submitted_at ?? request.created_at;
  if (submittedAt) {
    events.push({
      text: viewerIsApplicant ? "You submitted application" : `${seekerName} submitted application`,
      at: submittedAt,
    });
  }

  if (request.originally_expired_at) {
    events.push({ text: "Application expired", at: request.originally_expired_at });
  }

  if (request.reactivation_requested_at) {
    const text = viewerInitiated
      ? "You requested to reactivate application"
      : viewerIsApplicant
        ? `${agencyName} requested to reactivate application`
        : `${seekerName} requested to reactivate application`;
    events.push({ text, at: request.reactivation_requested_at });
  }

  if (request.reactivation_accepted_at) {
    const text = viewerInitiated
      ? viewerIsApplicant
        ? `${agencyName} accepted your reactivation request`
        : `${seekerName} accepted your reactivation request`
      : "You accepted reactivation request";
    events.push({ text, at: request.reactivation_accepted_at });
  }

  if (request.decided_at && (request.status === "approved" || request.status === "reactivated")) {
    events.push({
      text: viewerIsApplicant
        ? `${agencyName} approved application`
        : `You approved ${seekerName}'s application`,
      at: request.decided_at,
    });
  }

  // U-026 downstream membership events (revoked/reinstated) tied to the
  // membership this request created, timestamped strictly after approval.
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
        text: viewerIsApplicant
          ? `${agencyName} ${pastTense} membership`
          : `You ${pastTense} ${seekerName}'s membership`,
        at: entry.timestamp,
      });
    }
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
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
export function getRevokedMembershipHistory(
  history: MembershipTimelineEntry[],
  match: { agency_id?: number | null; agency_name?: string | null; user_id?: number | null },
  opts?: { includeReviewRequests?: boolean },
): MembershipTimelineEntry[] {
  const revoked = getMembershipHistoryByAction(history, match, "revoked");
  if (!opts?.includeReviewRequests) return revoked;
  // In-flight + resolved review requests tied to this revoked membership,
  // appended to the same array (U-019 Tier 2b: decision-history tabs carry the
  // full artifact timeline, including the review message). The renderer labels
  // source_type === "review_request" rows canonically ("Review requested") and
  // the submitted request surfaces immediately via the existing
  // useCreateAgencyReviewRequest invalidation of ["membershipHistory"].
  const reviewRows = history.filter(
    (entry) =>
      entry.source_type === "review_request" &&
      !(match.user_id != null && entry.user_id != null && entry.user_id !== match.user_id) &&
      !(match.agency_id != null && entry.agency_id != null && entry.agency_id !== match.agency_id),
  );
  return [...revoked, ...reviewRows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
