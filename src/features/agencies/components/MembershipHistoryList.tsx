"use client";

import { useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "@/components";
import { formatMembershipDate } from "./membershipHistory";
import type { MembershipTimelineEntry } from "@/types";

interface MembershipHistoryListProps {
  history?: MembershipTimelineEntry[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

function getSourceBadgeLabel(sourceType: string) {
  if (sourceType === "audit_event") return "Agency Action";
  if (sourceType === "join_request") return "Application";
  if (sourceType === "review_request") return "Review Request";
  return sourceType.replace(/_/g, " ");
}

function getSourceBadgeVariant(sourceType: string): "success" | "danger" | "warning" | "outline" {
  if (sourceType === "audit_event") return "outline";
  if (sourceType === "join_request") return "warning";
  if (sourceType === "review_request") return "success";
  return "outline";
}

function getActionBadgeVariant(action?: string | null) {
  if (action === "joined" || action === "reinstated") return "success" as const;
  if (action === "revoked" || action === "suspended" || action === "blocked") return "danger" as const;
  if (action === "left") return "warning" as const;
  return "outline" as const;
}

function formatAction(action?: string | null) {
  if (!action) return "event";
  return action.replace(/_/g, " ");
}

export function MembershipHistoryList({
  history,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No membership history",
  emptyDescription = "Agency membership events will appear here when they exist.",
}: MembershipHistoryListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
      new Date(second.timestamp).getTime() -
      new Date(first.timestamp).getTime(),
  );

  const visibleEntries = isExpanded ? sortedHistory : sortedHistory.slice(0, 2);
  const hasMoreEntries = sortedHistory.length > 2;

  return (
    <div className="space-y-3">
      {visibleEntries.map((entry) => {
        const entryId = String(entry.id ?? entry.timestamp);

        return (
          <div
            key={entryId}
            className="rounded-lg border border-border p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {entry.user_display_name ?? entry.agency_name ?? "Unknown"}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatMembershipDate(entry.timestamp)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={getSourceBadgeVariant(entry.source_type)}>
                  {getSourceBadgeLabel(entry.source_type)}
                </Badge>
                {entry.action ? (
                  <Badge variant={getActionBadgeVariant(entry.action)}>
                    {formatAction(entry.action)}
                  </Badge>
                ) : null}
              </div>
            </div>
            {entry.reason ? (
              <p className="mt-3 rounded-lg bg-gray-50 p-3 leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                {entry.reason}
              </p>
            ) : null}
            {entry.cover_note ? (
              <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">Original application message</p>
                <p className="whitespace-pre-wrap">{entry.cover_note}</p>
              </div>
            ) : null}
            {entry.portfolio_details ? (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Portfolio</p>
                <p className="whitespace-pre-wrap">{entry.portfolio_details}</p>
              </div>
            ) : null}
            {entry.review_message ? (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">Review request</p>
                <p className="whitespace-pre-wrap">{entry.review_message}</p>
              </div>
            ) : null}
            {entry.review_response ? (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Agency response</p>
                <p className="whitespace-pre-wrap">{entry.review_response}</p>
              </div>
            ) : null}
            {entry.prior_role || entry.post_role ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Role: {entry.prior_role ?? "not recorded"} to{" "}
                {entry.post_role ?? "not recorded"}
              </p>
            ) : null}
          </div>
        );
      })}
      {hasMoreEntries ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Hide" : `View ${sortedHistory.length - 2} more events`}
        </Button>
      ) : null}
    </div>
  );
}
