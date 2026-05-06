"use client";

import { Badge, EmptyState, ErrorState, LoadingState } from "@/components";
import { formatMembershipAction, formatMembershipDate } from "./membershipHistory";
import type { AgentMembershipAudit } from "@/types";

interface MembershipHistoryListProps {
  history?: AgentMembershipAudit[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

function getHistoryBadgeVariant(action: string) {
  if (action === "joined" || action === "reinstated") {
    return "success" as const;
  }

  if (action === "revoked" || action === "suspended") {
    return "danger" as const;
  }

  if (action === "left") {
    return "warning" as const;
  }

  return "outline" as const;
}

export function MembershipHistoryList({
  history,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No membership history",
  emptyDescription = "Agency membership events will appear here when they exist.",
}: MembershipHistoryListProps) {
  if (isLoading) {
    return <LoadingState message="Loading membership history..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load membership history"
        message="There was a problem loading agency membership history."
        onRetry={onRetry}
      />
    );
  }

  if (!history || history.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const sortedHistory = [...history].sort(
    (first, second) =>
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime(),
  );

  return (
    <div className="space-y-3">
      {sortedHistory.map((record) => (
        <div
          key={record.id}
          className="rounded-lg border border-border p-4 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">
                {record.agency_name ?? `Agency #${record.agency_id}`}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatMembershipDate(record.created_at)}
              </p>
            </div>
            <Badge variant={getHistoryBadgeVariant(record.action)}>
              {formatMembershipAction(record.action)}
            </Badge>
          </div>
          {record.reason ? (
            <p className="mt-3 rounded-lg bg-gray-50 p-3 leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
              {record.reason}
            </p>
          ) : null}
          {record.prior_role || record.post_role ? (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Role: {record.prior_role ?? "not recorded"} to{" "}
              {record.post_role ?? "not recorded"}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
