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
  /** Person-entity contact line — forwarded to the canonical TimelineHeader. */
  email?: string;
  /** Person-entity avatar — forwarded to the canonical TimelineHeader. */
  avatarUrl?: string | null;
  /** Extra person-entity qualifier lines — forwarded to the canonical TimelineHeader. */
  qualifiers?: string[];
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
  avatarUrl,
  qualifiers,
}: {
  entity?: "person" | "agency";
  name: string;
  role?: string;
  status?: string;
  verified?: boolean;
  /** Optional — member-card headers without a timeline render without a
      count; timeline tiers always pass the computed count. */
  eventCount?: number;
  lastSeen?: string;
  applicationStatus?: string;
  /** Person-entity contact line, rendered directly under the name/role row
      (agency-side member cards) before the status/event-count qualifiers. */
  email?: string;
  /** Person-entity avatar (profile photo or name initials). Canonical avatar
      block shared by all member-card headers that opt in. */
  avatarUrl?: string | null;
  /** Extra person-entity qualifier lines (specialization, listing count,
      decision reason, ...). Rendered as small gray lines after the
      status/event-count row, before Last seen. */
  qualifiers?: string[];
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  /* CANONICAL SEPARATION (two distinct items, deliberately not merged):
     1. ENTITY HEADER  — name/role|verified, email, membership status,
        event count, qualifiers, last seen. Describes WHO the record is.
        Rendered in normal flow below.
     2. APPLICATION STATUS — a card-level canonical status of its own
        (approved/rejected/expired/...). It is NOT part of the header
        identity block; it is pinned to the TOP-RIGHT CORNER of the whole
        card via absolute positioning so it reads as belonging to the
        entire card, never bundled inline with the header row. */
  return (
    <div className="relative flex min-w-0 items-center gap-3">
      {/* --- Canonical item 2: application status, card top-right corner --- */}
      {applicationStatus ? (
        (() => {
          const appBadge = resolveStatusBadge(applicationStatus);
          return (
            <Badge variant={appBadge.variant} className="absolute right-0 top-0">
              {appBadge.label}
            </Badge>
          );
        })()
      ) : null}
      {/* --- Canonical item 1: entity header (normal flow) --- */}
      {entity === "person" ? (
        avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            {initials}
          </div>
        )
      ) : null}
      <div className={`min-w-0 space-y-1 text-sm text-gray-600 dark:text-gray-400${applicationStatus ? " pr-24" : ""}`}>
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
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
        </div>
        {entity === "person" && email ? (
          <div className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</div>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
          {status ? (
            <span className={`lowercase ${statusTextClass(resolveStatusBadge(status).variant)}`}>{status}</span>
          ) : null}
          {eventCount != null ? (
            <span className="lowercase">{eventCount} event{eventCount === 1 ? "" : "s"}</span>
          ) : null}
        </div>
        {(qualifiers ?? []).filter(Boolean).map((line) => (
          <div key={line} className="text-xs text-gray-500 dark:text-gray-400">{line}</div>
        ))}
        {entity === "person" && lastSeen ? (
          <div className="flex items-center gap-x-2 text-xs text-gray-400">
            <span>Last seen: {lastSeen}</span>
          </div>
        ) : null}
      </div>
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
  email,
  avatarUrl,
  qualifiers,
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
            email={email}
            avatarUrl={avatarUrl}
            qualifiers={qualifiers}
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
          email={email}
          avatarUrl={avatarUrl}
          qualifiers={qualifiers}
        />
      ) : null}
      {visibleEntries.map((entry, index) => {
        const entryId = String(entry.id ?? entry.timestamp);
        const label = resolveTimelineLabel(entry, labelStage);
        /* Shared pending-review row-variant lives HERE ONLY (canonical
           MembershipHistoryList rich tier). Derived from live row data per
           O-002 — no stored seen/resolved flag: a membership-scoped
           review_request row (the only kind carrying a `review_response`
           key) renders highlighted while `review_response` is null, and
           re-renders through the canonical badge path once the existing
           Review Requests accept/decline populates it. Same event id, same
           row — one boolean-derived render branch. */
        const isPendingReviewRow =
          entry.source_type === "review_request" &&
          entry.review_response !== undefined &&
          entry.review_response === null;

        return (
          <div
            key={entryId}
            // Shared zebra banding (grey/white alternating), no borders — same
            // pairing as the simple tier, defined here only (canonical component).
            // Pending-review rows swap the band for the shared amber ambient
            // treatment (same tokens as the ambient banner family) for the
            // whole row, so the event stays fully inside one visual unit.
            className={
              isPendingReviewRow
                ? "rounded-lg bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/40"
                : `px-4 py-3 text-sm ${timelineRowBandClass(index)}`
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatMembershipDate(entry.timestamp)}
              </div>
              {isPendingReviewRow ? (
                <Badge variant="warning">Pending</Badge>
              ) : label !== "Event" ? (
                <Badge variant={timelineActionBadgeVariant(entry)}>
                  {label}
                </Badge>
              ) : null}
            </div>
            {isPendingReviewRow ? (
              <p className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
                {entity === "person"
                  ? `${entry.user_display_name ?? "This member"} has requested a review of their revoked membership. Find it in Review Requests.`
                  : `You requested a review of this revoked membership. It is pending a response from ${entry.agency_name ?? "the agency"}.`}
              </p>
            ) : null}
            {entry.reason ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.reason}</p>
            ) : null}
            {entry.cover_note ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.cover_note}</p>
            ) : null}
            {entry.portfolio_details ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.portfolio_details}</p>
            ) : null}
            {entry.review_message ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.review_message}</p>
            ) : null}
            {entry.review_response ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.review_response}</p>
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
