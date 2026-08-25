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
      entryDate.getFullYear() === requestDate.getFullYear() &&
      entryDate.getMonth() === requestDate.getMonth() &&
      entryDate.getDate() === requestDate.getDate()
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
      if (entry.action === "expired" && sameDay(entry.timestamp, request.originally_expired_at)) {
        return true;
      }
      return false;
    }
    return ["expired", "reactivation_requested", "reactivated", "joined", "approved"].includes(entry.action ?? "");
  });

  if (selected.some((entry) => entry.source_type === "join_request")) return selected;
  return [
    {
      source_type: "join_request",
      author_role: "seeker",
      timestamp: submittedTime || new Date().toISOString(),
      agency_id: request.agency_id ?? undefined,
      agency_name: request.agency_name ?? undefined,
      user_id: request.user_id ?? undefined,
    },
    ...selected,
  ];
}

const REVOKED_MEMBERSHIP_ACTIONS = new Set([
  "joined",
  "revoked",
  "suspended",
  "reinstated",
  "left",
  "blocked",
  "review_requested",
]);

export function getRevokedMembershipHistory(
  history: MembershipTimelineEntry[],
  match: { agency_id?: number | null; agency_name?: string | null; user_id?: number | null },
): MembershipTimelineEntry[] {
  return history.filter((entry) => {
    if (match.user_id != null && entry.user_id != null && entry.user_id !== match.user_id) return false;
    if (match.agency_id != null && entry.agency_id != null && entry.agency_id !== match.agency_id) return false;
    if (match.agency_name && entry.agency_name && entry.agency_name !== match.agency_name && match.agency_id == null) return false;

    if (entry.source_type === "join_request") return true;
    if (entry.source_type === "review_request") return true;
    if (entry.source_type === "audit_event") {
      return entry.action ? REVOKED_MEMBERSHIP_ACTIONS.has(entry.action) : false;
    }
    return false;
  });
}
