"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Badge, Button, EmptyState, ErrorState, LoadingState } from "@/components";
import {
  ambientTextToneClass,
  isLegacyMachineReason,
  resolveReapplyPendingNotice,
  resolveReapplyPendingSeekerAmbient,
  resolveReconsiderationPendingNotice,
  resolveRevokedReviewNotice,
  resolveStatusBadge,
} from "@/lib/membership-lifecycle-messages";
import {
  annotateApprovalOrigins,
  formatMembershipDate,
  timelineEntryKey,
  type ApprovalOrigin,
  type ApprovalOriginRow,
  type CumulativeRequestLifecycleEntry,
  type MembershipTimelineEntryWithResolution,
} from "./membershipHistory";
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
  showHeader?: boolean;
  /** Header contract discriminator (U-019): person = name|role|status|event_count|last_seen, agency = name|verified|event_count */
  entity?: "person" | "agency";
  /** Optional entity link for the header name, passed through. */
  href?: string;
  /** The member's own fixed role. Never derive from entry.author_role (event author ≠ member). */
  role?: string;
  status?: string;
  verified?: boolean;
  lastSeen?: string;
  /** Join rows for approval-origin annotation (U-053 verb rule): approved
      entries correlate to their anchoring row for origin stems
      ("Reapplication/Reactivation/Reconsideration approved"). Without rows
      the map renders the bare verb. (Replaces labelStage: origin decides,
      not the surface.) */
  originRows?: ApprovalOriginRow[];
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
  /** OPT-IN, agency Revoked tab ONLY: renders a sibling notice line below
      unresolved membership-scoped review_request rows (row itself stays
      canonical). All other consumers omit this — canonical rendering
      everywhere else. */
  pendingReviewHighlight?: boolean;
  /** Optional controlled reveal state (rich tier). When provided, the parent
      owns expanded/collapsed and internal state is bypassed — enabling parents
      to gate fetch-more controls behind the reveal (disclosure sequencing:
      never expose "fetch more" while the bounded reveal is still collapsed). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;

  /** OPT-IN, cumulative Cancelled cards ONLY: renders the ephemeral "New"
      marker + reapply-pending ambient adjacent to the pending reapply's
      submission row (entries annotated `isPendingReapply` by the cumulative
      emitter, U-035 family). Agency renders above the row, seeker below —
      matching the migrated hand-rolled loops. All other consumers omit this. */
  pendingReapplyNotice?: {
    viewerIsApplicant: boolean;
    name?: string | null;
    position: "above" | "below";
  };

  /** OPT-IN, agency Rejected cards ONLY: renders the ephemeral "New"
      marker + reconsideration-pending ambient above the appeal's canonical
      event row (entries annotated `isPendingReconsideration` by the
      cumulative emitter, U-035 family, Revoked-mechanism reuse). Caller-gated:
      only the agency Rejected card passes this — never the seeker view. */
  pendingReconsiderationNotice?: {
    seekerName?: string | null;
  };
}

/* Shared timeline row zebra-banding lives HERE ONLY (canonical MembershipHistoryList
   component). Alternating grey/white row banding by index; consumed by both timeline
   tiers and any surface rendering timeline rows. */
export function timelineRowBandClass(index: number): string {
  return index % 2 === 1 ? "bg-gray-100 dark:bg-gray-800/60" : "";
}

const REDUNDANT_ACTIONS = new Set(["joined", "submitted"]);

/* Canonical shared label map (U-017, verb rule U-053): the sole authority for
   timeline event labels across both tiers. Extended: join_request rows carrying
   reapplied_from_request_id render "Reapplied" instead of "Submitted"
   (U-017 amendment owed in backend DECISIONS.md). Verb rule: agency-decides
   renders Approved (+ origin stem), seeker-agrees renders Accepted,
   invitation queue-accept renders Restored (owner acted for invitee),
   restoration renders Reinstated. Origin arrives annotated on the entry
   (annotateApprovalOrigins); invitation origin derives from invitation_id
   (C2); fresh/origin-less renders the bare verb. The audit action enum is
   unchanged (U-014 pattern). Never render a bare "Accepted" for an agency
   decision. labelStage was removed: origin decides, not the surface. */
export function resolveTimelineLabel(
  entry: MembershipTimelineEntry & {
    reapplied_from_request_id?: number | null;
    approvalOrigin?: ApprovalOrigin | null;
  },
): string {
  if (entry.action) {
    if (entry.action === "joined" || entry.action === "approved") {
      if (entry.invitation_id != null) {
        // Queue-accepted interest restores the membership: someone else
        // (the agency owner) acted for the invitee. Self-accepts stay
        // Accepted. Unknown actors fall through to Accepted.
        if (
          entry.actor_id != null &&
          entry.user_id != null &&
          entry.actor_id !== entry.user_id
        ) {
          return "Restored";
        }
        return "Accepted";
      }
      switch (entry.approvalOrigin) {
        case "reapplication":
          return "Reapplication approved";
        case "reactivation":
          return "Reactivation approved";
        case "reconsideration":
          return "Reconsideration approved";
        default:
          return "Approved";
      }
    }
    const raw = entry.action.replace(/_/g, " ");
    if (entry.action === "review_requested") return "Review requested";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (entry.source_type === "join_request") {
    return entry.reapplied_from_request_id != null ? "Reapplied" : "Submitted";
  }
  // Linked review rows ARE reconsideration appeals: the reconsideration POST is
  // the sole flow creating join-linked review rows (it 400s non-rejected
  // origins), so linkage presence alone determines origin — identically in
  // History, Rejected, and every other consumer. Unlinked rows keep the
  // generic membership-appeal label.
  if (entry.source_type === "review_request") {
    return entry.join_request_id != null ? "Reconsideration requested" : "Review requested";
  }
  return "Event";
}

// Keyed off the same action/source_type shapes resolveTimelineLabel consumes (U-019).
export function timelineActionBadgeVariant(entry: MembershipTimelineEntry) {
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

/* Header link targets live HERE ONLY (Rule 20 — one resolver per
   entity, beside their consumer). Agency headers link the agency page;
   person headers link the public agent profile where one exists, else
   nothing (TimelineHeader then falls back to a mailto name link when the
   header carries an email). Every header on every tab calls these —
   nothing builds profile links inline. */
export function resolveAgencyHref(agencyId?: number | null): string | undefined {
  if (agencyId == null) return undefined;
  return `/agencies/${agencyId}`;
}

export function resolvePersonProfileHref(profileId?: number | null): string | undefined {
  if (profileId == null) return undefined;
  return `/agents/${profileId}`;
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
  href,
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
  /** Optional entity link for the name (agency page, public agent
      profile). Person names without one fall back to a mailto link when
      the header carries an email, else plain text. */
  href?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  // Mailto fallback: first whitespace-delimited token, since member email
  // lines may carry a phone suffix ("email - phone"). Agency names never
  // mailto (no agency email concept).
  const mailtoTarget =
    entity === "person" && !href && email ? email.split(/\s/)[0] : undefined;
  const mailtoHref =
    mailtoTarget != null && mailtoTarget.includes("@") ? `mailto:${mailtoTarget}` : undefined;
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
            {href ? (
              <Link href={href} className="font-medium text-gray-900 hover:underline dark:text-white">
                {name}
              </Link>
            ) : mailtoHref ? (
              <a href={mailtoHref} className="font-medium text-gray-900 hover:underline dark:text-white">
                {name}
              </a>
            ) : (
              <span className="font-medium text-gray-900 dark:text-white">{name}</span>
            )}
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
          {/* U-019 contract: the status qualifier slot exists on person-entity
              headers ONLY — agency entities are name | verified | event_count.
              Gated here at the shared component so no consumer can reintroduce
              a status qualifier on an agency-entity header. */}
          {entity === "person" && status ? (
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
  showHeader = true,
  entity = "person",
  role,
  status,
  verified,
  lastSeen,
  originRows,
  applicationStatus,
  email,
  avatarUrl,
  qualifiers,
  href,
  pendingReviewHighlight,
  expanded: expandedProp,
  onExpandedChange,
  pendingReapplyNotice,
  pendingReconsiderationNotice,
}: MembershipTimelineProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = expandedProp ?? internalExpanded;

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

  const entries =
    originRows == null ? history : annotateApprovalOrigins(history, originRows, history);

  if (tier === "simple") {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const visible = sorted.filter((entry) => !isRedundant(entry, sorted));

    const headerName = defaultUserDisplayName ?? sorted[0]?.user_display_name ?? sorted[0]?.agency_name ?? "Unknown";
    const headerStatus = status ?? (sorted[0]?.action ? resolveTimelineLabel(sorted[0]) : "");
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
            href={href}
          />
        ) : null}
        {visible.map((entry, index) => (
          <p
            key={timelineEntryKey(entry)}
            className={`text-sm leading-6 text-gray-700 dark:text-gray-300 ${
              timelineRowBandClass(index)
            }`}
          >
            {/* Shared zebra banding lives HERE ONLY (canonical timeline component).
                Light pair: transparent / gray-50. Dark pair: transparent / white/5. */}

            {resolveTimelineLabel(entry)} - {formatMembershipDate(entry.timestamp)}
          </p>
        ))}
      </div>
    );
  }

  // Single uniform chronological sort by each row's OWN timestamp — U-035:
  // request and resolution are independent entries with genuine timestamps;
  // no resolvedAt substitution, identical to History. Direction is always
  // descending (newest first); no per-consumer direction.
  const sortedHistory = [...entries].sort((first, second) => {
    const diff =
      new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime();
    // Canonical newest-first order (lead answer 2): the shared tier always
    // sorts descending. No per-consumer direction.
    return -diff;
  });

  const showAllEntries = isExpanded;
  const visibleEntries = showAllEntries ? sortedHistory : sortedHistory.slice(0, 2);
  const hasMoreEntries = sortedHistory.length > 2;

  const headerName = defaultUserDisplayName ?? sortedHistory[0]?.user_display_name ?? sortedHistory[0]?.agency_name ?? "Unknown";
  const headerStatus = status ?? (sortedHistory[0]?.action ? resolveTimelineLabel(sortedHistory[0]) : "");
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
          href={href}
        />
      ) : null}
      {visibleEntries.map((entry, index) => {
        const entryId = timelineEntryKey(entry);
        const label = resolveTimelineLabel(entry);
        /* Pending-review NOTICE — OPT-IN (pendingReviewHighlight, consumed
           only by the agency Revoked tab). Per the locked design spec: the
           event row is ALWAYS canonical — same zebra banding, same neutral
           outline badge treatment (U-019 variant map) — the row itself
           never changes. The only conditional element is a SIBLING notice
           line rendered below the row (canonical ambient text style, no
           background block) while the membership-scoped review_request is
           unresolved; on resolution the notice unmounts and nothing else
           ever differed. Derived from live row data per O-002 — no stored
           seen/resolved flag.
           Resolution derivation (Fix 3, post phase_u_011): the backend no
           longer grafts `review_response` onto the request row — a decline
           is its OWN audit_event (`review_declined`), accept writes
           `reinstated`. So "unresolved" = no resolution audit event for
           the same agency+user with a timestamp AFTER this request's.
           Both resolution actions reach this component via
           getRevokedMembershipHistory's resolutionRows (single SSOT
           filter). `review_message == null` still excludes generic
           (ReviewRequest-table) rows, whose pending state is tracked by
           their own `review_response` column. */
        const isMembershipReviewRow =
          entry.source_type === "review_request" && entry.review_message == null;
        /* U-035 (supersedes the single-row fold): the request row and its
           resolution row are ALWAYS two distinct, permanent, canonical rows.
           The request row keeps its "Review requested" badge permanently —
           the badge never mutates in place. The `reviewResolution` annotation
           from getRevokedMembershipHistory is used ONLY to decide whether the
           ephemeral "New" marker + ambient notice is shown on the UNRESOLVED
           request row (discharges when a resolution row exists). An
           unresolved-but-audit-less row (legacy pre-phase_u_011 decline)
           yields undefined -> renders as unresolved
           (DEF-U-LEGACY-DECLINE-BACKFILL-001). Resolution audit events render
           as their own rows via the generic badge path below (reinstated ->
           success "Reinstated", review_declined -> outline "Review declined").
           The "New" marker + ambient notice are gated to the agency tab via
           pendingReviewHighlight (entity-gate — never leaked to the seeker
           view). */
        const resolutionAction: MembershipTimelineEntryWithResolution["reviewResolution"] =
          isMembershipReviewRow
            ? (entry as MembershipTimelineEntryWithResolution).reviewResolution
            : undefined;
        const isPendingReviewRow =
          isMembershipReviewRow &&
          !resolutionAction &&
          Boolean(pendingReviewHighlight);
        /* Hoist the sibling-notice computation (instead of an IIFE-in-JSX, which
           Turbopack's JSX parser rejects when nested in a ternary) so the
           render below is a plain conditional. The notice + "New" marker are
           agency-gated via pendingReviewHighlight (entity-gate — never leaked
           to the seeker view. */
        const pendingNotice =
          isPendingReviewRow
            ? resolveRevokedReviewNotice({ seekerName: entry.user_display_name })
            : null;
        // Ephemeral reapply-pending notice (U-035 family, cumulative Cancelled
        // cards only): discharges when the pending reapply resolves (the
        // emitter stops annotating the row). Text derives in the canonical
        // ambient family; this component only positions it.
        const reapplyNotice =
          pendingReapplyNotice != null &&
          (entry as CumulativeRequestLifecycleEntry).isPendingReapply === true
            ? pendingReapplyNotice.viewerIsApplicant
              ? resolveReapplyPendingSeekerAmbient({ agencyName: pendingReapplyNotice.name })
              : resolveReapplyPendingNotice({ seekerName: pendingReapplyNotice.name })
            : null;
        const reapplyNoticeBlock = reapplyNotice ? (
          <div className="mb-2 space-y-1">
            <Badge variant="default">New</Badge>
            <p className={ambientTextToneClass[reapplyNotice.tone]}>
              {reapplyNotice.text}
            </p>
          </div>
        ) : null;
        // Ephemeral reconsideration-pending notice (U-035 family, agency
        // Rejected cards only): discharges when the appeal resolves (the
        // emitter stops annotating the row). Text derives in the canonical
        // ambient family; this component only positions it, above the row.
        const reconsiderNotice =
          pendingReconsiderationNotice != null &&
          (entry as CumulativeRequestLifecycleEntry).isPendingReconsideration === true
            ? resolveReconsiderationPendingNotice({ seekerName: pendingReconsiderationNotice.seekerName })
            : null;
        const reconsiderNoticeBlock = reconsiderNotice ? (
          <div className="mb-2 space-y-1">
            <Badge variant="default">New</Badge>
            <p className={ambientTextToneClass[reconsiderNotice.tone]}>
              {reconsiderNotice.text}
            </p>
          </div>
        ) : null;

        return (
          <Fragment key={entryId}>
            {/* New-review notice + emphasis marker. Placed ABOVE the pending
                request row it introduces (operator request): it leads the entry
                as a pointer to Review Requests. Gating + computation unchanged
                (isPendingReviewRow); only the render position moved. */}
            {pendingNotice ? (
              <div className="mb-2 space-y-1">
                <Badge variant="default">New</Badge>
                <p className={ambientTextToneClass[pendingNotice.tone]}>
                  {pendingNotice.text}
                </p>
              </div>
            ) : null}
            {reapplyNoticeBlock != null && pendingReapplyNotice?.position === "above"
              ? reapplyNoticeBlock
              : null}
            {reconsiderNoticeBlock}
            <div
              // Shared zebra banding (grey/white alternating), no borders — same
              // pairing as the simple tier, defined here only (canonical component).
              className={`px-4 py-3 text-sm ${timelineRowBandClass(index)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatMembershipDate(entry.timestamp)}
                </div>
                {label !== "Event" ? (
                  /* U-035: every row renders its OWN canonical badge —
                     "Review requested" stays on the request row permanently
                     (never mutated in place); resolution audit rows render
                     their own badge via the shared variant map (reinstated ->
                     success "Reinstated", review_declined -> outline
                     "Review declined"). */
                  <Badge variant={timelineActionBadgeVariant(entry)}>
                    {label}
                  </Badge>
                ) : null}
              </div>
              {entry.reason && !isLegacyMachineReason(entry.reason) ? (
                <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.reason}</p>
              ) : null}
            {entry.cover_note ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.cover_note}</p>
            ) : null}
            {/* U-032 reapply artifact: the reapplication message renders verbatim
                on its own cycle's submit row (canonical surface — both History
                tabs consume this component). Optional field; null = no message. */}
            {entry.reapplication_message ? (
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.reapplication_message}</p>
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
            {(entry as CumulativeRequestLifecycleEntry).cycle_number != null ? (
              <p className="mt-0.5 text-xs text-gray-400">
                Cycle: {(entry as CumulativeRequestLifecycleEntry).cycle_number}
              </p>
            ) : null}
            {/* U-035: resolution messages belong to the resolution's OWN row
                (its own reason/review_message fields render above). Nothing is
                merged into the request row. */}
            </div>
            {reapplyNoticeBlock != null && pendingReapplyNotice?.position === "below"
              ? reapplyNoticeBlock
              : null}
          </Fragment>
        );
      })}
      {hasMoreEntries ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            onExpandedChange ? onExpandedChange(!isExpanded) : setInternalExpanded(!isExpanded)
          }
        >
          {isExpanded ? "Hide" : `View ${sortedHistory.length - 2} more events`}
        </Button>
      ) : null}
    </div>
  );
}
