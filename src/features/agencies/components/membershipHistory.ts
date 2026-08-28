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
   events appended per U-026. Callers: Approved tab (MyJoinRequestsClient). */
export function getApprovedRequestCycleHistory(
  history: MembershipTimelineEntry[],
  request: RequestLifecycleMatch,
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
): MembershipTimelineEntry[] {
  return getMembershipHistoryByAction(history, match, "revoked");
}
