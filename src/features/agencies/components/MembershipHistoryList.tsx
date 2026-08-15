"use client";

import { useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "@/components";
import { formatMembershipDate } from "./membershipHistory";
import type { MembershipTimelineEntry } from "@/types";

interface MembershipTimelineProps {
  history?: MembershipTimelineEntry[];
  tier: "simple" | "rich";
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  defaultUserDisplayName?: string;
  alwaysExpanded?: boolean;
}

const REDUNDANT_ACTIONS = new Set(["joined", "applied"]);

function getTimelineLabel(entry: MembershipTimelineEntry): string {
  const action = entry.action?.replace(/_/g, " ") ?? "";
  if (action) return action;
  if (entry.source_type === "join_request") return "Applied";
  if (entry.source_type === "review_request") return "Review requested";
  return "Event";
}

function isRedundant(entry: MembershipTimelineEntry, siblings: MembershipTimelineEntry[]): boolean {
  const action = entry.action;
  if (!action || !REDUNDANT_ACTIONS.has(action)) return false;
  const sameDay = siblings.filter(
    (s) =>
      s.id !== entry.id &&
      s.action &&
      new Date(s.timestamp).toDateString() === new Date(entry.timestamp).toDateString(),
  );
  if (action === "joined") return sameDay.some((s) => s.action === "approved");
  if (action === "applied") return sameDay.some((s) => s.action === "submitted");
  return false;
}

function getActionBadgeVariant(action?: string | null) {
  if (action === "joined" || action === "reinstated") return "success" as const;
  if (action === "revoked" || action === "suspended" || action === "blocked") return "danger" as const;
  if (action === "left") return "warning" as const;
  return "outline" as const;
}

function formatAction(action?: string | null, sourceType?: string | null) {
  if (action) return action.replace(/_/g, " ");
  if (sourceType === "join_request") return "Applied";
  if (sourceType === "review_request") return "Review requested";
  return "Event";
}

export function MembershipTimeline({
  history,
  tier,
  isLoading,
  isError,
  onRetry,
  emptyTitle = tier === "rich" ? "No membership history" : "No events",
  emptyDescription = tier === "rich" ? "Agency membership events will appear here when they exist." : "Events will appear here when they exist.",
  defaultUserDisplayName,
  alwaysExpanded = false,
}: MembershipTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    if (tier === "rich") {
      return <LoadingState message="Loading membership history..." />;
    }
    return null;
  }

  if (isError) {
    if (tier === "rich") {
      return (
        <ErrorState
          title="Could not load membership history"
          message="There was a problem loading agency membership history."
          onRetry={onRetry}
        />
      );
    }
    return null;
  }

  if (!history || history.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (tier === "simple") {
    const sorted = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const visible = sorted.filter((entry) => !isRedundant(entry, sorted));

    return (
      <div className="space-y-2">
        {visible.map((entry) => (
          <div
            key={entry.id ?? entry.timestamp}
            className="rounded-lg border border-border p-3 text-sm leading-6"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {getTimelineLabel(entry)} - {formatMembershipDate(entry.timestamp)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (first, second) =>
      new Date(second.timestamp).getTime() -
      new Date(first.timestamp).getTime(),
  );

  const visibleEntries = alwaysExpanded ? sortedHistory : sortedHistory.slice(0, 2);
  const hasMoreEntries = sortedHistory.length > 2 && !alwaysExpanded;

  const headerName = defaultUserDisplayName ?? sortedHistory[0]?.user_display_name ?? sortedHistory[0]?.agency_name ?? "Unknown";
  const headerRole = sortedHistory[0]?.author_role ?? "";
  const eventCount = sortedHistory.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-900 dark:text-white">{headerName}</span>
        {headerRole ? (
          <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{headerRole}</span>
        ) : null}
        <span className="text-xs text-gray-400">{eventCount} event{eventCount === 1 ? "" : "s"}</span>
      </div>
      {visibleEntries.map((entry) => {
        const entryId = String(entry.id ?? entry.timestamp);

        return (
          <div
            key={entryId}
            className="rounded-lg border border-border p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatMembershipDate(entry.timestamp)}
              </div>
              {entry.action ? (
                <Badge variant={getActionBadgeVariant(entry.action)}>
                  {formatAction(entry.action, entry.source_type)}
                </Badge>
              ) : null}
            </div>
            {entry.reason ? (
              <p className="mt-3 rounded-lg bg-gray-50 p-3 leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                {entry.reason}
              </p>
            ) : null}
            {entry.cover_note ? (
              <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                <p className="whitespace-pre-wrap">{entry.cover_note}</p>
              </div>
            ) : null}
            {entry.portfolio_details ? (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                <p className="whitespace-pre-wrap">{entry.portfolio_details}</p>
              </div>
            ) : null}
            {entry.review_message ? (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="whitespace-pre-wrap">{entry.review_message}</p>
              </div>
            ) : null}
            {entry.review_response ? (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p className="whitespace-pre-wrap">{entry.review_response}</p>
              </div>
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

