"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
} from "@/components";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import {
  useAgencyAgents,
  useAgencyInvitations,
  useAgencyJoinRequests,
  useAgencyMembershipHistories,
  useAgencyMembershipHistory,
  useAgencyReviewRequests,
  useAcceptAgencyReviewRequest,
  useApproveAgencyJoinRequest,
  useBlockAgencyMembership,
  useDeclineAgencyReviewRequest,
  useInvitationEvents,
  useInviteAgencyAgent,
  useReactivateInvitation,
  useRejectAgencyJoinRequest,
  useRequestJoinRequestReactivation,
  useRevokeAgencyMembership,
  useSuspendAgencyMembership,
  useUnblockAgencyMembership,
  useWithdrawAgencyInvitation,
} from "@/features/agencies/hooks";
import { ConfirmDestructiveDialog } from "@/components/ui/ConfirmDestructiveDialog";
import { useGatedAction } from "@/hooks/useGatedAction";
import { declineRequestKind, emptyGate1Context } from "@/lib/gate-registry";
import {
  hasExpiredHistory,
  hasWithdrawnHistory,
  ambientTextToneClass,
  resolveCooldownAmbient,
  resolveInvitationExpiredAgencyText,
  resolveInvitationExpiredOfferedAgencyText,
  resolveInvitationExpiredRequestedAgencyText,
  resolveInvitationPendingAgencyText,
  resolveInvitationRejectedAgencyText,
  resolveInvitationWithdrawnAgencyText,
  resolveInvitationWithdrawnInterestAgencyText,
  resolveInviteeName,
  resolveJoinRequestReactivationTrace,
  resolveJoinRequestReactivationStage,
  resolvePriorInvitationContextLine,
  resolveTerminalReactivationRejectionMessage,
} from "@/lib/membership-lifecycle-messages";
import {
  getApprovedRequestCycleHistory,
  getInvitationDecisionResults,
  getInvitationSubsequentApplications,
  getMembershipHistoryByAction,
  getRejectedAppealHistory,
  getRevokedMembershipHistory,
  groupAgencyRequestCycles,
  resolveCumulativeRequestLifecycleTimeline,
  resolveExpiredNarrativeTimeline,
  resolveInvitationColumnTimeline,
  type ApprovalOriginRow,
} from "./membershipHistory";
import {
  MembershipTimeline,
  TimelineHeader,
  timelineRowBandClass,
} from "@/features/agencies/components/MembershipHistoryList";
import type {
  AgencyAgentRosterMember,
  AgencyInvitationResponse,
  AgencyReviewRequestResponse,
} from "@/types";
import {
  AgencyOwnerRosterSkeleton,
  AgencyOwnerTabListSkeleton,
} from "./AgencyOwnerDashboardSkeleton";

const inviteSchema = z.object({
  email: z.email("Use a valid email address"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;
type AgencyOwnerTab = "joinRequests" | "reviewRequests" | "agents" | "inactive" | "invitations" | "suspended" | "leftCancelled" | "revoked" | "blocked" | "history";
type MembershipDecisionAction = "suspend" | "revoke" | "block" | "unblock";
type PendingMembershipDecision = {
  action: MembershipDecisionAction;
  membershipId: number;
  agentName: string;
};

/* Registry seed for review-queue decisions. sourceType is non-nullable here:
   the U-033 contract guard in attemptReviewDecision rejects missing
   discriminators before any gate runs, rather than guessing a source table. */
type ReviewDecisionSeed = {
  requestId: number;
  sourceType: string;
  requesterName: string;
  kind: string;
};

/* Registry seed for roster lifecycle decisions. agentName feeds dialog copy
   and the Profile D type-the-name target. */
type MembershipDecisionSeed = {
  membershipId: number;
  agentName: string;
};

interface AgencyReviewRequestGroup {
  userId: number;
  requesterName: string;
  requesterEmail?: string | null;
  requests: AgencyReviewRequestResponse[];
}

const AGENCY_OWNER_TABS: Array<{ value: AgencyOwnerTab; label: string }> = [
  { value: "joinRequests", label: "Join requests" },
  { value: "reviewRequests", label: "Review requests" },
  { value: "agents", label: "Agent roster" },
  { value: "inactive", label: "Inactive" },
  { value: "invitations", label: "Invitations" },
  { value: "suspended", label: "Suspended" },
  { value: "leftCancelled", label: "Left" },
  { value: "revoked", label: "Revoked" },
  { value: "blocked", label: "Blocked" },
  { value: "history", label: "Membership history" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatOptionalDate(value?: string | null) {
  return value ? formatDate(value) : "Not recorded";
}

function formatMembershipStatus(status: string) {
  return status;
}

function fmtTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function isAgentInactive(agent: AgencyAgentRosterMember): boolean {
  if (agent.membership_status !== "active") return false;
  const ninetyDaysAgo = Date.now() - 90 * 86_400_000;
  if (agent.last_login) return new Date(agent.last_login).getTime() < ninetyDaysAgo;
  return new Date(agent.created_at).getTime() < ninetyDaysAgo;
}

function getRequiredDecisionReasonMessage(action: MembershipDecisionAction) {
  const actionLabels = {
    suspend: "suspending",
    revoke: "revoking",
    block: "blocking",
    unblock: "unblocking",
  } as const;
  return `Enter a reason before ${actionLabels[action]} this agent.`;
}

function getMembershipDecisionLabel(action: MembershipDecisionAction) {
  const labels = {
    suspend: "Suspend agent",
    revoke: "Revoke membership",
    block: "Block agent",
    unblock: "Unblock agent",
  } as const;
  return labels[action];
}

/* DEF-U-REVIEWQUEUE-SOURCE-LABEL-001 (tier 2, origin precision — vocabulary
   locked by lead sign-off 2026-11-19): one-word labels, Review Requests tab
   ONLY. review_request rows resolve by Q1b origin; join_request rows by the
   split rule (reactivation_requested_by set wins over reapplied_from);
   membership rows by served prior status (blocked has no return path, so no
   badge); invitation rows resolve by served origin (withdrawn_interest or
   reactivation). The lifecycle narrative beside the badge lives in
   reviewQueueNarrativeEvent. Two-word forms live everywhere else;
   never import this map outside the queue. Unlinked review rows and unknown
   prior states fall back to the generic word of their family — legacy data
   only, since conforming rows always link. */
export function reviewQueueSourceLabel(row: AgencyReviewRequestResponse): string | null {
  if (row.source_type === "review_request") {
    if (row.origin_status === "rejected") return "Reconsideration";
    if (row.origin_status === "expired") return "Reactivation";
    return "Review";
  }
  if (row.source_type === "join_request") {
    if (row.reactivation_requested_by != null) return "Reactivation";
    if (row.reapplied_from_request_id != null) return "Reapplication";
    return "Reapplication";
  }
  if (row.source_type === "membership_review_request") {
    if (row.prior_membership_status === "revoked") return "Review";
    if (row.prior_membership_status === "suspended") return "Reinstatement";
    if (row.prior_membership_status === "left") return "Return";
    if (row.prior_membership_status === "blocked") return null;
    return "Reinstatement";
  }
  if (row.source_type === "invitation") {
    if (row.origin === "withdrawn_interest") return "Interest";
    if (row.origin === "reactivation") return "Reactivation";
    return "Review";
  }
  return null;
}

/* DEF-U-REVIEWQUEUE-SOURCE-LABEL-001 (tier 2, narrative event): the short
   lifecycle sentence beside the one-word badge, Review Requests tab ONLY.
   Invitation and application reactivations share the Reactivation badge,
   so the event carries the lifecycle word that tells them apart. Rows
   outside the reactivation family render no event. */
export function reviewQueueNarrativeEvent(row: AgencyReviewRequestResponse): string | null {
  if (row.source_type === "invitation") {
    if (row.origin === "withdrawn_interest") return "Interest expressed";
    if (row.origin === "reactivation") return "Invitation reactivation requested";
    return null;
  }
  if (row.source_type === "join_request" && row.reactivation_requested_by != null) {
    return "Application reactivation requested";
  }
  return null;
}

/* Queue invitation rows are actionable at the request moment, not the send
   date: the payload's created_at is the invitation's send time, while the
   request the queue decides was created when interest was expressed or
   reactivation was requested. Every queue date render and recency
   comparison for invitation rows must use this — never created_at
   directly. */
export function queueRowActionableAt(row: AgencyReviewRequestResponse): string {
  if (row.source_type === "invitation") {
    return (
      row.reactivation_requested_at ?? row.interest_expressed_at ?? row.created_at
    );
  }
  return row.created_at;
}

/* B2 queue actionability: pending rows decide as before; expired join_request
   rows are actionable exactly when the backend surfaced them (the queue query
   admits only applicant-requested reactivations). Agency-requested
   pre-consent rows never reach the queue (U-012 consent gate). */
export function isQueueActionableRequest(row: AgencyReviewRequestResponse): boolean {
  if (row.status === "pending") return true;
  return (
    row.source_type === "join_request" &&
    row.status === "expired" &&
    row.reactivation_requested_by != null
  );
}

export function groupAgencyReviewRequests(
  reviewRequests: AgencyReviewRequestResponse[],
): AgencyReviewRequestGroup[] {
  const groups = new Map<number, AgencyReviewRequestGroup>();

  /* Rule 21 action-queue discipline (Fix 2, belt-and-suspenders): this tab
     renders ONLY actionable rows. Filtering here — not just in the cache
     mutation — guarantees a stale resolved entry (30s staleTime or any
     race) can never surface as an actionable card. Actionable means pending
     rows plus B2 expired-plus-requested rows (same predicate the cards use);
     resolved rows stay excluded as the staleness defense. */
  const actionableRequests = reviewRequests.filter(isQueueActionableRequest);

  for (const request of actionableRequests) {
    const current = groups.get(request.user_id);
    if (current) {
      current.requests.push(request);
      current.requesterName = current.requesterName === "Applicant"
        ? request.requester_name ?? request.requester_email ?? "Applicant"
        : current.requesterName;
      current.requesterEmail = current.requesterEmail ?? request.requester_email;
      continue;
    }

    groups.set(request.user_id, {
      userId: request.user_id,
      requesterName: request.requester_name ?? request.requester_email ?? "Applicant",
      requesterEmail: request.requester_email,
      requests: [request],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      requests: [...group.requests].sort(
        (first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
      ),
    }))
    .sort((first, second) => first.requesterName.localeCompare(second.requesterName));
}



interface AgencyHistoryMember {
  userId: number;
  displayName: string;
  role?: string;
  status?: string;
  email?: string;
  avatarUrl?: string | null;
  lastSeen?: string;
  /* Canonical person-header qualifier lines (specialization, listing count,
     license, decision reason) — derived here from the roster record and passed
     through the shared MembershipTimeline/TimelineHeader SSOT. */
  qualifiers?: string[];
}

/* Agency Withdrawn invitation card (per-tab contract): invitee identity
   block, column timeline (Sent, Withdrawn, Interest) plus terminal
   interest-path results from the audit feed, then the matrix ambient.
   Record-only: interest is decided in Review Requests, and proactive
   reactivate is retired server-side — no buttons. Ambient clears once a
   result row lands. */
function AgencyWithdrawnInvitationCard({
  invitation,
}: {
  invitation: AgencyInvitationResponse;
}) {
  const feed = useInvitationEvents(invitation.invitation_id, true);
  const history = [
    ...resolveInvitationColumnTimeline(invitation),
    ...getInvitationDecisionResults(feed.data ?? []),
  ];
  const decided =
    invitation.status === "accepted" ||
    history.some((entry) => entry.action === "reactivation_rejected");
  const name = resolveInviteeName(invitation);
  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <TimelineHeader entity="person" name={resolveInviteeName(invitation)} email={invitation.email} />
      <div className="mt-2">
        <MembershipTimeline tier="simple" history={history} showHeader={false} />
      </div>
      {decided || invitation.reactivated_at ? null : invitation.interest_expressed_at ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {resolveInvitationWithdrawnInterestAgencyText({ name })}
        </p>
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {resolveInvitationWithdrawnAgencyText({ name })}
        </p>
      )}
    </div>
  );
}

/* Agency Expired invitation card (per-tab contract): invitee identity
   block, column timeline (Sent, Expired) plus terminal results from the
   audit feed, then the matrix ambient. The only CTA is the initial
   Reactivate request — seeker requests are decided in Review Requests
   and outstanding agency requests await the invitee. */
function AgencyExpiredInvitationCard({
  invitation,
  reactivateLoading,
  onReactivate,
}: {
  invitation: AgencyInvitationResponse;
  reactivateLoading: boolean;
  onReactivate: () => void;
}) {
  const feed = useInvitationEvents(invitation.invitation_id, true);
  const history = [
    ...resolveInvitationColumnTimeline(invitation),
    ...getInvitationDecisionResults(feed.data ?? []),
  ];
  const decided =
    invitation.status === "accepted" ||
    history.some((entry) => entry.action === "reactivation_rejected");
  const name = resolveInviteeName(invitation);
  const requestedBy = invitation.reactivation_requested_by;
  const inviteeId = invitation.invited_user_id;
  const seekerRequested =
    invitation.reactivation_requested_at != null &&
    requestedBy != null &&
    inviteeId != null &&
    requestedBy === inviteeId;
  const agencyRequested =
    invitation.reactivation_requested_at != null && !seekerRequested;
  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <TimelineHeader entity="person" name={resolveInviteeName(invitation)} email={invitation.email} />
      <div className="mt-2">
        <MembershipTimeline tier="simple" history={history} showHeader={false} />
      </div>
      {decided || invitation.reactivated_at ? null : seekerRequested ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {resolveInvitationExpiredRequestedAgencyText({ name })}
        </p>
      ) : agencyRequested ? (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {resolveInvitationExpiredOfferedAgencyText({ name })}
        </p>
      ) : invitation.status === "expired" ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {resolveInvitationExpiredAgencyText({ name })}
          </p>
          <Button
            type="button"
            size="sm"
            loading={reactivateLoading}
            onClick={onReactivate}
          >
            Reactivate Invitation
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* Per-member history group for the agency Membership history tab (Rule 20/22):
   one cursor-paginated feed PER MEMBER (user_id) — never a per-tab aggregate —
   via the canonical useAgencyMembershipHistory feed. The member block is always
   visible; the 2-row cap + "View more" reveal, the zebra banding, and the full
   person header (name/role/status/qualifiers/event count) all come from the
   canonical MembershipTimeline rich tier rendering the shared TimelineHeader
   SSOT — so seeker and agency sides share the exact same group rendering
   (grouped by agency_id there, user_id here). */
function AgencyMemberHistoryGroup({
  agencyId,
  member,
  enabled,
  originRows,
}: {
  agencyId?: number;
  member: AgencyHistoryMember;
  enabled: boolean;
  originRows?: ApprovalOriginRow[];
}) {
  const feed = useAgencyMembershipHistory(agencyId, member.userId, Boolean(agencyId) && enabled);
  const [expanded, setExpanded] = useState(false);
  /* Disclosure sequencing (lead decision): "Load more events" — the FETCH
     control — only renders once the bounded reveal is expanded, i.e. every
     already-fetched page is visible. Collapsed state exposes only the
     count-based "View N more events" reveal. Never both at once. */
  return (
    <div className="space-y-3">
      <MembershipTimeline
        tier="rich"
        entity="person"
        history={feed.data}
        originRows={originRows}
        isLoading={feed.isLoading}
        isError={feed.isError}
        onRetry={() => { feed.refetch(); }}
        defaultUserDisplayName={member.displayName}
        role={member.role}
        status={member.status}
        email={member.email}
        avatarUrl={member.avatarUrl}
        lastSeen={member.lastSeen}
        qualifiers={member.qualifiers}
        expanded={expanded}
        onExpandedChange={setExpanded}
      />
      {expanded && feed.hasMore ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={feed.loadMore}
          disabled={feed.isFetchingNextPage}
        >
          {feed.isFetchingNextPage ? "Loading..." : "Load more events"}
        </Button>
      ) : null}
    </div>
  );
}


export function AgencyMembersClient() {
  const gate = useAgentRoleGate();
  const { user } = useAuth();
  const [membershipReasons, setMembershipReasons] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<AgencyOwnerTab>("joinRequests");
  const [invitationSubTab, setInvitationSubTab] = useState<"pending" | "accepted" | "rejected" | "expired" | "withdrawn">("pending");
  const [requestSubTab, setRequestSubTab] = useState<"pending" | "approved" | "rejected" | "cancelled" | "expired">("pending");
  const [expandedApplicationUserId, setExpandedApplicationUserId] = useState<number | null>(null);
  const [pendingMembershipDecision, setPendingMembershipDecision] =
    useState<PendingMembershipDecision | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  const agencyId = user?.agency_id;
  const agentsQuery = useAgencyAgents(agencyId ?? "", "all", Boolean(agencyId));
  const joinRequestsQuery = useAgencyJoinRequests(agencyId, Boolean(agencyId));
  const reviewRequestsQuery = useAgencyReviewRequests(agencyId, Boolean(agencyId));
  const invitationsQuery = useAgencyInvitations(agencyId, Boolean(agencyId));

  const approvedRequests = joinRequestsQuery.data?.filter((r) => r.status === "approved") ?? [];
  const approvedHistoryQueries = useAgencyMembershipHistories(
    agencyId,
    approvedRequests.map((r) => r.user_id),
    Boolean(agencyId) && approvedRequests.length > 0,
  );

  // U-028 + DEF-U-AGENCY-HISTORY-TAB-001 fix: the Revoked tab's card list uses
  // a HISTORICAL-FACT predicate (has ever had a revoked audit event), not a
  // current-status predicate. This ensures a reinstated member's full lifecycle
  // (original Revoked event + resolved appeal) remains visible on the Revoked
  // tab even after membership_status flips to "active". All agents are included
  // here; the render-time check below filters by history data.
  const revokedAgents = [
    ...new Map(
      (agentsQuery.data ?? []).map((a) => [a.user_id, a]),
    ).values(),
  ];
  const revokedHistoryQueries = useAgencyMembershipHistories(
    agencyId,
    revokedAgents.map((a) => a.user_id),
    Boolean(agencyId) && revokedAgents.length > 0,
  );
  // U-028 (parity with the render-time historical-fact predicate): the Revoked
  // tab counter derives from the SAME rendered set as the body — any agent whose
  // history contains a revoked audit event, regardless of current
  // membership_status (a reinstated member keeps their revoked history visible).
  // NOT the current-status count, which silently undercounts reinstated members.
  const revokedRenderedAgents = revokedAgents
    .map((agent, index) => ({ agent, index }))
    .filter(({ agent, index }) =>
      (revokedHistoryQueries[index]?.data ?? []).some(
        (h) => h.source_type === "audit_event" && h.action === "revoked" && h.user_id === agent.user_id,
      ),
    );
  // U-028: Left tab joins the same cumulative-card model, scoped to 'left' events.
  const leftAgents = [
    ...new Map(
      (agentsQuery.data?.filter((a) => a.membership_status === "left") ?? []).map((a) => [a.user_id, a]),
    ).values(),
  ];
  const leftHistoryQueries = useAgencyMembershipHistories(
    agencyId,
    leftAgents.map((a) => a.user_id),
    Boolean(agencyId) && leftAgents.length > 0,
  );

  // U-035-parity (lead decision, batch DEF-U-SUSPENDED-ACCORDION-001): the
  // Suspended tab is a multi-event append-only lifecycle (suspend -> reinstate ->
  // suspend), same shape as Left/Revoked, so it joins the cumulative-card model
  // via the exact Left/Revoked SSOT pattern (per-member feed + scoped filter).
  const suspendedAgents = [
    ...new Map(
      (agentsQuery.data?.filter((a) => a.membership_status === "suspended") ?? []).map((a) => [a.user_id, a]),
    ).values(),
  ];
  const suspendedHistoryQueries = useAgencyMembershipHistories(
    agencyId,
    suspendedAgents.map((a) => a.user_id),
    Boolean(agencyId) && suspendedAgents.length > 0,
  );

  // U-028 family (lead decision): the Blocked tab is an append-only lifecycle
  // (block -> unblock -> re-block), same shape as Suspended/Left/Revoked, so it
  // joins the cumulative-card model via the same per-member feed + scoped filter.
  const blockedAgents = [
    ...new Map(
      (agentsQuery.data?.filter((a) => a.membership_status === "blocked") ?? []).map((a) => [a.user_id, a]),
    ).values(),
  ];
  const blockedHistoryQueries = useAgencyMembershipHistories(
    agencyId,
    blockedAgents.map((a) => a.user_id),
    Boolean(agencyId) && blockedAgents.length > 0,
  );

  // U-022d/U-026 parity: per-member history for the Expired join-request tab
  const expiredRequests = joinRequestsQuery.data?.filter(hasExpiredHistory) ?? [];
  const expiredHistoryQueries = useAgencyMembershipHistories(
    agencyId,
    expiredRequests.map((r) => r.user_id),
    Boolean(agencyId) && expiredRequests.length > 0,
  );
  // Keyed by request id so each grouped Expired section resolves its own
  // narrative timeline (replaces the pre-grouping positional index).
  const expiredHistoryByRequestId = new Map(
    expiredRequests.map((request, index) => [request.join_request_id, expiredHistoryQueries[index]?.data ?? []] as const),
  );
  // Rejected-tab appeal rows (Revoked mechanism): per-member history for
  // rejected applicants, mirroring every sibling tab. User set matches the
  // rejected anchor exactly (users with >=1 rejected row); keyed by user id
  // so each grouped card resolves its own appeal rows. Shares React Query
  // cache keys with the History tab feeds — no duplicate infra, same known
  // per-member fan-out cost (DEF-U-MEMBER-HISTORY-PERF-001).
  const rejectedHistoryUserIds = [
    ...new Set(
      (joinRequestsQuery.data ?? [])
        .filter((request) => request.status === "rejected")
        .map((request) => request.user_id),
    ),
  ];
  const rejectedHistoryQueries = useAgencyMembershipHistories(
    agencyId,
    rejectedHistoryUserIds,
    Boolean(agencyId) && rejectedHistoryUserIds.length > 0,
  );
  const rejectedHistoryByUserId = new Map(
    rejectedHistoryUserIds.map((userId, index) => [userId, rejectedHistoryQueries[index]?.data ?? []] as const),
  );

  const approveJoinRequest = useApproveAgencyJoinRequest(agencyId);
  const rejectJoinRequest = useRejectAgencyJoinRequest(agencyId);

  const suspendMembership = useSuspendAgencyMembership(agencyId);
  const revokeMembership = useRevokeAgencyMembership(agencyId);
  const blockMembership = useBlockAgencyMembership(agencyId);
  const unblockMembership = useUnblockAgencyMembership(agencyId);
  const acceptReview = useAcceptAgencyReviewRequest(agencyId);
  const declineReview = useDeclineAgencyReviewRequest(agencyId);
  const inviteAgent = useInviteAgencyAgent(agencyId);
  const withdrawInvitation = useWithdrawAgencyInvitation(agencyId);
  const reactivateInvitation = useReactivateInvitation();
  const requestJoinRequestReactivation = useRequestJoinRequestReactivation(agencyId);

  // Registry Profile A (U-052 step 4): withdraw gains a confirm-only dialog
  // (was direct-fire). Error mapping also improves: verbatim-or-fallback
  // replaces the old error.message ("API error 403").
  const withdrawGate = useGatedAction<number>("withdraw_invitation", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (invitationId) => withdrawInvitation.mutateAsync(invitationId),
    title: "Withdraw invitation",
    successToast: "Invitation withdrawn.",
    errorFallback: "Could not withdraw invitation",
  });

  // Registry review-queue decisions run through gates (U-052 step 2).
  // Review accept drops its formerly-optional reason (Profile A renders no
  // fields; backend accepts null). Decline keeps required reason with
  // inline Gate-2.
  const acceptReviewGate = useGatedAction<ReviewDecisionSeed>("accept_review", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (seed, values) =>
      acceptReview.mutateAsync({
        requestId: seed.requestId,
        payload: { reason: values.note.trim() || null },
        sourceType: seed.sourceType,
      }),
    title: "Accept review request",
    successToast: "Review request accepted. The agent role has been reinstated if needed.",
    errorFallback: "Could not update review request.",
  });
  const declineReviewGate = useGatedAction<ReviewDecisionSeed>("decline_review", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (seed, values) =>
      declineReview.mutateAsync({
        requestId: seed.requestId,
        payload: { reason: values.reason },
        sourceType: seed.sourceType,
      }),
    title: "Decline review request",
    successToast: "Review request declined. The requester has been notified.",
    errorFallback: "Could not update review request.",
  });
  /* U-033 contract guard (not a gate): the queue discriminator must be echoed
     back — the backend routes strictly by source_type. Fail loudly on a
     missing value rather than guessing a table. Shared by all four queue
     buttons (primary + priors × accept/decline). */
  const attemptReviewDecision = (
    action: "accept" | "decline",
    request: {
      id: number;
      source_type?: string | null;
      join_request_id?: number | null;
      reapplied_from_request_id?: number | null;
      reactivation_requested_by?: number | null;
    },
    requesterName: string,
  ) => {
    if (!request.source_type) {
      notify.error("Review request is missing its source type. Refresh and try again.");
      return;
    }
    const seed: ReviewDecisionSeed = {
      requestId: request.id,
      sourceType: request.source_type,
      requesterName,
      kind: declineRequestKind(request),
    };
    if (action === "accept") acceptReviewGate.attempt(seed);
    else declineReviewGate.attempt(seed);
  };

  // Pending-tab decisions run through gates (U-052 step 2). Approve gains a
  // confirm dialog (ruling 3: accepts confirm); reject replaces its inline
  // reason input with the shared reason dialog.
  const approveGate = useGatedAction<number>("approve_join", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (requestId) => approveJoinRequest.mutateAsync(requestId),
    title: "Approve join request",
    successToast: "Join request approved. The applicant can see the decision in My Agencies.",
    errorFallback: "Could not approve join request",
  });
  const rejectGate = useGatedAction<number>("reject_join", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (requestId, values) =>
      rejectJoinRequest.mutateAsync({ requestId, payload: { reason: values.reason } }),
    title: "Reject join request",
    successToast: "Join request rejected. The applicant can see the reason in My Agencies.",
    errorFallback: "Could not reject join request",
  });

  // Roster lifecycle decisions run through gates (U-052 step 3). Block adds
  // the Profile D type-the-name second gate; suspend/revoke keep required
  // reason with inline Gate-2. Titles/confirm copy preserved verbatim.
  const suspendGate = useGatedAction<MembershipDecisionSeed>("suspend_membership", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (seed, values) =>
      suspendMembership.mutateAsync({ membershipId: seed.membershipId, payload: { reason: values.reason } }),
    title: getMembershipDecisionLabel("suspend"),
    successToast: "Agent membership suspended. The agent can see the reason in My Agencies.",
    errorFallback: "Could not update agent membership.",
  });
  const revokeGate = useGatedAction<MembershipDecisionSeed>("revoke_membership", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (seed, values) =>
      revokeMembership.mutateAsync({ membershipId: seed.membershipId, payload: { reason: values.reason } }),
    title: getMembershipDecisionLabel("revoke"),
    successToast: "Agent membership revoked. The agent can see the reason in My Agencies.",
    errorFallback: "Could not update agent membership.",
  });
  const blockGate = useGatedAction<MembershipDecisionSeed>("block_membership", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null),
    invoke: (seed, values) =>
      blockMembership.mutateAsync({ membershipId: seed.membershipId, payload: { reason: values.reason } }),
    title: getMembershipDecisionLabel("block"),
    typenameTarget: (seed) => seed.agentName,
    successToast: "Agent membership blocked. The agent can see the reason in My Agencies.",
    errorFallback: "Could not update agent membership.",
  });



  const handleInvite = async (values: InviteFormValues) => {
    try {
      await inviteAgent.mutateAsync({ email: values.email.trim() });
      notify.success("Invite saved and email delivery queued.");
      reset();
      setInviteDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not create invite. Please try again.";
      setError("root", { type: "server", message });
    }
  };

  // Suspend/revoke/block run through suspendGate/revokeGate/blockGate
  // (registry step 3) — no bespoke handler. Unblock keeps its handler
  // below (queued as Profile B); restore deleted per U.9.3.

  const handleUnblockMembership = async (membershipId: number) => {
    const reason = membershipReasons[membershipId]?.trim();
    if (!reason) {
      notify.error(getRequiredDecisionReasonMessage("unblock"));
      return;
    }
    try {
      await unblockMembership.mutateAsync({ membershipId, payload: { reason } });
      notify.success("Agent unblocked. They can now submit a new join request.");
      setMembershipReasons((current) => {
        const next = { ...current };
        delete next[membershipId];
        return next;
      });
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not unblock agent.";
      notify.error(message);
    }
  };

  const handleReactivateInvitation = async (invitationId: number) => {
    try {
      await reactivateInvitation.mutateAsync(invitationId);
      notify.success("Reactivation requested — awaiting invitee response.");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not reactivate invitation.");
    }
  };

  // Registry Profile C, confirm-only variant (U-050): Expired reactivation
  // takes NO message (time-driven) — Gate 1, then the dialog only confirms.
  const reactivationGate = useGatedAction<number>("reactivation_request", {
    buildContext: (requestId) => {
      const group = expiredCycleGroups.find((g) =>
        g.requests.some((r) => r.join_request_id === requestId),
      );
      return {
        joinRequests: group?.requests ?? [],
        invitations: [],
        reviewRequests: [],
        viewerUserId: user?.user_id ?? null,
        viewerIsApplicant: false,
        counterpartyName: group
          ? (historyMemberById.get(group.userId)?.displayName ?? group.seekerName)
          : "the applicant",
        includeCooldownCheck: false,
      };
    },
    invoke: (requestId) =>
      requestJoinRequestReactivation.mutateAsync({ requestId }),
    title: "Reactivate application",
    successToast: "Reactivation requested — applicant will be notified.",
    errorFallback: "Could not request reactivation.",
  });

  /* Bespoke dialog now serves unblock only (queued as Profile B);
     suspend/revoke/block run through gates. Restore deleted per U.9.3 —
     reinstatement flows through Review Requests only. */
  const handleConfirmMembershipDecision = async () => {
    if (!pendingMembershipDecision) return;
    if (pendingMembershipDecision.action === "unblock") {
      await handleUnblockMembership(pendingMembershipDecision.membershipId);
    }
    setPendingMembershipDecision(null);
  };

  // Review decisions run through acceptReviewGate/declineReviewGate
  // (registry step 2) — no bespoke handler.

  /* Three distinct states were previously collapsed into one branch. Because
     `gate.isChecking` is true during SSR and first paint, every viewer - of any
     role - was shown the definitive "No agency profile found" empty state for
     the resolving window, and a viewer holding no agency role at all was told
     their "agency owner account is active". Each state now renders its own
     truth, and each is distinguishable from the others: still resolving,
     not permitted, and genuinely no agency linked. A page that fails closed
     silently is indistinguishable from a hang - the viewer gets no error, no
     retry, and no page-data request at all. */
  if (gate.isChecking) {
    return <LoadingState />;
  }

  if (!gate.isAllowed) {
    return (
      <div className="space-y-6">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Membership management</p></div>
        <Card>
          <CardBody>
            <EmptyState
              title="Membership management is not available"
              description="Use an agent, agency owner, or admin account to manage agency membership."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!agencyId) {
    return (
      <div className="space-y-6">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Membership management</p></div>
        <Card>
          <CardBody>
            <EmptyState
              title="No agency profile found"
              description={
                gate.isAgencyOwner
                  ? "Your agency owner account is active, but no agency could be resolved."
                  : "No agency is linked to this account, so there is no membership roster to manage."
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const joinRequests = joinRequestsQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  // Membership history tab: PER-MEMBER cursor pagination (lead decision — not
  // per-tab). Grouped by user_id; every member block is always visible and each
  // runs its own cursor feed via useAgencyMembershipHistory inside
  // AgencyMemberHistoryGroup. Member set = roster ∪ join-request applicants.
  const historyMembers = (() => {
    const byId = new Map<number, AgencyHistoryMember>();
    for (const a of agents) {
      byId.set(a.user_id, {
        userId: a.user_id,
        displayName: a.display_name || a.company_name || `User ${a.user_id}`,
        role: a.user_role,
        status: formatMembershipStatus(a.membership_status),
        email: a.phone_number ? `${a.email} - ${a.phone_number}` : a.email,
        avatarUrl: a.profile_image_url,
        lastSeen: a.last_login ? fmtTimeAgo(a.last_login) : "Never logged in",
        qualifiers: [
          // Profile context only. Role/status already render in TimelineHeader's
          // identity slots; decision metadata (status_reason / status_decided_at)
          // is intentionally NOT repeated here — the history events carry it, and
          // an acceptance/restore carries a message, not a "Decision reason".
          ...(a.specialization ? [a.specialization] : []),
          ...(a.years_experience != null ? [`${a.years_experience} years experience`] : []),
          ...(a.license_number ? [`License ${a.license_number}`] : []),
          `${a.listing_count} active listing${a.listing_count !== 1 ? "s" : ""}.`,
        ],
      });
    }
    for (const r of joinRequests) {
      if (!byId.has(r.user_id)) {
        byId.set(r.user_id, {
          userId: r.user_id,
          displayName: r.seeker_name || r.seeker_email || `User ${r.user_id}`,
          email: r.seeker_email ?? undefined,
          qualifiers: [],
        });
      }
    }
    return [...byId.values()].sort((x, y) => x.displayName.localeCompare(y.displayName));
  })();
  // Lookup for the Cancelled-card rich person headers (same SSOT identity the
  // History member blocks use) — reuse, never re-derive per-card.
  const historyMemberById = new Map(historyMembers.map((m) => [m.userId, m]));
  // Cancelled sub-tab entity groups (grouped by user_id). Single source used by
  // both the tab counter (entity count) and the body render — count matches the
  // rendered set, not the raw cancelled-row count.
  const cancelledCycleGroups = groupAgencyRequestCycles(joinRequests, "cancelled");
  // Rejected sub-tab entity groups (grouped by user_id) — one cumulative card
  // per applicant, mirroring the Cancelled tab (U-028/U-009).
  const rejectedCycleGroups = groupAgencyRequestCycles(joinRequests, "rejected");
  // Expired sub-tab entity groups (grouped by user_id) — one cumulative card
  // per applicant, mirroring the Cancelled tab (answer 4: grouping global).
  const expiredCycleGroups = groupAgencyRequestCycles(joinRequests, "expired-history");
  const reviewRequests = reviewRequestsQuery.data ?? [];
  const reviewRequestGroups = groupAgencyReviewRequests(reviewRequests);
  const invitations = invitationsQuery.data ?? [];
  const tabCounts: Record<AgencyOwnerTab, number | undefined> = {
    joinRequests: joinRequests.filter(r => r.status === "pending").length,
    reviewRequests: reviewRequestGroups.length,
    agents: agentsQuery.isSuccess ? agents.filter(a => a.membership_status === "active").length : undefined,
    inactive: agentsQuery.isSuccess ? agents.filter(isAgentInactive).length : undefined,
    invitations: invitations.length,
    suspended: agents.filter(a => a.membership_status === "suspended").length,
    leftCancelled: agents.filter(a => a.membership_status === "left").length,
    revoked: revokedRenderedAgents.length,
    blocked: agents.filter(a => a.membership_status === "blocked").length,
    /* History tab counter = count of UNIQUE members/applicants surfaced in it
       (same derived set the tab renders). Not a hardcoded value. */
    history: historyMembers.length,
  };
  const pendingDecisionReason = pendingMembershipDecision
    ? membershipReasons[pendingMembershipDecision.membershipId]?.trim()
    : "";
  const isPendingDecisionSubmitting = pendingMembershipDecision
    ? pendingMembershipDecision.action === "unblock" && unblockMembership.isPending
    : false;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Membership management
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Agency members
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        {AGENCY_OWNER_TABS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant={activeTab === value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(value)}
          >
            {label}
            {typeof tabCounts[value] === "number" ? ` (${tabCounts[value]})` : null}
          </Button>
        ))}
      </div>

      {activeTab === "joinRequests" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Join requests</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review requests from people asking to join your agency roster. Resolved requests move to the appropriate tab.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
              {[
                { value: "pending" as const, label: `Pending (${joinRequests.filter(r => r.status === "pending" && !(r.reactivation_accepted_at || r.reapplied_from_request_id)).length})` },
                { value: "approved" as const, label: `Approved (${joinRequests.filter(r => r.status === "approved").length})` },
                { value: "rejected" as const, label: `Rejected (${rejectedCycleGroups.length})` },
                { value: "expired" as const, label: `Expired (${expiredCycleGroups.length})` },
                { value: "cancelled" as const, label: `Cancelled (${cancelledCycleGroups.length})` },
              ].map(({ value, label }) => (
                <Button key={value} type="button" variant={requestSubTab === value ? "primary" : "ghost"} size="sm" onClick={() => setRequestSubTab(value)}>
                  {label}
                </Button>
              ))}
            </div>
            {joinRequestsQuery.isLoading ? <AgencyOwnerTabListSkeleton /> : null}
            {joinRequestsQuery.isError ? (
              <ErrorState
                title="Could not load join requests"
                message={
                  joinRequestsQuery.error instanceof ApiError &&
                  typeof joinRequestsQuery.error.detail === "string"
                    ? joinRequestsQuery.error.detail
                    : "There was a problem loading pending requests."
                }
                onRetry={() => { void joinRequestsQuery.refetch(); }}
              />
            ) : null}
            {requestSubTab === "pending" ? (
              <>
                {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && joinRequests.filter(r => r.status === "pending" && !(r.reactivation_accepted_at || r.reapplied_from_request_id)).length === 0 ? (
                  <EmptyState title="No pending requests" description="New requests and decision history will appear here." />
                ) : null}
                {!joinRequestsQuery.isLoading && joinRequests.filter(r => r.status === "pending" && !(r.reactivation_accepted_at || r.reapplied_from_request_id)).length > 0 ? (
                  <div className="space-y-4">
                    {joinRequests.filter(r => r.status === "pending" && !(r.reactivation_accepted_at || r.reapplied_from_request_id)).map((request) => (
                      <div key={request.join_request_id} className="rounded-lg border border-border p-4">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {request.seeker_name ?? "Seeker"}
                              </p>
                              <Badge variant="warning">pending</Badge>
                              {request.prior_invitation ? (
                                <Badge variant="outline">Invited</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {request.seeker_email ?? "Email unavailable"} - {formatDate(request.created_at)}
                            </p>
                            {request.prior_invitation ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {resolvePriorInvitationContextLine(request.prior_invitation)}
                              </p>
                            ) : null}
                            {request.cover_note ? (
                              <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                {request.cover_note}
                              </p>
                            ) : null}
                            {request.portfolio_details ? (
                              <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-600 dark:bg-gray-950/40 dark:text-gray-300">
                                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile details</p>
                                <p className="whitespace-pre-wrap">{request.portfolio_details}</p>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button" size="sm"
                              loading={approveJoinRequest.isPending && approveJoinRequest.variables === request.join_request_id}
                              onClick={() => approveGate.attempt(request.join_request_id)}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button" size="sm" variant="destructive"
                              loading={rejectJoinRequest.isPending && rejectJoinRequest.variables?.requestId === request.join_request_id}
                              onClick={() => rejectGate.attempt(request.join_request_id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : requestSubTab === "approved" ? (
              <>
                {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && approvedRequests.length === 0 ? (
                  <EmptyState title="No approved requests" description="Approved join requests will appear here." />
                ) : null}
                {!joinRequestsQuery.isLoading && approvedRequests.length > 0 ? (
                  <div className="space-y-4">
                    {approvedRequests.map((request, index) => {
                      const agent = agents.find((a) => a.user_id === request.user_id);
                      const liveStatus = agent?.membership_status ?? request.status;
                      const reactivationStage = resolveJoinRequestReactivationStage(request, user?.user_id ?? null, false);
                      return (
                      <div key={request.join_request_id} className="rounded-lg border border-border p-4">
                        {(() => {
                          const requestHistory = getApprovedRequestCycleHistory(approvedHistoryQueries[index]?.data ?? [], request);
                          if (requestHistory.length === 0) return null;
                          return (
                            <MembershipTimeline
                              tier="simple"
                              history={requestHistory}
                              emptyTitle="No events"
                              emptyDescription=""
                              entity="person"
                               defaultUserDisplayName={request.seeker_name ?? request.seeker_email ?? "Seeker"}
                               role={agent?.user_role}
                              status={liveStatus}
                              applicationStatus={request.status}
                              lastSeen={agent?.last_login ? fmtTimeAgo(agent.last_login) : undefined}
                            />
                          );
                        })()}
                        {reactivationStage !== "terminal" ? (
                         <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-2 dark:bg-gray-950/40">
                           {resolveJoinRequestReactivationTrace(request, user?.user_id ?? null, false).map((event) => (
                             <p key={`${event.at ?? ""}-${event.text}`} className="text-sm text-gray-600 dark:text-gray-300">
                               {event.text} — {formatDate(event.at!)}
                             </p>
                           ))}
                         </div>
                            ) : null}
                          </div>
                      );
                    })}
                 </div>
               ) : null}
              </>
            ) : requestSubTab === "rejected" ? (
              <>
                {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && rejectedCycleGroups.length === 0 ? (
                  <EmptyState title="No rejected requests" description="Rejected join requests will appear here." />
                ) : null}
                {!joinRequestsQuery.isLoading && rejectedCycleGroups.length > 0 ? (
                  <div className="space-y-4">
                    {rejectedCycleGroups.map((group) => {
                      const member = historyMemberById.get(group.userId);
                      // U-034b: one cumulative card per applicant; terminal groups
                      // (returning-appeal rejection, or a second rejection) render
                      // no-op with no reconsider CTA.
                      const cumulative = resolveCumulativeRequestLifecycleTimeline(
                        group.requests,
                        { kind: "rejected" },
                      );
                      // Rejected-tab appeal rows: real history rows (message +
                      // timestamp inline, Revoked mechanism), filtered per
                      // group. Liveness annotates from the group's live
                      // pending_appeal — never synthesized, never merged.
                      const groupHasLiveAppeal = group.requests.some(
                        (request) => request.pending_appeal != null,
                      );
                      const appealRows = getRejectedAppealHistory(
                        rejectedHistoryByUserId.get(group.userId) ?? [],
                        { user_id: group.userId },
                        groupHasLiveAppeal,
                      );
                      return (
                      <div key={group.userId} className="rounded-lg border border-border p-4">
                        <TimelineHeader
                          entity="person"
                          name={member?.displayName ?? group.seekerName}
                          email={member?.email ?? group.seekerEmail ?? undefined}
                          avatarUrl={member?.avatarUrl}
                          role={member?.role}
                          status={member?.status}
                          lastSeen={member?.lastSeen}
                          qualifiers={member?.qualifiers}
                          verified={group.requests[0]?.is_verified}
                          applicationStatus="rejected"
                        />
                        <div className="mt-3 space-y-2">
                          <MembershipTimeline
                            tier="rich"
                            history={[...cumulative.entries, ...appealRows]}
                            showHeader={false}
                            pendingReconsiderationNotice={{
                              seekerName: member?.displayName ?? group.seekerName,
                            }}
                            emptyTitle="No rejected requests"
                            emptyDescription="Rejected join requests will appear here."
                          />
                        </div>
                        {cumulative.hasReturningAppealRejection ? (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {resolveTerminalReactivationRejectionMessage()}
                          </p>
                        ) : null}
                      </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : requestSubTab === "expired" ? (
              <>
                {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && expiredCycleGroups.length === 0 ? (
                  <EmptyState title="No expired requests" description="Requests that ever passed through the expired state will appear here." />
                ) : null}
                {!joinRequestsQuery.isLoading && expiredCycleGroups.length > 0 ? (
                  <div className="space-y-4">
                    {expiredCycleGroups.map((group) => {
                      const member = historyMemberById.get(group.userId);
                      return (
                      <div key={group.userId} className="rounded-lg border border-border p-4">
                        {/* Rich person header via the shared TimelineHeader SSOT
                            (same identity the History member blocks use). The
                            expired application badge is the canonical
                            applicationStatus (top-right), not a hand-rolled Badge. */}
                        <TimelineHeader
                          entity="person"
                          name={member?.displayName ?? group.seekerName}
                          email={member?.email ?? group.seekerEmail ?? undefined}
                          avatarUrl={member?.avatarUrl}
                          role={member?.role}
                          status={member?.status}
                          lastSeen={member?.lastSeen}
                          qualifiers={member?.qualifiers}
                          applicationStatus="expired"
                        />
                        {group.requests.map((request, requestIndex) => {
                          // U-022d: the Expired tab narrates its ENTIRE lifecycle as ONE
                          // chronological stream via resolveExpiredNarrativeTimeline
                          // (single sorted array, single banded loop - no second list).
                          const reactivationStage = resolveJoinRequestReactivationStage(request, user?.user_id ?? null, false);
                          const narrativeEvents = resolveExpiredNarrativeTimeline(
                            expiredHistoryByRequestId.get(request.join_request_id) ?? [],
                            request,
                            { viewerUserId: user?.user_id ?? null, viewerIsApplicant: false },
                          );
                          return (
                          <div key={request.join_request_id} className={requestIndex === 0 ? "mt-2 space-y-2" : "mt-4 space-y-2 border-t border-border pt-4"}>
                          {narrativeEvents.length > 0 ? (
                            <div className="space-y-1">
                              {narrativeEvents.map((event, index) => (
                                <p
                                  key={`${event.at}-${event.text}`}
                                  className={`px-2 py-1 text-sm leading-6 text-gray-700 dark:text-gray-300 ${timelineRowBandClass(index)}`}
                                >
                                  {event.text} — {formatDate(event.at)}
                                </p>
                              ))}
                            </div>
                          ) : null}
                           {reactivationStage === "agency_accepted" ? (
                            <p className="rounded-lg bg-green-50 p-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
                              Request is pending. Approve in Review Requests.
                            </p>
                          ) : reactivationStage === "agency_requested" ? (
                            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              Request is pending a response from {request.seeker_name ?? "the applicant"}.
                            </p>
                          ) : reactivationStage === "seeker_requested" ? (
                            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              Reactivation request from {request.seeker_name ?? "Seeker"} is pending in review requests for a decision.
                            </p>
                          ) : reactivationStage === "initial" ? (
                            <div className="space-y-2">
                              <p className="rounded-lg bg-gray-50 p-2 text-sm text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
                                Application from {request.seeker_name ?? "the applicant"} has expired. Request them to reactivate the application.
                              </p>
                              <Button
                                type="button" size="sm"
                                onClick={() => reactivationGate.attempt(request.join_request_id)}
                              >
                                Reactivate Application
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        );
                      })}
                      </div>
                    );
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && joinRequests.filter(r => r.status === "cancelled").length === 0 ? (
                  <EmptyState title="No cancelled requests" description="Cancelled join requests will appear here." />
                ) : null}
                {!joinRequestsQuery.isLoading && joinRequests.filter(r => r.status === "cancelled").length > 0 ? (
                  <div className="space-y-4">
                    {cancelledCycleGroups.map((group) => {
                      const member = historyMemberById.get(group.userId);
                      // DEF-U-COOLDOWN-UNLOCK-DATE-MISMATCH-001(a): read the server-authoritative
                      // cooldown_unlock_at (computed unpaginated per (user, agency) on the backend)
                      // instead of re-deriving from this page's truncated request list. The
                      // server date is the single source of truth for when the 3-strike/30-day
                      // gate expires — matches the date the reapply 403 enforces.
                      const cooldownDate = group.requests[0]?.cooldown_unlock_at
                        ? new Date(group.requests[0]!.cooldown_unlock_at)
                        : null;
                      // Cumulative card content comes from the shared emitter:
                      // lineage-filtered, chronologically ordered, canonical
                      // entries — never a hand-rolled loop.
                      const cumulative = resolveCumulativeRequestLifecycleTimeline(
                        group.requests,
                        { kind: "cancelled" },
                      );
                      return (
                      <div key={group.userId} className="rounded-lg border border-border p-4">
                        {/* Rich person header via the shared TimelineHeader SSOT
                            (same identity the History member blocks use). The
                            cancelled application badge is the canonical
                            applicationStatus (top-right), not a hand-rolled Badge. */}
                        <TimelineHeader
                          entity="person"
                          name={member?.displayName ?? group.seekerName}
                          email={member?.email ?? group.seekerEmail ?? undefined}
                          avatarUrl={member?.avatarUrl}
                          role={member?.role}
                          status={member?.status}
                          lastSeen={member?.lastSeen}
                          qualifiers={member?.qualifiers}
                          verified={group.requests[0]?.is_verified}
                          applicationStatus="cancelled"
                        />
                        {cooldownDate ? (
                          (() => {
                            const cooldown = resolveCooldownAmbient({
                              applicantName: group.seekerName,
                              cooldownDate,
                            });
                            return (
                              <p className={`mt-2 ${ambientTextToneClass[cooldown.tone]}`}>
                                {cooldown.text}
                              </p>
                            );
                          })()
                        ) : null}
                        <div className="mt-3 space-y-2">
                          <MembershipTimeline
                            tier="rich"
                            history={cumulative.entries}
                            showHeader={false}
                            pendingReapplyNotice={{
                              viewerIsApplicant: false,
                              name: group.seekerName,
                              position: "above",
                            }}
                            emptyTitle="No cancelled requests"
                            emptyDescription="Cancelled join requests will appear here."
                          />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "reviewRequests" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review requests</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review returning applications, appeals and reactivation requests.
              </p>
            </div>
            {reviewRequestsQuery.isLoading ? <AgencyOwnerTabListSkeleton /> : null}
            {reviewRequestsQuery.isError ? (
              <ErrorState
                title="Could not load review requests" message="There was a problem loading agency review requests."
                onRetry={() => { void reviewRequestsQuery.refetch(); }}
              />
            ) : null}
            {!reviewRequestsQuery.isLoading && !reviewRequestsQuery.isError && reviewRequestGroups.length === 0 ? (
              <EmptyState title="No review requests" description="Requests to rejoin or review a membership decision will appear here." />
            ) : null}
            {!reviewRequestsQuery.isLoading && reviewRequestGroups.length > 0 ? (
              <div className="space-y-4">
                {reviewRequestGroups.map((group) => {
                  /* U-021 fix: a user may have several pending queue rows
                     (generic review request, reapply join request,
                     membership-scoped appeal). One actionable card per
                     user — the actionable target is the MOST RECENT
                     pending request, not find()'s oldest-first first
                     match. Superseded priors stay grouped for follow-up
                     surfacing (DEF-U-REVIEWQUEUE-PRIORS-001). */
                  const actionableRequests = group.requests.filter(isQueueActionableRequest);
                  const primaryRequest =
                    actionableRequests.length > 0
                      ? actionableRequests.reduce((latest, request) =>
                          new Date(queueRowActionableAt(request)).getTime() >
                          new Date(queueRowActionableAt(latest)).getTime()
                            ? request
                            : latest,
                        )
                      : group.requests[0];

                  const priorRequests = group.requests.filter(
                    (request) => request.id !== primaryRequest.id,
                  );

                  return (
                  <div key={group.userId} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {group.requesterName}
                          </p>
                          {reviewQueueSourceLabel(primaryRequest) ? (
                            <Badge variant="outline">
                              {reviewQueueSourceLabel(primaryRequest)}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {group.requesterEmail ?? "Email unavailable"}
                        </p>
                        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 dark:bg-gray-950/40">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {isQueueActionableRequest(primaryRequest) ? "Requested" : primaryRequest.status === "accepted" ? "Accepted" : "Declined"} {formatDate(queueRowActionableAt(primaryRequest))}
                          </p>
                          {reviewQueueNarrativeEvent(primaryRequest) ? (
                            <p className="text-gray-600 dark:text-gray-400">
                              {reviewQueueNarrativeEvent(primaryRequest)}
                            </p>
                          ) : null}
                          {primaryRequest.message ? (
                            <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {primaryRequest.message}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {isQueueActionableRequest(primaryRequest) ? (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button type="button" size="sm"
                            loading={acceptReview.isPending && acceptReview.variables?.requestId === primaryRequest.id}
                            onClick={() => attemptReviewDecision("accept", primaryRequest, group.requesterName)}
                          >
                            Accept
                          </Button>
                          {primaryRequest.actor_id !== user?.user_id ? (
                            <Button type="button" size="sm" variant="secondary"
                              loading={declineReview.isPending && declineReview.variables?.requestId === primaryRequest.id}
                              onClick={() => attemptReviewDecision("decline", primaryRequest, group.requesterName)}
                            >
                              Decline
                            </Button>
                          ) : null}
                        </div>
                            ) : null}
                          </div>
                    {priorRequests.length > 0 ? (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Prior requests ({priorRequests.length})
                        </p>
                        <div className="space-y-1">
                          {priorRequests.map((req, idx) => (
                            <div
                              key={`${req.source_type ?? "req"}-${req.id}`}
                              className={`rounded-md px-3 py-2 text-xs leading-5 ${timelineRowBandClass(idx)}`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 font-medium">
                                    <span className="text-gray-900 dark:text-white">
                                      {isQueueActionableRequest(req)
                                        ? "Requested"
                                        : req.status === "accepted"
                                          ? "Accepted"
                                          : "Declined"}{" "}
                                      {formatDate(queueRowActionableAt(req))}
                                    </span>
                                    {reviewQueueSourceLabel(req) ? (
                                      <Badge variant="outline">
                                        {reviewQueueSourceLabel(req)}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  {req.message ? (
                                    <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                      {req.message}
                                    </p>
                                  ) : null}
                                </div>
                                {isQueueActionableRequest(req) ? (
                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button type="button" size="sm"
                                      loading={acceptReview.isPending && acceptReview.variables?.requestId === req.id}
                                      onClick={() => attemptReviewDecision("accept", req, group.requesterName)}
                                    >
                                      Accept
                                    </Button>
                                    {req.actor_id !== user?.user_id ? (
                                      <Button type="button" size="sm" variant="secondary"
                                        loading={declineReview.isPending && declineReview.variables?.requestId === req.id}
                                        onClick={() => attemptReviewDecision("decline", req, group.requesterName)}
                                      >
                                        Decline
                                      </Button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                          </div>
                   );
                 })}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "agents" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agent roster</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage active, suspended, inactive, and blocked agency memberships.
              </p>
            </div>
            {agentsQuery.isLoading ? <AgencyOwnerRosterSkeleton /> : null}
            {agentsQuery.isError ? (
              <ErrorState
                title="Could not load agents" message="There was a problem loading your agency roster."
                onRetry={() => { void agentsQuery.refetch(); }}
              />
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.filter(a => a.membership_status === "active").length === 0 ? (
              <EmptyState title="No agents yet" description="Approved join requests and invited agents will appear here." />
            ) : null}
            {!agentsQuery.isLoading && agents.filter(a => a.membership_status === "active").length > 0 ? (
              <div className="divide-y divide-border">
                {agents.filter(a => a.membership_status === "active").map((agent) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1 space-y-1">
                        <TimelineHeader
                          entity="person"
                          avatarUrl={agent.profile_image_url}
                          name={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                          status={formatMembershipStatus(agent.membership_status)}
                          email={agent.phone_number ? `${agent.email} - ${agent.phone_number}` : agent.email}
                          lastSeen={agent.last_login ? fmtTimeAgo(agent.last_login) : "Never logged in"}
                          qualifiers={[
                            agent.specialization ?? "Real estate agent",
                            ...(agent.years_experience != null ? [`${agent.years_experience} years experience`] : []),
                            ...(agent.license_number ? [`License ${agent.license_number}`] : []),
                            ...(agent.status_reason ? [`Decision reason: ${agent.status_reason}`] : []),
                            ...(agent.status_decided_at ? [`Last decision ${formatOptionalDate(agent.status_decided_at)}`] : []),
                            `${agent.listing_count} active listing${agent.listing_count !== 1 ? "s" : ""}.`,
                          ]}
                        />
                  {agent.pending_review_request_id ? (
                            <div className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              <p className="font-medium">Review requested</p>
                              {agent.pending_review_reason ? <p className="mt-1">{agent.pending_review_reason}</p> : null}
                              {agent.pending_review_submitted_at ? <p className="mt-1">Submitted {formatOptionalDate(agent.pending_review_submitted_at)}</p> : null}
                            </div>
                          ) : null}
                          {expandedApplicationUserId === agent.user_id ? (
                            (() => {
                              const application = joinRequests.find(
                                (jr) => jr.user_id === agent.user_id && jr.status === "approved",
                              );
                              if (!application) return null;
                              return (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 dark:border-gray-700 dark:bg-gray-900/50">
                                  <p className="font-medium text-gray-900 dark:text-white">Original application</p>
                                  {application.cover_note ? (
                                    <p className="mt-1 text-gray-600 dark:text-gray-400">{application.cover_note}</p>
                                  ) : (
                                    <p className="mt-1 italic text-gray-400">No cover note</p>
                                  )}
                                  <p className="mt-1 text-gray-400">
                                    Submitted {application.created_at ? formatOptionalDate(application.created_at) : "unknown date"}
                                  </p>
                                </div>
                              );
                            })()
                          ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {agent.profile_id ? (
                          <Link href={`/agents/${agent.profile_id}`}
                            className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-transparent bg-secondary px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-secondary-foreground transition-all outline-none select-none hover:bg-secondary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            View
                          </Link>
                        ) : null}
                        {joinRequests.find((jr) => jr.user_id === agent.user_id && jr.status === "approved") ? (
                          <Button
                            type="button" size="sm" variant="ghost"
                            onClick={() =>
                              setExpandedApplicationUserId(
                                expandedApplicationUserId === agent.user_id ? null : agent.user_id,
                              )
                            }
                          >
                            {expandedApplicationUserId === agent.user_id ? "Hide application" : "View application"}
                          </Button>
                        ) : null}
                        {agent.is_agency_owner || agent.user_id === user?.user_id ? null : (
                          <>
                            {agent.membership_status === "active" ? (
                              <Button type="button" size="sm" variant="secondary"
                                loading={suspendMembership.isPending && suspendMembership.variables?.membershipId === agent.membership_id}
                                onClick={() =>
                                  suspendGate.attempt({
                                    membershipId: agent.membership_id,
                                    agentName: agent.display_name || agent.company_name || "this agent",
                                  })
                                }
                              >
                                Suspend
                              </Button>
                            ) : null}
                            {agent.membership_status === "active" ? (
                              <Button type="button" size="sm" variant="secondary"
                                loading={revokeMembership.isPending && revokeMembership.variables?.membershipId === agent.membership_id}
                                onClick={() =>
                                  revokeGate.attempt({
                                    membershipId: agent.membership_id,
                                    agentName: agent.display_name || agent.company_name || "this agent",
                                  })
                                }
                              >
                                Revoke
                              </Button>
                            ) : null}
                            {agent.membership_status !== "blocked" ? (
                              <Button type="button" size="sm" variant="destructive"
                                loading={blockMembership.isPending && blockMembership.variables?.membershipId === agent.membership_id}
                                onClick={() =>
                                  blockGate.attempt({
                                    membershipId: agent.membership_id,
                                    agentName: agent.display_name || agent.company_name || "this agent",
                                  })
                                }
                              >
                                Block
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                    {/* Decision reason is captured in the confirmation dialog only
                        (single canonical entry point); the former inline input
                        duplicated the dialog's own reason field. */}
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "inactive" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Inactive agents</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Active members whose last login was more than 90 days ago.
              </p>
            </div>
            {agentsQuery.isLoading ? <AgencyOwnerRosterSkeleton /> : null}
            {agentsQuery.isError ? (
              <ErrorState
                title="Could not load agents" message="There was a problem loading your agency roster."
                onRetry={() => { void agentsQuery.refetch(); }}
              />
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && tabCounts.inactive === 0 ? (
              <EmptyState title="No inactive agents" description="All active agents have logged in within the last 90 days." />
            ) : null}
            {!agentsQuery.isLoading && tabCounts.inactive != null && tabCounts.inactive > 0 ? (
              <div className="divide-y divide-border">
                {agents.filter(isAgentInactive).map((agent) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <TimelineHeader
                          entity="person"
                          avatarUrl={agent.profile_image_url}
                          name={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                          email={agent.email}
                          lastSeen={agent.last_login ? fmtTimeAgo(agent.last_login) : "Never logged in"}
                          qualifiers={[
                            `${agent.listing_count} active listing${agent.listing_count !== 1 ? "s" : ""}.`,
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              This tab is for awareness only. Agent reactivation requires the agent to log in again.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "invitations" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite agent</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create an invite for an agent by email.
              </p>
            </div>
            {/* Invite creation is a click-to-open dialog (same canonical popover
                pattern as the membership/review decision dialogs, 2ef202c): the
                email entry lives in the dialog, never inline-preset on the tab. */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger
                render={<Button type="button">Send invite</Button>}
              />
              <DialogContent finalFocus={false}>
                <DialogHeader>
                  <DialogTitle>Invite agent</DialogTitle>
                  <DialogDescription>
                    Create an invite for an agent by email. The invitee receives an email with a link to join your agency.
                  </DialogDescription>
                </DialogHeader>
                <form
                  id="invite-agent-form"
                  className="space-y-4"
                  onSubmit={(event) => void handleSubmit(handleInvite)(event)}
                >
                  <Input label="Agent email" type="email" placeholder="agent@example.com" error={errors.email?.message} {...register("email")} />
                  {errors.root?.message ? <p className="text-sm text-red-600" role="alert">{errors.root.message}</p> : null}
                </form>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="secondary" />}>Cancel</DialogClose>
                  <Button type="submit" form="invite-agent-form" loading={inviteAgent.isPending}>Send invite</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sent invitations</h3>
              {invitationsQuery.isLoading ? <AgencyOwnerTabListSkeleton /> : null}
              {invitationsQuery.isError ? (
                <ErrorState
                  title="Could not load invitations" message="There was a problem loading sent invitations."
                  onRetry={() => { void invitationsQuery.refetch(); }}
                />
              ) : null}
              {!invitationsQuery.isLoading && !invitationsQuery.isError && invitations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No invitations sent yet.</p>
              ) : null}
            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
              {[
                { value: "pending" as const, label: `Pending (${invitations.filter(i => i.status === "pending").length})` },
                { value: "accepted" as const, label: `Accepted (${invitations.filter(i => i.status === "accepted").length})` },
                { value: "rejected" as const, label: `Rejected (${invitations.filter(i => i.status === "rejected").length})` },
                { value: "expired" as const, label: `Expired (${invitations.filter(hasExpiredHistory).length})` },
                { value: "withdrawn" as const, label: `Withdrawn (${invitations.filter(hasWithdrawnHistory).length})` },
              ].map(({ value, label }) => (
                <Button key={value} type="button" variant={invitationSubTab === value ? "primary" : "ghost"} size="sm" onClick={() => setInvitationSubTab(value)}>
                  {label}
                </Button>
              ))}
            </div>
            {invitationSubTab === "pending" ? (
              <div className="space-y-3">
                {invitations.filter(i => i.status === "pending").length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No pending invitations.</p>
                ) : (
                  invitations.filter(i => i.status === "pending").map((invitation) => (
                    <div key={invitation.invitation_id} className="rounded-lg border border-border p-3 text-sm">
                      <TimelineHeader entity="person" name={resolveInviteeName(invitation)} email={invitation.email} />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Sent {formatDate(invitation.created_at)}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {resolveInvitationPendingAgencyText({ name: resolveInviteeName(invitation) })}
                      </p>
                      <div className="mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={withdrawInvitation.isPending && withdrawInvitation.variables === invitation.invitation_id}
                          onClick={() => withdrawGate.attempt(invitation.invitation_id)}
                        >
                          Withdraw
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : invitationSubTab === "accepted" ? (
              <div className="space-y-3">
                {invitations.filter(i => i.status === "accepted").length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No accepted invitations.</p>
                ) : (
                  invitations.filter(i => i.status === "accepted").map((invitation) => (
                    <div key={invitation.invitation_id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <TimelineHeader entity="person" name={resolveInviteeName(invitation)} email={invitation.email} />
                        <Badge variant="success">accepted</Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Sent {formatDate(invitation.created_at)}</p>
                      {invitation.accepted_at ? (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Accepted {formatDate(invitation.accepted_at)}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : invitationSubTab === "rejected" ? (
              <div className="space-y-3">
                {invitations.filter(i => i.status === "rejected").length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No rejected invitations.</p>
                ) : (
                  invitations.filter(i => i.status === "rejected").map((invitation) => {
                    const subsequent = getInvitationSubsequentApplications(
                      invitation,
                      joinRequests.map((request) => ({
                        agency_id: request.agency_id,
                        user_id: request.user_id,
                        submitted_at: request.created_at,
                      })),
                      { viewerUserId: user?.user_id ?? null, viewerIsApplicant: false },
                    );
                    return (
                      <div key={invitation.invitation_id} className="rounded-lg border border-border p-3 text-sm">
                        <TimelineHeader entity="person" name={resolveInviteeName(invitation)} email={invitation.email} />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Sent {formatDate(invitation.created_at)}</p>
                        {invitation.rejected_at ? (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Rejected {formatDate(invitation.rejected_at)}</p>
                        ) : null}
                        {subsequent.map((application) => (
                          <p key={application.submitted_at} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Applied {formatDate(application.submitted_at)}
                          </p>
                        ))}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {resolveInvitationRejectedAgencyText({ name: resolveInviteeName(invitation) })}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            ) : invitationSubTab === "expired" ? (
              <div className="space-y-3">
                {invitations.filter(hasExpiredHistory).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No expired invitations.</p>
                ) : (
                  invitations.filter(hasExpiredHistory).map((invitation) => (
                    <AgencyExpiredInvitationCard
                      key={invitation.invitation_id}
                      invitation={invitation}
                      reactivateLoading={
                        reactivateInvitation.isPending &&
                        reactivateInvitation.variables === invitation.invitation_id
                      }
                      onReactivate={() => void handleReactivateInvitation(invitation.invitation_id)}
                    />
                  ))
                )}
              </div>
            ) : invitationSubTab === "withdrawn" ? (
              <div className="space-y-3">
                {invitations.filter(hasWithdrawnHistory).length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No withdrawn invitations.</p>
                ) : (
                  invitations.filter(hasWithdrawnHistory).map((invitation) => (
                    <AgencyWithdrawnInvitationCard
                      key={invitation.invitation_id}
                      invitation={invitation}
                    />
                  ))
                )}
              </div>
            ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "suspended" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Suspended</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Agents whose memberships are currently suspended.
              </p>
            </div>
            {agentsQuery.isLoading ? <AgencyOwnerRosterSkeleton /> : null}
            {agentsQuery.isError ? (
              <ErrorState
                title="Could not load agents" message="There was a problem loading your agency roster."
                onRetry={() => { void agentsQuery.refetch(); }}
              />
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.filter(a => a.membership_status === "suspended").length === 0 ? (
              <EmptyState title="No suspended agents." description="" />
            ) : null}
            {!agentsQuery.isLoading && suspendedAgents.length > 0 ? (
              <div className="divide-y divide-border">
                {suspendedAgents.map((agent, index) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <TimelineHeader
                          entity="person"
                          avatarUrl={agent.profile_image_url}
                          name={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                          status={formatMembershipStatus(agent.membership_status)}
                          email={agent.email}
                          lastSeen={agent.last_login ? fmtTimeAgo(agent.last_login) : "Never logged in"}
                          qualifiers={[
                            ...(agent.status_decided_at ? [`Suspended ${formatDate(agent.status_decided_at)}`] : []),
                            ...(agent.status_reason ? [`Reason: ${agent.status_reason}`] : []),
                            `${agent.listing_count} active listing${agent.listing_count !== 1 ? "s" : ""}.`,
                          ]}
                        />
                      </div>
                    </div>
                    {(() => {
                      // U-035-parity: this member's suspension lifecycle renders
                      // via the shared scoped filter (SSOT) + canonical rich tier —
                      // Shows 2 / expand accordion, same as Left/Revoked.
                      const suspendedEvents = getMembershipHistoryByAction(
                        suspendedHistoryQueries[index]?.data ?? [],
                        { user_id: agent.user_id, agency_id: agent.agency_id },
                        "suspended",
                      );
                      if (suspendedEvents.length === 0) return null;
                      return (
                        <MembershipTimeline
                          tier="rich"
                          history={suspendedEvents}
                          showHeader={false}
                          entity="person"
                          defaultUserDisplayName={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                        />
                      );
                    })()}
                    {/* Decision reason captured in the confirmation dialog only —
                        inline input removed (duplicated the dialog's field). */}
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "leftCancelled" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Left/Cancelled</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Agents who have left or had their memberships cancelled.
              </p>
            </div>
            {agentsQuery.isLoading ? <AgencyOwnerRosterSkeleton /> : null}
            {agentsQuery.isError ? (
              <ErrorState
                title="Could not load agents" message="There was a problem loading your agency roster."
                onRetry={() => { void agentsQuery.refetch(); }}
              />
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && leftAgents.length === 0 ? (
              <EmptyState title="No departed members." description="" />
            ) : null}
            {!agentsQuery.isLoading && leftAgents.length > 0 ? (
              <div className="divide-y divide-border">
                {leftAgents.map((agent, index) => (
                  <div key={agent.user_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <TimelineHeader
                          entity="person"
                          avatarUrl={agent.profile_image_url}
                          name={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                          status={formatMembershipStatus(agent.membership_status)}
                          email={agent.email}
                          lastSeen={agent.last_login ? fmtTimeAgo(agent.last_login) : "Never logged in"}
                          qualifiers={[
                            ...(agent.status_decided_at ? [`Left ${formatDate(agent.status_decided_at)}`] : []),
                            ...(agent.status_reason ? [`Reason: ${agent.status_reason}`] : []),
                            `${agent.listing_count} active listing${agent.listing_count !== 1 ? "s" : ""}.`,
                          ]}
                        />
                      </div>
                    </div>
                    {/* U-028: cumulative card — this member's 'left' events render
                        inside the card via the shared scoped filter (SSOT). */}
                    {(() => {
                      const leftEvents = getMembershipHistoryByAction(
                        leftHistoryQueries[index]?.data ?? [],
                        { user_id: agent.user_id, agency_id: agent.agency_id },
                        "left",
                      );
                      if (leftEvents.length === 0) return null;
                      return (
                        <MembershipTimeline
                          tier="rich"
                          history={leftEvents}
                          showHeader={false}
                          entity="person"
                          defaultUserDisplayName={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                          status={formatMembershipStatus(agent.membership_status)}
                          lastSeen={agent.last_login ? fmtTimeAgo(agent.last_login) : undefined}
                        />
                      );
                    })()}
                    {/* Decision reason captured in the confirmation dialog only —
                        inline input removed (duplicated the dialog's field). */}
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "revoked" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Revoked</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Agents whose memberships have been revoked.
              </p>
            </div>
            {agentsQuery.isLoading ? <AgencyOwnerRosterSkeleton /> : null}
            {agentsQuery.isError ? (
              <ErrorState
                title="Could not load agents" message="There was a problem loading your agency roster."
                onRetry={() => { void agentsQuery.refetch(); }}
              />
            ) : null}
            {(() => {
              if (revokedRenderedAgents.length === 0) {
                return <EmptyState title="No revoked memberships." description="" />;
              }
              return (
                <div className="divide-y divide-border">
                   {revokedRenderedAgents.map(({ agent, index }) => {
                    // Historical-fact predicate is hoisted (U-028): revokedRenderedAgents
                    // already holds only ever-revoked members, so the row renders directly.
                    return (
                    <div key={agent.membership_id} className="space-y-4 py-4">
            {(() => {
              const agentHistory = getRevokedMembershipHistory(
                revokedHistoryQueries[index]?.data ?? [],
                { user_id: agent.user_id, agency_id: agent.agency_id },
                { includeReviewRequests: true },
              );
              if (agentHistory.length === 0) return null;
              return (
                <MembershipTimeline
                  tier="rich"
                  history={agentHistory}
                  entity="person"
                  avatarUrl={agent.profile_image_url}
                  defaultUserDisplayName={agent.display_name || agent.company_name || "Listing agent"}
                  role={agent.user_role}
                  status={formatMembershipStatus(agent.membership_status)}
                  email={agent.email}
                  lastSeen={agent.last_login ? fmtTimeAgo(agent.last_login) : undefined}
                  pendingReviewHighlight
                />
              );
            })()}
            {null}
                    </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "blocked" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Blocked</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Users blocked from this agency.
              </p>
            </div>
            {agentsQuery.isLoading ? <AgencyOwnerRosterSkeleton /> : null}
            {agentsQuery.isError ? (
              <ErrorState
                title="Could not load agents" message="There was a problem loading your agency roster."
                onRetry={() => { void agentsQuery.refetch(); }}
              />
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && blockedAgents.length === 0 ? (
              <EmptyState title="No blocked users." description="" />
            ) : null}
            {!agentsQuery.isLoading && blockedAgents.length > 0 ? (
              <div className="divide-y divide-border">
                {blockedAgents.map((agent, index) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <TimelineHeader
                          entity="person"
                          avatarUrl={agent.profile_image_url}
                          name={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                          status={formatMembershipStatus(agent.membership_status)}
                          email={agent.email}
                          lastSeen={agent.last_login ? fmtTimeAgo(agent.last_login) : "Never logged in"}
                          qualifiers={[
                            ...(agent.status_decided_at ? [`Blocked ${formatDate(agent.status_decided_at)}`] : []),
                            ...(agent.status_reason ? [`Reason: ${agent.status_reason}`] : []),
                          ]}
                        />
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="button" size="sm"
                          loading={unblockMembership.isPending && unblockMembership.variables?.membershipId === agent.membership_id}
                          onClick={() =>
                            setPendingMembershipDecision({
                              action: "unblock", membershipId: agent.membership_id,
                              agentName: agent.display_name || agent.company_name || "this agent",
                            })
                          }
                        >
                          Unblock
                        </Button>
                      </div>
                    </div>
                    {(() => {
                      // U-028 family: this member's block lifecycle renders via the
                      // shared scoped filter (SSOT) + canonical rich accordion —
                      // same as Suspended/Left/Revoked. showHeader={false}: identity
                      // already renders once via the TimelineHeader above (U-018).
                      const blockedEvents = getMembershipHistoryByAction(
                        blockedHistoryQueries[index]?.data ?? [],
                        { user_id: agent.user_id, agency_id: agent.agency_id },
                        "blocked",
                      );
                      if (blockedEvents.length === 0) return null;
                      return (
                        <MembershipTimeline
                          tier="rich"
                          history={blockedEvents}
                          showHeader={false}
                          entity="person"
                          defaultUserDisplayName={agent.display_name || agent.company_name || "Listing agent"}
                          role={agent.user_role}
                        />
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "history" ? (
        <Card>
          <CardBody className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Membership history</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Every member and applicant, grouped individually. Each member shows their two most recent
                events; open a member&apos;s history to see all their activities.
              </p>
            </div>
            {historyMembers.length === 0 ? (
              <EmptyState
                title="No members yet"
                description="Member history will appear here once your agency has members or applications."
              />
            ) : (
              <div className="space-y-8">
                {historyMembers.map((member) => (
                  <AgencyMemberHistoryGroup
                    key={member.userId}
                    agencyId={agencyId}
                    member={member}
                    enabled={activeTab === "history"}
                    originRows={joinRequests}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* Unblock only (queued as Profile B); suspend/revoke/block run
          through gates below. Restore deleted per U.9.3. */}
      <Dialog
        open={Boolean(pendingMembershipDecision)}
        onOpenChange={(open) => { if (!open) setPendingMembershipDecision(null); }}
      >
        <DialogContent finalFocus={false}>
          <DialogHeader>
            <DialogTitle>
              {pendingMembershipDecision
                ? getMembershipDecisionLabel(pendingMembershipDecision.action)
                : "Confirm membership decision"}
            </DialogTitle>
            <DialogDescription>
              {pendingMembershipDecision
                ? `Confirm this action for ${pendingMembershipDecision.agentName}. A reason is required and will be visible in membership history.`
                : "Confirm this membership decision."}
            </DialogDescription>
          </DialogHeader>
          {pendingMembershipDecision ? (
            <Input
              label="Reason" placeholder="Required reason for this decision"
              value={membershipReasons[pendingMembershipDecision.membershipId] ?? ""}
              onChange={(event) =>
                setMembershipReasons((current) => ({
                  ...current,
                  [pendingMembershipDecision.membershipId]: event.target.value,
                }))
              }
            />
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="secondary" />}>Cancel</DialogClose>
            <Button
              type="button"
              variant="primary"
              loading={isPendingDecisionSubmitting}
              disabled={!pendingDecisionReason}
              onClick={() => void handleConfirmMembershipDecision()}
            >
              {pendingMembershipDecision ? getMembershipDecisionLabel(pendingMembershipDecision.action) : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registry-driven lifecycle decisions (U-052 step 3). Seed-dependent
          copy computes here from gate.seed (TDZ note in useGatedAction);
          block's typename target MUST be overridden (hook passes "" for the
          function form, which is submit-only). */}
      <ConfirmDestructiveDialog
        {...suspendGate.dialogProps}
        tokens={
          suspendGate.seed === null
            ? {}
            : {
                name: suspendGate.seed.agentName,
                agency:
                  invitations.find((i) => i.agency_name)?.agency_name ?? "this agency",
              }
        }
      />
      <ConfirmDestructiveDialog
        {...revokeGate.dialogProps}
        tokens={
          revokeGate.seed === null
            ? {}
            : {
                name: revokeGate.seed.agentName,
                agency:
                  invitations.find((i) => i.agency_name)?.agency_name ?? "this agency",
              }
        }
      />
      <ConfirmDestructiveDialog
        {...blockGate.dialogProps}
        tokens={
          blockGate.seed === null
            ? {}
            : {
                name: blockGate.seed.agentName,
                agency:
                  invitations.find((i) => i.agency_name)?.agency_name ?? "this agency",
              }
        }
        typenameTarget={blockGate.seed?.agentName ?? ""}
      />

      {/* Registry-driven plain confirms (U-052 step 4). */}
      <ConfirmDestructiveDialog
        {...withdrawGate.dialogProps}
        tokens={
          withdrawGate.seed === null
            ? {}
            : {
                name:
                  invitations.find((i) => i.invitation_id === withdrawGate.seed)?.email ??
                  "this address",
              }
        }
      />

      {/* Registry-driven review-queue + Pending decisions (U-052 step 2).
          Seed-dependent descriptions and copy tokens compute here from
          gate.seed (TDZ note in useGatedAction — never as opts closures). */}
      <ConfirmDestructiveDialog
        {...acceptReviewGate.dialogProps}
        tokens={
          acceptReviewGate.seed === null ? {} : { name: acceptReviewGate.seed.requesterName }
        }
      />
      <ConfirmDestructiveDialog
        {...declineReviewGate.dialogProps}
        tokens={
          declineReviewGate.seed === null
            ? {}
            : { name: declineReviewGate.seed.requesterName, kind: declineReviewGate.seed.kind }
        }
      />
      <ConfirmDestructiveDialog
        {...approveGate.dialogProps}
        tokens={
          approveGate.seed === null
            ? {}
            : {
                name:
                  joinRequests.find((r) => r.join_request_id === approveGate.seed)?.seeker_name ??
                  "the applicant",
              }
        }
      />
      <ConfirmDestructiveDialog
        {...rejectGate.dialogProps}
        tokens={{}}
        description={
          rejectGate.seed === null
            ? undefined
            : `Confirm this action for ${joinRequests.find((r) => r.join_request_id === rejectGate.seed)?.seeker_name ?? "the applicant"}. A reason is required and will be visible to the applicant.`
        }
      />

      {/* Registry-driven dialog (U-052). Root-level: it must stay mounted
          regardless of which tab panel is active. Seed-dependent
          description computes here from gate.seed (TDZ note in
          useGatedAction — never as an opts closure). */}
      <ConfirmDestructiveDialog
        {...reactivationGate.dialogProps}
        tokens={{}}
        description={
          reactivationGate.seed === null
            ? undefined
            : `Ask ${joinRequests.find((r) => r.join_request_id === reactivationGate.seed)?.seeker_name ?? "the applicant"} to reactivate their expired application.`
        }
      />
    </div>
  );
}
