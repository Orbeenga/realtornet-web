"use client";

import { useState } from "react";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "@/components";
import { resolveStatusBadge } from "@/lib/membership-lifecycle-messages";
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
  showHeader?: boolean;
  /** Header contract discriminator (U-019): person = name|role|status|event_count|last_seen, agency = name|verified|event_count */
  entity?: "person" | "agency";
  /** The member's own fixed role. Never derive from entry.author_role (event author ≠ member). */
  role?: string;
  status?: string;
  verified?: boolean;
  lastSeen?: string;
  /** Discriminator for action→label resolution (U-017 option b): the lifecycle
      context this timeline renders. `joined` renders as "Approved" under
      "join_request" (join-request approval) and stays "Accepted" (U-014) for
      invitation acceptance. Consumers pass this explicitly; no silent per-tier map. */
  labelStage?: "invitation" | "join_request";
  /** Application-level status badge rendered top-right on the header, independent
      of the membership-status qualifier below. Used where application status and
      membership status need to coexist (e.g., Approved tab showing "approved"
      badge + "active" qualifier). */
  applicationStatus?: string;
}

/* Shared timeline row zebra-banding lives HERE ONLY (canonical MembershipHistoryList
   component). Alternating grey/white row banding by index; consumed by both timeline
   tiers and any surface rendering timeline rows. */
export function timelineRowBandClass(index: number): string {
  return index % 2 === 1 ? "bg-gray-100 dark:bg-gray-800/60" : "";
}

const REDUNDANT_ACTIONS = new Set(["joined", "submitted"]);

function resolveTimelineLabel(
  entry: MembershipTimelineEntry,
  labelStage: "invitation" | "join_request" = "invitation",
): string {
  if (entry.action) {
    const raw = entry.action.replace(/_/g, " ");
    if (entry.action === "joined") return labelStage === "join_request" ? "Approved" : "Accepted";
    if (entry.action === "review_requested") return "Review requested";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (entry.source_type === "join_request") return "Submitted";
  if (entry.source_type === "review_request") return "Review requested";
  return "Event";
}

// Keyed off the same action/source_type shapes resolveTimelineLabel consumes (U-019).
function timelineActionBadgeVariant(entry: MembershipTimelineEntry) {
  const action = entry.action;
  if (!action) return "outline" as const;
  if (action === "joined" || action === "reinstated" || action === "approved") return "success" as const;
  if (action === "revoked" || action === "suspended" || action === "blocked") return "danger" as const;
  if (action === "left") return "warning" as const;
  return "outline" as const;
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
  if (action === "submitted") return sameDay.some((s) => s.action === "submitted" && s.id !== entry.id);
  return false;
}

// Text-colour counterparts of the shared Badge variant palette (resolveStatusBadge variants)
function statusTextClass(variant: "default" | "warning" | "success" | "danger" | "outline") {
  if (variant === "success") return "text-green-700 dark:text-green-300";
  if (variant === "danger") return "text-red-700 dark:text-red-300";
  if (variant === "warning") return "text-amber-700 dark:text-amber-300";
  return "text-gray-500 dark:text-gray-400";
}

export function TimelineHeader({
  entity = "person",
  name,
  role,
  status,
  verified,
  eventCount,
  lastSeen,
  applicationStatus,
  email,
}: {
  entity?: "person" | "agency";
  name: string;
  role?: string;
  status?: string;
  verified?: boolean;
  eventCount: number;
  lastSeen?: string;
  applicationStatus?: string;
  /** Person-entity contact line, rendered directly under the name/role row
      (agency-side member cards) before the status/event-count qualifiers. */
  email?: string;
}) {
  return (
    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="font-medium text-gray-900 dark:text-white">{name}</span>
          {entity === "person" && role ? (
            <span className="text-xs lowercase text-blue-700 dark:text-blue-300">{role}</span>
          ) : null}
          {entity === "agency" && verified !== undefined ? (
            <span className={`text-xs ${verified ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {verified ? "Verified" : "Unverified"}
            </span>
          ) : null}
        </div>
        {applicationStatus
          ? (() => {
              const appBadge = resolveStatusBadge(applicationStatus);
              return (
                <Badge variant={appBadge.variant} className="ml-auto">
                  {appBadge.label}
                </Badge>
              );
            })()
          : null}
      </div>
      {entity === "person" && email ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">{email}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
        {status ? (
          <span className={`lowercase ${statusTextClass(resolveStatusBadge(status).variant)}`}>{status}</span>
        ) : null}
        <span className="lowercase">{eventCount} event{eventCount === 1 ? "" : "s"}</span>
      </div>
      {entity === "person" && lastSeen ? (
        <div className="flex items-center gap-x-2 text-xs text-gray-400">
          <span>Last seen: {lastSeen}</span>
        </div>
      ) : null}
    </div>
  );
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
  showHeader = true,
  entity = "person",
  role,
  status,
  verified,
  lastSeen,
  labelStage = "invitation",
  applicationStatus,
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

    const headerName = defaultUserDisplayName ?? sorted[0]?.user_display_name ?? sorted[0]?.agency_name ?? "Unknown";
    const headerStatus = status ?? (sorted[0]?.action ? resolveTimelineLabel(sorted[0], labelStage) : "");
    const eventCount = sorted.length;

    return (
      <div className="space-y-2">
        {showHeader ? (
          <TimelineHeader
            entity={entity}
            name={headerName}
            role={role}
            status={headerStatus}
            verified={verified}
            eventCount={eventCount}
            lastSeen={lastSeen}
            applicationStatus={applicationStatus}
          />
        ) : null}
        {visible.map((entry, index) => (
          <p
            key={entry.id ?? entry.timestamp}
            className={`text-sm leading-6 text-gray-700 dark:text-gray-300 ${
              timelineRowBandClass(index)
            }`}
          >
            {/* Shared zebra banding lives HERE ONLY (canonical timeline component).
                Light pair: transparent / gray-50. Dark pair: transparent / white/5. */}

            {resolveTimelineLabel(entry, labelStage)} - {formatMembershipDate(entry.timestamp)}
          </p>
        ))}
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (first, second) =>
      new Date(second.timestamp).getTime() -
      new Date(first.timestamp).getTime(),
  );

  const showAllEntries = alwaysExpanded || isExpanded;
  const visibleEntries = showAllEntries ? sortedHistory : sortedHistory.slice(0, 2);
  const hasMoreEntries = sortedHistory.length > 2 && !alwaysExpanded;

  const headerName = defaultUserDisplayName ?? sortedHistory[0]?.user_display_name ?? sortedHistory[0]?.agency_name ?? "Unknown";
  const headerStatus = status ?? (sortedHistory[0]?.action ? resolveTimelineLabel(sortedHistory[0], labelStage) : "");
  const eventCount = sortedHistory.length;

  return (
    <div className="space-y-3">
      {showHeader ? (
        <TimelineHeader
          entity={entity}
          name={headerName}
          role={role}
          status={headerStatus}
          verified={verified}
          eventCount={eventCount}
          lastSeen={lastSeen}
          applicationStatus={applicationStatus}
        />
      ) : null}
      {visibleEntries.map((entry, index) => {
        const entryId = String(entry.id ?? entry.timestamp);
        const label = resolveTimelineLabel(entry, labelStage);

        return (
          <div
            key={entryId}
            // Shared zebra banding (grey/white alternating), no borders — same
            // pairing as the simple tier, defined here only (canonical component).
            className={`px-4 py-3 text-sm ${timelineRowBandClass(index)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatMembershipDate(entry.timestamp)}
              </div>
              {label !== "Event" ? (
                <Badge variant={timelineActionBadgeVariant(entry)}>
                  {label}
                </Badge>
              ) : null}
            </div>
            {entry.reason ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.reason}</p>
            ) : null}
            {entry.cover_note ? (
              <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
                <p className="whitespace-pre-wrap">{entry.cover_note}</p>
              </div>
            ) : null}
            {entry.portfolio_details ? (
              <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
                <p className="whitespace-pre-wrap">{entry.portfolio_details}</p>
              </div>
            ) : null}
            {entry.review_message ? (
              <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
                <p className="whitespace-pre-wrap">{entry.review_message}</p>
              </div>
            ) : null}
            {entry.review_response ? (
              <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
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
