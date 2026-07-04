import type { AgentMembershipAudit, MembershipTimelineEntry } from "@/types";

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
      : records.filter((record) => record.agency_name && String(record.agency_name) === String(agencyId));

  return [...filtered].sort(
    (first, second) =>
      new Date(second.timestamp).getTime() -
      new Date(first.timestamp).getTime(),
  )[0];
}

export function getLatestAuditRecord(
  records: AgentMembershipAudit[],
  agencyId?: number | string | null,
) {
  const filtered =
    agencyId == null
      ? records
      : records.filter((record) => String(record.agency_id) === String(agencyId));

  return [...filtered].sort(
    (first, second) =>
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime(),
  )[0];
}

export function getLatestRevocation(records: MembershipTimelineEntry[]) {
  return getLatestMembershipRecord(
    records.filter((record) => record.action === "revoked"),
  );
}

export function getLatestAuditRevocation(records: AgentMembershipAudit[]) {
  return getLatestAuditRecord(
    records.filter((record) => record.action === "revoked"),
  );
}

export function isReturningMembershipAction(action?: string | null) {
  return action === "revoked" || action === "left";
}
