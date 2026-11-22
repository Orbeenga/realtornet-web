"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, LoadingState } from "@/components";
import { normalizeAppRole } from "@/features/auth/navigation";
import { useGatedAction } from "@/hooks/useGatedAction";
import { emptyGate1Context } from "@/lib/gate-registry";
import { useAuth } from "@/features/auth/AuthContext";
import { AgencyDirectoryClient } from "@/features/agencies/components/AgencyDirectoryClient";
import { MembershipTimeline, TimelineHeader, timelineRowBandClass } from "@/features/agencies/components/MembershipHistoryList";
import { ConfirmDestructiveDialog } from "@/components/ui/ConfirmDestructiveDialog";
import {
  getApprovedRequestCycleHistory,
  getInvitationDecisionResults,
  getInvitationSubsequentApplications,
  getMembershipHistoryByAction,
  getRejectedAppealHistory,
  getRevokedMembershipHistory,
  groupMyJoinRequestCycles,
  resolveCumulativeRequestLifecycleTimeline,
  resolveExpiredNarrativeTimeline,
  resolveInvitationColumnTimeline,
  type ApprovalOriginRow,
} from "./membershipHistory";
import type { AgencyInvitationResponse } from "@/types";
import {
  useAcceptAgencyInvitation,
  useAcceptJoinRequestReactivation,
  useCancelAgencyJoinRequest,
  useCreateAgencyMembershipReviewRequest,
  useCreateAgencyReviewRequest,
  useInvitationEvents,
  useMembershipHistory,
  useMyAgencyInvitations,
  useMyAgencyJoinRequests,
  useMyAgencyMemberships,
  useReapplyAgencyJoinRequest,
  useRejectAgencyInvitation,
  useRejectJoinRequestReactivation,
  useRequestInvitationReactivation,
  useRequestJoinRequestReactivationAsApplicant,
} from "@/features/agencies/hooks";
import {
  ambientTextToneClass,
  hasExpiredHistory,
  hasWithdrawnHistory,
  invitationHasPendingAction,
  resolveCancelledApplicationAmbient,
  resolveInvitationPendingSeekerText,
  resolveInvitationRejectedSeekerText,
  resolveInvitationWithdrawnSeekerText,
  resolveJoinRequestReactivationStage,
  resolveJoinRequestReactivationTrace,
  resolveStatusBadge,
  resolveTerminalReactivationRejectionMessage,
} from "@/lib/membership-lifecycle-messages";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getStatusVariant(status: string) {
  if (status === "approved" || status === "active") {
    return "success" as const;
  }

  if (status === "rejected" || status === "blocked" || status === "inactive" || status === "revoked") {
    return "danger" as const;
  }

  return "warning" as const;
}

function displayMembershipStatus(status: string) {
  return status;
}

type MyAgenciesTab = "agencies" | "invitations" | "memberships" | "requests";

const COOLDOWN_WINDOW_DAYS = 30;
const COOLDOWN_LIMIT = 3;



/* DEF-U-COOLDOWN-UNLOCK-DATE-MISMATCH-001(a): the reapply unlock date is
   SERVER-COMPUTED — `cooldown_unlock_at` (ISO datetime | null) is returned on
   every /join-requests/mine/ row, per (user, agency) pair, computed unpaginated
   as max(decided_at among >=3 in-window cancellations) + 30d. That is the exact
   date the reapply 403 enforces (backend test:
   test_my_join_requests_cooldown_unlock_at_matches_server_gate). The former
   local 3rd-oldest-cancellation + 30d derivation is DELETED — the frontend no
   longer re-derives gate math (single source of truth: the backend gate).
   null = gate not tripped, reapply allowed. */



/* Seekers/Agency-history per-agency group (Rule 20/22 mirror of the agency
   side's AgencyMemberHistoryGroup): one cursor-paginated feed PER AGENCY
   (agency_id) via the canonical useMembershipHistory feed — never a per-tab
   aggregate. The agency group block is always visible; the 2-row cap + "View
   more" reveal, zebra banding, and the persona/header all come from the
   canonical MembershipTimeline rich tier. This makes the seeker History tab
   symmetric with the agency Membership history tab (grouped by agency_id here,
   user_id there), with per-entity disclosure-gated pagination (U-036/U-037). */
function SeekerAgencyHistoryGroup({
  agency,
  enabled,
  originRows,
}: {
  agency: { agency_id: number; agency_name: string; status?: string; is_verified?: boolean };
  enabled: boolean;
  originRows?: ApprovalOriginRow[];
}) {
  const feed = useMembershipHistory(enabled && Boolean(agency.agency_id), agency.agency_id);
  const [expanded, setExpanded] = useState(false);
  /* Disclosure sequencing (U-036): the FETCH control ("Load more events") only
     renders once the bounded reveal is expanded. Collapsed state exposes only
     the count-based "View N more events" reveal. Never both at once. */
  return (
    <div key={agency.agency_id} className="space-y-3">
      {/* Entity-scoped header (U-019 agency contract): the group is per AGENCY,
          so the canonical TimelineHeader renders the agency identity
          (name | verified | event-count) — never the seeker's person header. */}
      <MembershipTimeline
        tier="rich"
        entity="agency"
        verified={agency.is_verified}
        history={feed.data}
        originRows={originRows}
        isLoading={feed.isLoading}
        isError={feed.isError}
        onRetry={() => {
          feed.refetch();
        }}
        defaultUserDisplayName={agency.agency_name}
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

/* Seeker Withdrawn invitation card (per-tab contract): agency identity
   block, column timeline (Sent, Withdrawn, Interest) plus terminal
   interest-path results from the per-invitation audit feed. The feed never
   renders lifecycle rows (the columns carry those) — results only. A
   decided interest (declined, or accepted via the queue) renders terminal:
   the result row speaks, with no ambient and no CTA. */
function SeekerWithdrawnInvitationCard({
  invitation,
  expressLoading,
  onExpressInterest,
}: {
  invitation: AgencyInvitationResponse;
  expressLoading: boolean;
  onExpressInterest: () => void;
}) {
  const feed = useInvitationEvents(invitation.invitation_id, true);
  const history = [
    ...resolveInvitationColumnTimeline(invitation),
    ...getInvitationDecisionResults(feed.data ?? []),
  ];
  const decided =
    invitation.status === "accepted" ||
    history.some((entry) => entry.action === "reactivation_rejected");
  return (
    <Card>
      <CardBody className="space-y-4">
        <TimelineHeader entity="agency" name={invitation.agency_name} />
        <MembershipTimeline tier="simple" history={history} showHeader={false} />
        {decided ? null : invitation.reactivated_at ? (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
            Invitation reactivated — pending your response.
          </p>
        ) : !invitation.interest_expressed_at ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {resolveInvitationWithdrawnSeekerText({ agencyName: invitation.agency_name })}
            </p>
            <Button
              type="button"
              size="sm"
              loading={expressLoading}
              onClick={onExpressInterest}
            >
              Express Interest
            </Button>
          </div>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Interest expressed — awaiting agency response
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export function MyJoinRequestsClient() {
  const [reviewReasons, setReviewReasons] = useState<Record<number, string>>({});
  const [membershipSubTab, setMembershipSubTab] = useState<"active" | "suspended" | "left" | "revoked" | "blocked" | "history">("active");
  const [requestSubTab, setRequestSubTab] = useState<"pending" | "approved" | "rejected" | "expired" | "cancelled">("pending");
  const [invitationSubTab, setInvitationSubTab] = useState<"pending" | "accepted" | "rejected" | "expired" | "withdrawn">("pending");
  const [activeTab, setActiveTab] = useState<MyAgenciesTab>("memberships");
  /* Gate inputs come from the reactive auth context, never from imperative
     localStorage reads taken at render scope (FE-002). A one-shot
     `getStoredToken()` / `getStoredJwtRole()` pair evaluated here describes the
     *pre-bootstrap* auth state, so on the 401 -> refresh -> 200 path it could
     only ever be repaired by an incidental re-render from somewhere else in
     the tree. Subscribing to AuthContext makes the gate track the token and
     role that /auth/me actually resolved, and removes the server/client render
     divergence (the server has no localStorage, so it always evaluated the gate
     as false and rendered the signed-out surface).
     NOTE — this does NOT widen access: `admin` is still deliberately excluded,
     so an admin account still sees the "not available" state below. */
  const { user, token, loading: authLoading } = useAuth();
  const role = normalizeAppRole(user?.user_role);
  const canViewAgencyRequests =
    Boolean(token) && (role === "seeker" || role === "agent" || role === "agency_owner");
  const canViewAgencyInvitations = Boolean(token) && (role === "seeker" || role === "agent");
  const canViewAgencyMemberships = Boolean(token);
  const requestsQuery = useMyAgencyJoinRequests(canViewAgencyRequests);
  const membershipsQuery = useMyAgencyMemberships(canViewAgencyMemberships);
  const historyQuery = useMembershipHistory(canViewAgencyMemberships);
  const invitationsQuery = useMyAgencyInvitations(canViewAgencyInvitations);
  const createReviewRequest = useCreateAgencyMembershipReviewRequest();
  const acceptInvitation = useAcceptAgencyInvitation();
  const rejectInvitation = useRejectAgencyInvitation();
  const requestReactivation = useRequestInvitationReactivation();
  const cancelJoinRequest = useCancelAgencyJoinRequest();
  const acceptReactivation = useAcceptJoinRequestReactivation();
  const reapplyJoinRequest = useReapplyAgencyJoinRequest();

  // Registry Profile B (U-052): reason, then confirm. No Gate 1.
  const cancelGate = useGatedAction<number>("cancel_join", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null, true),
    invoke: (requestId, values) =>
      cancelJoinRequest.mutateAsync({ requestId, reason: values.reason }),
    title: "Cancel join request",
    cancelLabel: "Keep",
    successToast: "Join request cancelled",
    errorFallback: "Could not cancel join request",
  });

  // Registry Profile C (U-052): Gate-1 ordered checks, then message, then confirm.
  const reapplyGate = useGatedAction<number>("reapply", {
    buildContext: (agencyId) => {
      const group = cancelledRequestGroups.find((g) => g.agencyId === agencyId);
      return {
        joinRequests: group?.requests ?? [],
        invitations: [],
        reviewRequests: [],
        viewerUserId: user?.user_id ?? null,
        viewerIsApplicant: true,
        counterpartyName: group?.agencyName ?? "the agency",
        includeCooldownCheck: true,
      };
    },
    invoke: (agencyId, values) =>
      reapplyJoinRequest.mutateAsync({ agencyId, message: values.message }),
    title: "Apply again",
    description: "Include a message for the agency owner with your reapplication.",
    successToast: "Application submitted — it will appear in the agency's Review Requests queue.",
    errorFallback: "Could not reapply",
  });

  const cooldownCutoff = useState(() => Date.now() - COOLDOWN_WINDOW_DAYS * 86_400_000)[0];

  const handleReviewRequest = async (
    agencyId: number,
    membershipId: number,
    pendingReviewRequestId?: number | null,
  ) => {
    // UI-008 gate order: the pending-review check must short-circuit FIRST,
    // before any reason-field validation (mirrors the registry Gate-1-first
    // shape); the server 409 path below stays as the defensive second layer.
    if (pendingReviewRequestId != null) {
      notify.info("Review request already submitted - waiting for agency response.");
      return;
    }
    const message = reviewReasons[membershipId]?.trim();
    if (!message) {
      notify.error("Please provide a reason before submitting a review request.");
      return;
    }
    try {
      await createReviewRequest.mutateAsync({
        agencyId,
        membershipId,
        reason: message,
      });
      notify.success("Your request has been submitted.");
      setReviewReasons((current) => {
        const next = { ...current };
        delete next[membershipId];
        return next;
      });
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      const text = typeof detail === "string" ? detail.toLowerCase() : "";

      if (
        error instanceof ApiError &&
        (error.status === 409 || error.status === 400) &&
        (text.includes("pending") || text.includes("already"))
      ) {
        notify.info("Review request already submitted - waiting for agency response.");
        return;
      }

      notify.error("Could not submit review request");
    }
  };

  // Registry Profile A with optional note (U-053): confirm + note on one
  // dialog, no gate. Blank note sends no body (backend backward compat).
  const inviteAcceptGate = useGatedAction<number>("invitation_accept", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null, true),
    invoke: (invitationId, values) => {
      const note = values.note.trim();
      return acceptInvitation.mutateAsync(
        note ? { invitationId, message: note } : { invitationId },
      );
    },
    title: "Accept invitation",
    successToast: "Invitation accepted",
    errorFallback: "Could not accept invitation",
  });

  // Registry Profile A (invitations crossover): terminal reject gains a
  // confirm-only dialog with the locked terminal warning (was direct-fire).
  const inviteRejectGate = useGatedAction<number>("invitation_reject", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null, true),
    invoke: (invitationId) => rejectInvitation.mutateAsync(invitationId),
    title: "Reject invitation",
    successToast: "Invitation rejected",
    errorFallback: "Could not reject invitation",
  });

  // Registry Profile C, confirm-only variant (U-052 step 4): same-kind
  // Gate-1 over the TARGET invitation (server guards per-invitation; a
  // pair-wide check would false-block), then the dialog only confirms —
  // the endpoint takes no body.
  const inviteReactivationGate = useGatedAction<number>("invitation_reactivation_request", {
    buildContext: (invitationId) => {
      const target = invitations.find((i) => i.invitation_id === invitationId);
      return {
        joinRequests: [],
        invitations: target ? [target] : [],
        reviewRequests: [],
        viewerUserId: user?.user_id ?? null,
        viewerIsApplicant: true,
        counterpartyName: target?.agency_name ?? "the agency",
        includeCooldownCheck: false,
      };
    },
    invoke: (invitationId) => requestReactivation.mutateAsync(invitationId),
    title: "Request reactivation",
    successToast: "Reactivation requested",
    errorFallback: "Could not request reactivation",
  });

  // Cancel runs through cancelGate (registry Profile B) — no bespoke handler.

  // Registry Profile A (U-052 step 2, ruling 3): applicant consent accept
  // gains a confirm-only dialog (was direct-fire).
  const acceptReactivationGate = useGatedAction<number>("accept_reactivation", {
    buildContext: () => emptyGate1Context(user?.user_id ?? null, true),
    invoke: (requestId) => acceptReactivation.mutateAsync(requestId),
    title: "Accept reactivation",
    successToast: "Reactivation accepted — request is pending again.",
    errorFallback: "Could not accept reactivation",
  });

  /* Reapply runs through reapplyGate (registry Profile C): Gate-1 ordered
     checks (pending 1-2 + cooldown 3 with date) pre-dialog, message Gate 2
     in-dialog, pending_exists stale-view mapping on the server path. Button
     stays clickable — never hard-disable (UI-008). */

  const requestJoinRequestReactivationAsApplicant = useRequestJoinRequestReactivationAsApplicant();
  const rejectReactivation = useRejectJoinRequestReactivation();

  // Registry Profile C, confirm-only variant (U-050): Expired reactivation
  // takes NO message (time-driven) — Gate 1, then the dialog only confirms.
  const reactivationGate = useGatedAction<number>("reactivation_request", {
    buildContext: (requestId) => {
      const group = expiredRequestGroups.find((g) =>
        g.requests.some((r) => r.join_request_id === requestId),
      );
      return {
        joinRequests: group?.requests ?? [],
        invitations: [],
        reviewRequests: [],
        viewerUserId: user?.user_id ?? null,
        viewerIsApplicant: true,
        counterpartyName: group?.agencyName ?? "the agency",
        includeCooldownCheck: false,
      };
    },
    invoke: (requestId) =>
      requestJoinRequestReactivationAsApplicant.mutateAsync({ requestId }),
    title: "Request reactivation",
    successToast: "Reactivation requested — awaiting agency response.",
    errorFallback: "Could not request reactivation",
  });

  const createReconsiderationRequest = useCreateAgencyReviewRequest();
  // U-049/U-050 reconsideration flow (Rejected tab) on the registry
  // (Profile C): exactly one button per fresh card → Gate 1 → message dialog
  // → POST. No pre-rendered box, no Apply Again. The verbatim post-submit
  // ambient derives from the live pending_appeal row field (single source of
  // truth, survives reload). POSTs the EXISTING review-requests endpoint with
  // Q1b origin linkage (Q1d: no new endpoint); 409/400/404 stay server-side.
  const reconsiderGate = useGatedAction<{ agencyId: number; joinRequestId: number }>(
    "reconsideration_request",
    {
      buildContext: (seed) => {
        const group = rejectedRequestGroups.find((g) => g.agencyId === seed.agencyId);
        return {
          joinRequests: group?.requests ?? [],
          invitations: [],
          reviewRequests: [],
          viewerUserId: user?.user_id ?? null,
          viewerIsApplicant: true,
          counterpartyName: group?.agencyName ?? "the agency",
          includeCooldownCheck: false,
        };
      },
      invoke: (seed, values) =>
        createReconsiderationRequest.mutateAsync({
          agencyId: seed.agencyId,
          payload: { message: values.message, join_request_id: seed.joinRequestId },
        }),
      title: "Request reconsideration",
      successToast: "Reconsideration requested — it will appear in the agency's Review Requests queue.",
      errorFallback: "Could not request reconsideration",
    },
  );

  const handleRejectReactivation = async (requestId: number) => {
    try {
      await rejectReactivation.mutateAsync({ requestId });
      notify.success("Reactivation request rejected.");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not reject reactivation");
    }
  };

  if (authLoading) {
    return <LoadingState />;
  }

  if (!token) {
    return (
      <Card>
        <CardBody className="space-y-4 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Sign in to view requests
          </h1>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign in
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (!canViewAgencyRequests) {
    return (
      <EmptyState
        title="Agency requests are not available"
        description="Use a seeker, agent, or agency owner account to track agency join activity."
      />
    );
  }

  if (requestsQuery.isLoading || membershipsQuery.isLoading || invitationsQuery.isLoading) {
    return <LoadingState />;
  }

  if (requestsQuery.isError) {
    return (
      <ErrorState
        title="Could not load join requests"
        message="There was a problem loading your agency join requests."
        onRetry={() => {
          void requestsQuery.refetch();
        }}
      />
    );
  }

  const requests = requestsQuery.data ?? [];
  const cancelledRequestGroups = groupMyJoinRequestCycles(requests);
  // Expired sub-tab entity groups (grouped by agency_id) — one cumulative card
  // per agency, mirroring the Cancelled tab (answer 4: grouping global).
  const expiredRequestGroups = groupMyJoinRequestCycles(requests, "expired-history");
  // Rejected sub-tab entity groups (grouped by agency_id) — one cumulative card
  // per agency via the shared grouper, mirroring Cancelled/Expired (U-034b).
  const rejectedRequestGroups = groupMyJoinRequestCycles(requests, "rejected");
  const memberships = membershipsQuery.data ?? [];
  const activeMemberships = memberships.filter(m => m.status === "active");
  const suspendedMemberships = memberships.filter(m => m.status === "suspended");
  const leftMemberships = memberships.filter(m => m.status === "left");
  const revokedMemberships = memberships.filter((m) =>
    (historyQuery.data ?? []).some(
      (h) =>
        (h.agency_id === m.agency_id || h.agency_name === m.agency_name) &&
        h.action === "revoked",
    ),
  );
  const blockedMemberships = memberships.filter(m => m.status === "blocked");
  const invitations = invitationsQuery.data ?? [];
  const availableTabs: Array<{ value: MyAgenciesTab; label: string; count?: number }> = [
    { value: "agencies" as const, label: "Find an Agency" },
    ...(canViewAgencyInvitations
      ? [{ value: "invitations" as const, label: "Invitations", count: invitations.length }]
      : []),
    ...(canViewAgencyMemberships
      ? [{ value: "memberships" as const, label: "Memberships", count: memberships.length }]
      : []),
    { value: "requests" as const, label: "Sent requests", count: requests.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          My Agencies
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Track agencies you have joined and requests that are still under review.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        {availableTabs.map(({ value, label, count }) => (
          <Button
            key={value}
            type="button"
            variant={activeTab === value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(value)}
          >
            {label}{count !== undefined ? ` (${count})` : null}
          </Button>
        ))}
      </div>

      {activeTab === "agencies" ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Find an Agency
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse verified agencies and request to join.
          </p>
          <AgencyDirectoryClient />
        </section>
      ) : null}

      {canViewAgencyInvitations && activeTab === "invitations" ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agency invitations
          </h2>

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
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitations.filter(i => i.status === "pending").length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No pending invitations" description="All invitations have been resolved." />
                </div>
              ) : (
                invitations.filter(i => i.status === "pending").map((invitation) => (
                  <Card key={invitation.invitation_id}>
                    <CardBody className="space-y-4">
                      <TimelineHeader entity="agency" name={invitation.agency_name} />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Invited {formatDate(invitation.created_at)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {resolveInvitationPendingSeekerText({ agencyName: invitation.agency_name })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={
                            acceptInvitation.isPending &&
                            acceptInvitation.variables?.invitationId === invitation.invitation_id
                          }
                          onClick={() =>
                            inviteAcceptGate.attempt(invitation.invitation_id)
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={
                            rejectInvitation.isPending &&
                            rejectInvitation.variables === invitation.invitation_id
                          }
                          onClick={() =>
                            inviteRejectGate.attempt(invitation.invitation_id)
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          ) : invitationSubTab === "accepted" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitations.filter(i => i.status === "accepted").length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No accepted invitations" description="Accepted invitations will appear here." />
                </div>
              ) : (
                invitations.filter(i => i.status === "accepted").map((invitation) => (
                  <Card key={invitation.invitation_id}>
                    <CardBody className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${invitation.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {invitation.agency_name}
                        </Link>
                        <Badge variant="success">accepted</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        You accepted the invitation to join {invitation.agency_name}.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Invited {formatDate(invitation.created_at)}
                      </p>
                      {invitation.accepted_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Accepted {formatDate(invitation.accepted_at)}
                        </p>
                      ) : null}
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          ) : invitationSubTab === "rejected" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitations.filter(i => i.status === "rejected").length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No rejected invitations" description="Rejected invitations will appear here." />
                </div>
              ) : (
                invitations.filter(i => i.status === "rejected").map((invitation) => {
                  const subsequent = getInvitationSubsequentApplications(
                    invitation,
                    requests.map((request) => ({
                      agency_id: request.agency_id,
                      submitted_at: request.submitted_at,
                    })),
                    { viewerUserId: user?.user_id ?? null, viewerIsApplicant: true },
                  );
                  return (
                    <Card key={invitation.invitation_id}>
                      <CardBody className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link
                            href={`/agencies/${invitation.agency_id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {invitation.agency_name}
                          </Link>
                          <Badge variant="danger">rejected</Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {resolveInvitationRejectedSeekerText({ agencyName: invitation.agency_name })}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Sent {formatDate(invitation.created_at)}
                        </p>
                        {invitation.rejected_at ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Rejected {formatDate(invitation.rejected_at)}
                          </p>
                        ) : null}
                        {subsequent.map((application) => (
                          <p key={application.submitted_at} className="text-sm text-gray-500 dark:text-gray-400">
                            Applied {formatDate(application.submitted_at)}
                          </p>
                        ))}
                      </CardBody>
                    </Card>
                  );
                })
              )}
            </div>
          ) : invitationSubTab === "expired" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitations.filter(hasExpiredHistory).length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No expired invitations" description="Invitations that ever passed through the expired state will appear here." />
                </div>
              ) : (
                invitations.filter(hasExpiredHistory).map((invitation) => {
                  const hasPendingAction = invitationHasPendingAction(invitation, user?.user_id ?? null);
                  const badge = resolveStatusBadge(invitation.status);
                  return (
                    <Card key={invitation.invitation_id}>
                      <CardBody className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link
                            href={`/agencies/${invitation.agency_id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {invitation.agency_name}
                          </Link>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Invitation from {invitation.agency_name} has expired.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Sent {formatDate(invitation.created_at)}
                        </p>
                        {invitation.expires_at ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Expired {formatDate(invitation.expires_at)}
                          </p>
                        ) : null}
                        {invitation.reactivated_at ? (
                          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
                            Invitation reactivated — pending your response.
                          </p>
                        ) : hasPendingAction ? (
                          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            Reactivation requested — awaiting agency response
                          </p>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            loading={
                              requestReactivation.isPending &&
                              requestReactivation.variables === invitation.invitation_id
                            }
                            onClick={() =>
                              inviteReactivationGate.attempt(invitation.invitation_id)
                            }
                          >
                            Request Reactivation
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  );
                })
              )}
            </div>
          ) : invitationSubTab === "withdrawn" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitations.filter(hasWithdrawnHistory).length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No withdrawn invitations" description="Invitations that ever passed through the withdrawn state will appear here." />
                </div>
              ) : (
                invitations.filter(hasWithdrawnHistory).map((invitation) => (
                  <SeekerWithdrawnInvitationCard
                    key={invitation.invitation_id}
                    invitation={invitation}
                    expressLoading={
                      requestReactivation.isPending &&
                      requestReactivation.variables === invitation.invitation_id
                    }
                    onExpressInterest={() =>
                      inviteReactivationGate.attempt(invitation.invitation_id)
                    }
                  />
                ))
              )}
            </div>
          ) : (
            <EmptyState
              title="No invitations"
              description="Invitations in other states will appear in their respective tabs."
            />
          )}
        </section>
      ) : null}

      {canViewAgencyMemberships && activeTab === "memberships" ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agency memberships
            {/* DEF-U-DEMOTED-SEEKER-DISC-001: persistent indicator for seekers
                who formerly held agent membership (prior agent_membership_audit
                records). Preflight Rule 21 / U-015 disclosure. */}
            {role === "seeker" && historyQuery.data && historyQuery.data.length > 0 ? (
              <Badge variant="outline">Former Agent</Badge>
            ) : null}
          </h2>

          <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
            {[
              { value: "active" as const, label: `Active (${activeMemberships.length})` },
              { value: "suspended" as const, label: `Suspended (${suspendedMemberships.length})` },
              { value: "left" as const, label: `Left (${leftMemberships.length})` },
              { value: "revoked" as const, label: `Revoked (${revokedMemberships.length})` },
              { value: "blocked" as const, label: `Blocked (${blockedMemberships.length})` },
              { value: "history" as const, label: `History (${memberships.length})` },
            ].filter(t => {
              if (t.value === "history") return memberships.length > 0 || membershipSubTab === "history";
              return true;
            }).map(({ value, label }) => (
              <Button key={value} type="button" variant={membershipSubTab === value ? "primary" : "ghost"} size="sm" onClick={() => setMembershipSubTab(value)}>
                {label}
              </Button>
            ))}
          </div>

          {membershipSubTab === "active" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {activeMemberships.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No active memberships" description="You have no active agency memberships." />
                </div>
              ) : (
                activeMemberships.map((membership) => (
                  <Card key={membership.membership_id}>
                    <CardBody className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${membership.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {membership.agency_name}
                        </Link>
                        <Badge variant={getStatusVariant(membership.status)}>
                          {displayMembershipStatus(membership.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {membership.listing_count} active listing{membership.listing_count !== 1 ? "s" : ""} under this agency.
                      </p>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          ) : membershipSubTab === "suspended" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {suspendedMemberships.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No suspended memberships" description="You have no suspended memberships." />
                </div>
              ) : (
                suspendedMemberships.map((membership) => (
                  <Card key={membership.membership_id}>
                    <CardBody className="space-y-4">
                      {(() => {
                        // U-035-parity (lead decision, batch DEF-U-SUSPENDED-ACCORDION-001):
                        // suspended is a multi-event lifecycle like left/revoked; render via
                        // the shared scoped filter (SSOT) + canonical rich accordion.
                        // Lead decision (b): structured exactly like the Revoked tab —
                        // identity renders ONCE via the canonical TimelineHeader; the
                        // bespoke Link name/badge/date/reason chrome is removed (rows
                        // carry their own dates and reasons). Renders unconditionally
                        // so the agency name is always present.
                        const suspendedEvents = getMembershipHistoryByAction(
                          historyQuery.data ?? [],
                          { agency_id: membership.agency_id, agency_name: membership.agency_name },
                          "suspended",
                        );
                        return (
                          <MembershipTimeline
                            tier="rich"
                            history={suspendedEvents}
                            emptyTitle="No events"
                            emptyDescription=""
                            entity="agency"
                            defaultUserDisplayName={membership.agency_name}
                            verified={membership.is_verified}
                          />
                        );
                      })()}
                      {membership.pending_review_request_id ? (
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Review requested
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            rows={3}
                            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            placeholder="Explain why this decision should be reviewed"
                            value={reviewReasons[membership.membership_id] ?? ""}
                            onChange={(event) =>
                              setReviewReasons((current) => ({
                                ...current,
                                [membership.membership_id]: event.target.value,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            loading={
                              createReviewRequest.isPending &&
                              createReviewRequest.variables?.agencyId === membership.agency_id
                            }
                            onClick={() =>
                              void handleReviewRequest(
                                membership.agency_id,
                                membership.membership_id,
                                membership.pending_review_request_id,
                              )
                            }
                          >
                            Request Review
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          ) : membershipSubTab === "left" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {leftMemberships.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No cancelled memberships" description="You have no cancelled or left memberships." />
                </div>
              ) : (
                leftMemberships.map((membership) => (
                  <Card key={membership.membership_id}>
                    <CardBody className="space-y-4">
                      {/* U-028: cumulative card — the relationship's own 'left'
                          events render inside the card via the shared scoped
                          filter (SSOT with the Revoked tabs), not scattered rows. */}
                      {(() => {
                        const leftEvents = getMembershipHistoryByAction(
                          historyQuery.data ?? [],
                          { agency_id: membership.agency_id, agency_name: membership.agency_name },
                          "left",
                        );
                        /* Lead decision (a), U-028 family: identity renders ONCE
                           via the canonical TimelineHeader (agency contract) —
                           the bespoke Link name is removed (U-018: no parallel
                           identity render paths). Timeline renders unconditionally
                           so the agency name is always present, even with no
                           scoped events; rows carry their own dates/reasons. */
                        return (
                          <MembershipTimeline
                            tier="rich"
                            history={leftEvents}
                            emptyTitle="No events"
                            emptyDescription=""
                            entity="agency"
                            defaultUserDisplayName={membership.agency_name}
                            verified={membership.is_verified}
                          />
                        );
                      })()}
                      {membership.pending_review_request_id ? (
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Reinstatement requested
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            rows={3}
                            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            placeholder="Explain why this decision should be reviewed"
                            value={reviewReasons[membership.membership_id] ?? ""}
                            onChange={(event) =>
                              setReviewReasons((current) => ({
                                ...current,
                                [membership.membership_id]: event.target.value,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            loading={
                              createReviewRequest.isPending &&
                              createReviewRequest.variables?.agencyId === membership.agency_id
                            }
                            onClick={() =>
                              void handleReviewRequest(
                                membership.agency_id,
                                membership.membership_id,
                                membership.pending_review_request_id,
                              )
                            }
                          >
                            Request Reinstatement
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          ) : membershipSubTab === "revoked" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {revokedMemberships.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No revoked memberships" description="You have no revoked memberships." />
                </div>
              ) : (
                revokedMemberships.map((membership) => {
                  const fullAgencyHistory = (historyQuery.data ?? []).filter(
                    (h) => h.agency_id === membership.agency_id || h.agency_name === membership.agency_name,
                  );
                  // Rule 20 (SSOT): the rendered timeline consumes the SAME
                  // discriminator filter as the agency-side Revoked tab
                  // (getRevokedMembershipHistory) — not a parallel implementation.
                  // Full history is kept only for the reinstatement/CTA check below.
                  const revokedTimeline = getRevokedMembershipHistory(historyQuery.data ?? [], {
                    agency_id: membership.agency_id,
                    agency_name: membership.agency_name,
                  }, { includeReviewRequests: true });
                  // Reinstatement means: a `reinstated` audit event that happened
                  // AFTER the most recent `revoked`. The original `joined`
                  // approval from a prior cycle must not suppress the CTA
                  // (DEF-U-REVOKED-TAB-DISCRIMINATOR-001, CTA half).
                  const sortedHistory = [...fullAgencyHistory].sort(
                    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                  );
                  const lastRevokedAt = sortedHistory.find((h) => h.action === "revoked")?.timestamp ?? null;
                  const reinstatementEvent = sortedHistory.find(
                    (h) =>
                      h.action === "reinstated" &&
                      (!lastRevokedAt || new Date(h.timestamp).getTime() > new Date(lastRevokedAt).getTime()),
                  );
                  return (
                    <Card key={membership.membership_id}>
                      <CardBody className="space-y-4">
                        {revokedTimeline.length > 0 ? (
                          <MembershipTimeline
                            tier="rich"
                            history={revokedTimeline}
                            entity="agency"
                            defaultUserDisplayName={membership.agency_name}
                            verified={membership.is_verified}
                          />
                        ) : null}
                        {/* UI-008: button stays clickable while a review is pending;
                            the existing handleReviewRequest 409 -> notify.info path explains. */}
                        {!reinstatementEvent ? (
                          <div className="space-y-3">
                            <textarea
                              rows={3}
                              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                              placeholder="Explain why this decision should be reviewed"
                              value={reviewReasons[membership.membership_id] ?? ""}
                              onChange={(event) =>
                                setReviewReasons((current) => ({
                                  ...current,
                                  [membership.membership_id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              loading={
                                createReviewRequest.isPending &&
                                createReviewRequest.variables?.agencyId === membership.agency_id
                              }
                              onClick={() =>
                                void handleReviewRequest(
                                  membership.agency_id,
                                  membership.membership_id,
                                  membership.pending_review_request_id,
                                )
                              }
                            >
                              Request Review
                            </Button>
                          </div>
                        ) : null}
                      </CardBody>
                    </Card>
                  );
                })
              )}
            </div>
          ) : membershipSubTab === "blocked" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {blockedMemberships.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No blocked memberships" description="You have no blocked memberships." />
                </div>
              ) : (
                blockedMemberships.map((membership) => (
                  <Card key={membership.membership_id}>
                    <CardBody className="space-y-4">
                      {/* Lead decision (b), U-028 family: blocked joins the
                          Revoked-tab structure — scoped event timeline via the
                          shared SSOT filter (getMembershipHistoryByAction),
                          identity rendered ONCE through the canonical
                          TimelineHeader, accordion reveal included. Rows carry
                          their own dates/reasons; the terminal-path support
                          notice is retained below. */}
                      {(() => {
                        const blockedEvents = getMembershipHistoryByAction(
                          historyQuery.data ?? [],
                          { agency_id: membership.agency_id, agency_name: membership.agency_name },
                          "blocked",
                        );
                        return (
                          <MembershipTimeline
                            tier="rich"
                            history={blockedEvents}
                            emptyTitle="No events"
                            emptyDescription=""
                            entity="agency"
                            defaultUserDisplayName={membership.agency_name}
                            verified={membership.is_verified}
                          />
                        );
                      })()}
                      <p className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        This agency has restricted your access. Contact platform support if you believe this is in error.
                      </p>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          ) : membershipSubTab === "history" ? (
            /* Per-agency membership-history view (U-037 per-entity scoping):
               one cursor-paginated feed PER agency, mirroring the agency
               History tab's per-member groups. Each agency the user belongs to
               (across all statuses) renders its own block with a disclosure-
               gated "Load more" (U-036). The legacy merged historyQuery remains
               for the Approved/Revoked/Suspended/Left card consumers below. */
            <div className="space-y-4">
              {memberships.length === 0 ? (
                <EmptyState
                  title="No membership history"
                  description="Agency membership events will appear here when they exist."
                />
              ) : (
                memberships.map((membership) => (
                  <SeekerAgencyHistoryGroup
                    key={membership.agency_id}
                    agency={{
                      agency_id: membership.agency_id,
                      agency_name: membership.agency_name,
                      status: membership.status,
                      is_verified: membership.is_verified,
                    }}
                    enabled={canViewAgencyMemberships}
                    originRows={requests}
                  />
                ))
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "requests" ? (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Agency requests
        </h2>

        <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
          {[
            { value: "pending" as const, label: `Pending (${requests.filter(r => r.status === "pending").length})` },
            { value: "approved" as const, label: `Approved (${requests.filter(r => r.status === "approved").length})` },
            { value: "rejected" as const, label: `Rejected (${rejectedRequestGroups.length})` },
            { value: "expired" as const, label: `Expired (${expiredRequestGroups.length})` },
            { value: "cancelled" as const, label: `Cancelled (${cancelledRequestGroups.length})` },
          ].map(({ value, label }) => (
            <Button key={value} type="button" variant={requestSubTab === value ? "primary" : "ghost"} size="sm" onClick={() => setRequestSubTab(value as "pending" | "approved" | "rejected" | "expired" | "cancelled")}>
              {label}
            </Button>
          ))}
        </div>

        {requestSubTab === "pending" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {requests.filter(r => r.status === "pending").length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title="No pending requests"
                  description="Open an agency profile and request to join its roster."
                />
              </div>
            ) : (
              requests.filter(r => r.status === "pending").map((request) => {
                const reactivationStage = resolveJoinRequestReactivationStage(request, user?.user_id ?? null, true);
                return (
                <Card key={request.join_request_id}>
                  <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link
                        href={`/agencies/${request.agency_id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {request.agency_name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="warning">pending</Badge>
                        {/* DEF-U-REAPPLY-BADGE-001: surface reapplication lineage on pending cards */}
                        {request.reapplied_from_request_id != null ? (
                          <Badge variant="outline">reapplied</Badge>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Submitted {formatDate(request.submitted_at)}
                    </p>
                    {request.cover_note ? (
                      <div className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-800/50">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Cover note</p>
                        <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{request.cover_note}</p>
                      </div>
                    ) : null}
                    {request.portfolio_details ? (
                      <div className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-800/50">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Portfolio details</p>
                        <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{request.portfolio_details}</p>
                      </div>
                    ) : null}
                    {reactivationStage === "agency_accepted" ? (
                      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
                        Request is pending. Find it in the Pending tab.
                      </p>
                    ) : null}
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={cancelJoinRequest.isPending && cancelJoinRequest.variables?.requestId === request.join_request_id}
                        onClick={() => cancelGate.attempt(request.join_request_id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardBody>
                </Card>
                );
              })
            )}
          </div>
        ) : requestSubTab === "approved" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {requests.filter(r => r.status === "approved").length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="No accepted requests" description="Approved join requests will appear here." />
              </div>
            ) : (
              requests.filter(r => r.status === "approved").map((request) => {
                const reactivationStage = resolveJoinRequestReactivationStage(request, user?.user_id ?? null, true);
                /* U-021/U-023d parity: the Approved-tab badge stays bound to the
                   application status (request.status) below, but the live
                   membership STANDING (this membership's status, e.g. revoked/
                   suspended) is surfaced as the header qualifier — mirroring the
                   agency Approved card's liveStatus (AgencyMembersClient). */
                const liveStatus =
                  memberships.find((m) => m.agency_id === request.agency_id)?.status ??
                  request.status;
                return (
                    <Card key={request.join_request_id}>
                      <CardBody className="space-y-4">
                        {(() => {
                          const requestHistory = getApprovedRequestCycleHistory(historyQuery.data ?? [], request);
                          if (requestHistory.length === 0) return null;
                          return (
                             <MembershipTimeline
                               tier="simple"
                               history={requestHistory}
                               emptyTitle="No events"
                               emptyDescription=""
                               entity="agency"
                               defaultUserDisplayName={request.agency_name}
                               verified={request.is_verified}
                               status={liveStatus}
                               applicationStatus={request.status}
                             />
                          );
                        })()}
                        {reactivationStage !== "terminal" ? (
                        <div className="space-y-1.5 pt-1">
                          {(() => {
                            const reactivationEvents = resolveJoinRequestReactivationTrace(
                              request,
                              user?.user_id ?? null,
                              true,
                            );
                            return reactivationEvents.map((event) => (
                              <p key={`${event.at ?? ""}-${event.text}`} className="text-sm text-gray-700 dark:text-gray-300">
                                {event.text} — {formatDate(event.at!)}
                              </p>
                            ));
                          })()}
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                );
              })
            )}
          </div>
        ) : requestSubTab === "rejected" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {requests.filter(r => r.status === "rejected").length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="No rejected requests" description="You have no rejected join requests." />
              </div>
            ) : (
              rejectedRequestGroups.map((group) => {
                const agencyId = group.agencyId;
                const groupRequests = group.requests;
                // U-028 / U-009: one cumulative card per (user, agency) pair —
                // every rejected cycle's decision stays visible inside the card.
                // U-034b: terminal groups (returning-appeal rejection, or a
                // second rejection) render no-op with no Apply Again link.
                const cumulative = resolveCumulativeRequestLifecycleTimeline(
                  groupRequests,
                  { kind: "rejected" },
                );
                const latestRequest = [...groupRequests].sort(
                  (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
                )[groupRequests.length - 1];
                // Live appeal state (A2 persistence fix): the ambient derives
                // from the row's pending_appeal, never ephemeral submit state,
                // so it survives reload and discharges on resolution.
                const hasLiveAppeal = groupRequests.some((request) => request.pending_appeal != null);
                // Rejected-tab appeal rows: real history rows (message +
                // timestamp inline, Revoked mechanism), filtered per agency.
                const appealRows = getRejectedAppealHistory(
                  historyQuery.data ?? [],
                  { agency_id: group.agencyId },
                  hasLiveAppeal,
                );
                return (
                <Card key={agencyId}>
                  <CardBody className="space-y-4">
                    {/* Agency header via the shared TimelineHeader SSOT. The
                        rejected application badge is the canonical
                        applicationStatus, not a hand-rolled Badge. */}
                    <TimelineHeader
                      entity="agency"
                      name={group.agencyName}
                      verified={latestRequest?.is_verified}
                      applicationStatus="rejected"
                    />
                    <MembershipTimeline
                      tier="rich"
                      history={[...cumulative.entries, ...appealRows]}
                      showHeader={false}
                      emptyTitle="No rejected requests"
                      emptyDescription="You have no rejected join requests."
                    />
                    {cumulative.hasReturningAppealRejection ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {resolveTerminalReactivationRejectionMessage()}
                      </p>
                    ) : null}
                    {!cumulative.terminal ? (
                      <div className="space-y-3 pt-2">
                        {hasLiveAppeal ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Your reconsideration request is pending a decision from {latestRequest.agency_name}. It&apos;s with {latestRequest.agency_name} for a decision.
                          </p>
                        ) : (
                          <Button
                            type="button" size="sm"
                            onClick={() => reconsiderGate.attempt({ agencyId, joinRequestId: latestRequest.join_request_id })}
                          >
                            Request Reconsideration
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
                );
              })
            )}
          </div>
        ) : requestSubTab === "expired" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {expiredRequestGroups.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="No expired requests" description="Requests that ever passed through the expired state will appear here." />
              </div>
            ) : (
              expiredRequestGroups.map((group) => {
                const latestRequest = group.requests[0];
                return (
                  <Card key={group.agencyId}>
                    <CardBody className="space-y-4">
                      {/* Agency header via the shared TimelineHeader SSOT. The
                          expired application badge is the canonical
                          applicationStatus, not a hand-rolled Badge. */}
                      <TimelineHeader
                        entity="agency"
                        name={group.agencyName}
                        verified={latestRequest?.is_verified}
                        applicationStatus="expired"
                      />
                      {group.requests.map((request, requestIndex) => {
                        // U-022d: the Expired tab narrates its ENTIRE lifecycle as ONE
                        // chronological stream. resolveExpiredNarrativeTimeline merges all
                        // events (submitted, expired, reactivation, approval, downstream
                        // revoked/reinstated) into a single sorted array with real
                        // timestamps — never two separately-rendered lists, which is what
                        // previously produced out-of-order rows and broken banding.
                        const reactivationStage = resolveJoinRequestReactivationStage(request, user?.user_id ?? null, true);
                        const narrativeEvents = resolveExpiredNarrativeTimeline(
                          historyQuery.data ?? [],
                          request,
                          { viewerUserId: user?.user_id ?? null, viewerIsApplicant: true },
                        );
                        return (
                          <div key={request.join_request_id} className={requestIndex === 0 ? "space-y-4" : "space-y-4 border-t border-border pt-4"}>
                      {request.cover_note ? (
                        <div className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-800/50">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Cover note</p>
                          <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{request.cover_note}</p>
                        </div>
                      ) : null}
                      {narrativeEvents.length > 0 ? (
                        <div className="space-y-2">
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
                        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
                          Request is pending. Find it in the Pending tab.
                        </p>
                      ) : reactivationStage === "agency_requested" ? (
                        <div className="space-y-3">
                          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            {request.agency_name ?? "The agency"} has requested to reactivate your expired application.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button" size="sm"
                              loading={acceptReactivation.isPending && acceptReactivation.variables === request.join_request_id}
                              onClick={() => acceptReactivationGate.attempt(request.join_request_id)}
                            >
                              Accept Reactivation
                            </Button>
                            <Button
                              type="button" size="sm" variant="ghost"
                              loading={rejectReactivation.isPending && rejectReactivation.variables?.requestId === request.join_request_id}
                              onClick={() => void handleRejectReactivation(request.join_request_id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ) : reactivationStage === "seeker_requested" ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Request is pending a response from {request.agency_name ?? "the agency"}.
                        </p>
                      ) : reactivationStage === "initial" ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            This application has expired. You can request reactivation, or wait for {request.agency_name ?? "the agency"} to reach out.
                          </p>
                          <Button
                            type="button" size="sm"
                            onClick={() => reactivationGate.attempt(request.join_request_id)}
                          >
                            Request Reactivation
                          </Button>
                        </div>
                      ) : null}
                          </div>
                        );
                      })}
                    </CardBody>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {cancelledRequestGroups.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="No cancelled requests" description="You have no cancelled join requests." />
              </div>
            ) : (
              cancelledRequestGroups.map((group) => {
                // Server-computed unlock date per (user, agency) pair — null = no cooldown.
                const applyAgainDate = group.requests[0]?.cooldown_unlock_at
                  ? new Date(group.requests[0].cooldown_unlock_at)
                  : null;
                // Cumulative card content comes from the shared emitter:
                // lineage-filtered, chronologically ordered, canonical
                // entries — never a hand-rolled loop.
                const cumulative = resolveCumulativeRequestLifecycleTimeline(
                  group.requests,
                  { kind: "cancelled" },
                );
                return (
                <Card key={group.agencyId}>
                  <CardBody className="space-y-4">
                    {/* Agency entity header via the shared TimelineHeader SSOT
                        (name + verified + event count). The cancelled application
                        badge renders canonically via applicationStatus. */}
                    <TimelineHeader
                      entity="agency"
                      name={group.agencyName}
                      verified={group.requests[0]?.is_verified}
                      eventCount={group.requests.length}
                      applicationStatus="cancelled"
                    />
                    {(() => {
                      const ambient = resolveCancelledApplicationAmbient({
                        agencyName: group.agencyName,
                        applyAgainDate,
                      });
                      return (
                        <p className={ambientTextToneClass[ambient.tone]}>{ambient.text}</p>
                      );
                    })()}
                    <div className="space-y-2">
                      <MembershipTimeline
                        tier="rich"
                        history={cumulative.entries}
                        showHeader={false}
                        pendingReapplyNotice={{
                          viewerIsApplicant: true,
                          name: group.agencyName,
                          position: "below",
                        }}
                        emptyTitle="No cancelled requests"
                        emptyDescription="You have no cancelled join requests."
                      />
                    </div>
                    <div className="space-y-2 pt-2">
                      <Button
                        type="button" size="sm"
                        onClick={() => reapplyGate.attempt(group.agencyId)}
                      >
                        Apply Again
                      </Button>
                    </div>
                  </CardBody>
                </Card>
                );
              })
            )}
          </div>
        )}
      </section>
      ) : null}

      {/* Registry-driven dialogs (U-052/U-053): one pure renderer. Seed-dependent
          descriptions and copy tokens compute here (data exists) from
          gate.seed and spread-override dialogProps (TDZ note in
          useGatedAction — never as opts closures). */}
      <ConfirmDestructiveDialog
        {...reactivationGate.dialogProps}
        tokens={{}}
        description={
          reactivationGate.seed === null
            ? undefined
            : `Ask ${requests.find((r) => r.join_request_id === reactivationGate.seed)?.agency_name ?? "the agency"} to reactivate your expired application.`
        }
      />
      <ConfirmDestructiveDialog
        {...reconsiderGate.dialogProps}
        tokens={{}}
        description={
          reconsiderGate.seed === null
            ? undefined
            : `Ask ${rejectedRequestGroups.find((g) => g.agencyId === reconsiderGate.seed?.agencyId)?.agencyName ?? "the agency"} to reconsider your rejected application. Include a message — they'll see it with your request.`
        }
      />
      <ConfirmDestructiveDialog
        {...cancelGate.dialogProps}
        tokens={{}}
        description={(() => {
          const target =
            cancelGate.seed === null
              ? null
              : (requests.find((r) => r.join_request_id === cancelGate.seed) ?? null);
          const recentCount = target
            ? requests.filter((request) => {
                if (request.agency_id !== target.agency_id) return false;
                if (request.status !== "cancelled" || !request.decided_at) return false;
                return new Date(request.decided_at).getTime() >= cooldownCutoff;
              }).length
            : 0;
          if (recentCount >= COOLDOWN_LIMIT - 1) {
            return "If you proceed, you will not be able to reapply to this agency for 30 days.";
          }
          if (recentCount >= COOLDOWN_LIMIT - 2) {
            return "If you proceed, you are close to exhausting the maximum allowed limit for reapplications.";
          }
          return "Are you sure you want to cancel this join request? This cannot be undone.";
        })()}
      />
      <ConfirmDestructiveDialog {...reapplyGate.dialogProps} tokens={{}} />
      <ConfirmDestructiveDialog
        {...acceptReactivationGate.dialogProps}
        tokens={
          acceptReactivationGate.seed === null
            ? {}
            : {
                name:
                  requests.find((r) => r.join_request_id === acceptReactivationGate.seed)
                    ?.agency_name ?? "the agency",
              }
        }
      />
      <ConfirmDestructiveDialog
        {...inviteReactivationGate.dialogProps}
        tokens={{}}
        description={(() => {
          if (inviteReactivationGate.seed === null) return undefined;
          const target = invitations.find((i) => i.invitation_id === inviteReactivationGate.seed);
          const agency = target?.agency_name ?? "the agency";
          return target?.status === "withdrawn"
            ? `Express interest in the withdrawn invitation from ${agency}? They will be notified.`
            : `Ask ${agency} to reactivate your expired invitation.`;
        })()}
      />
      <ConfirmDestructiveDialog
        {...inviteAcceptGate.dialogProps}
        tokens={
          inviteAcceptGate.seed === null
            ? {}
            : {
                agency:
                  invitations.find((i) => i.invitation_id === inviteAcceptGate.seed)
                    ?.agency_name ?? "the agency",
              }
        }
      />
      <ConfirmDestructiveDialog
        {...inviteRejectGate.dialogProps}
        tokens={
          inviteRejectGate.seed === null
            ? {}
            : {
                agency:
                  invitations.find((i) => i.invitation_id === inviteRejectGate.seed)
                    ?.agency_name ?? "the agency",
              }
        }
      />
    </div>
  );
}
