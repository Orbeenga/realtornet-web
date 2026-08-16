"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, LoadingState } from "@/components";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeAppRole } from "@/features/auth/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { AgencyDirectoryClient } from "@/features/agencies/components/AgencyDirectoryClient";
import { MembershipTimeline } from "@/features/agencies/components/MembershipHistoryList";
import {
  useAcceptAgencyInvitation,
  useAcceptJoinRequestReactivation,
  useCancelAgencyJoinRequest,
  useCreateAgencyReviewRequest,
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
  hasExpiredHistory,
  hasWithdrawnHistory,
  invitationHasPendingAction,
  joinRequestHasPendingAction,
  resolveJoinRequestReactivationTrace,
  resolveStatusBadge,
  resolveTerminalReactivationRejectionMessage,
} from "@/lib/membership-lifecycle-messages";
import { getStoredJwtRole, getStoredToken } from "@/lib/jwt";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import type { MyAgencyJoinRequestResponse } from "@/types";

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

interface MyJoinRequestCycleGroup {
  agencyId: number;
  agencyName: string;
  requests: MyAgencyJoinRequestResponse[];
  cancelledRequests: MyAgencyJoinRequestResponse[];
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function getRecentCancelledRequests(requests: MyAgencyJoinRequestResponse[]) {
  const cutoff = Date.now() - COOLDOWN_WINDOW_DAYS * 86_400_000;
  return requests.filter((request) => {
    if (request.status !== "cancelled" || !request.decided_at) return false;
    return new Date(request.decided_at).getTime() >= cutoff;
  });
}

function getApplyAgainDate(requests: MyAgencyJoinRequestResponse[]) {
  const recentCancelled = getRecentCancelledRequests(requests)
    .sort((first, second) => new Date(first.decided_at!).getTime() - new Date(second.decided_at!).getTime());
  if (recentCancelled.length < COOLDOWN_LIMIT) return null;
  return addDays(recentCancelled[COOLDOWN_LIMIT - 1].decided_at!, COOLDOWN_WINDOW_DAYS);
}

function groupMyJoinRequestCycles(requests: MyAgencyJoinRequestResponse[]) {
  const groups = new Map<number, MyJoinRequestCycleGroup>();

  for (const request of requests) {
    const current = groups.get(request.agency_id);
    if (current) {
      current.requests.push(request);
      if (request.status === "cancelled") current.cancelledRequests.push(request);
      continue;
    }

    groups.set(request.agency_id, {
      agencyId: request.agency_id,
      agencyName: request.agency_name,
      requests: [request],
      cancelledRequests: request.status === "cancelled" ? [request] : [],
    });
  }

  return [...groups.values()]
    .filter((group) => group.cancelledRequests.length > 0)
    .map((group) => ({
      ...group,
      requests: [...group.requests].sort(
        (first, second) => new Date(first.submitted_at).getTime() - new Date(second.submitted_at).getTime(),
      ),
      cancelledRequests: [...group.cancelledRequests].sort(
        (first, second) => new Date(first.submitted_at).getTime() - new Date(second.submitted_at).getTime(),
      ),
    }))
    .sort((first, second) => first.agencyName.localeCompare(second.agencyName));
}

export function MyJoinRequestsClient() {
  const [reviewReasons, setReviewReasons] = useState<Record<number, string>>({});
  const [membershipSubTab, setMembershipSubTab] = useState<"active" | "suspended" | "left" | "revoked" | "blocked" | "history">("active");
  const [requestSubTab, setRequestSubTab] = useState<"pending" | "approved" | "rejected" | "expired" | "cancelled">("pending");
  const [invitationSubTab, setInvitationSubTab] = useState<"pending" | "accepted" | "rejected" | "expired" | "revoked" | "withdrawn">("pending");
  const [activeTab, setActiveTab] = useState<MyAgenciesTab>("memberships");
  const token = getStoredToken();
  const role = normalizeAppRole(getStoredJwtRole());
  const { user } = useAuth();
  const defaultUserDisplayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || undefined;
  const canViewAgencyRequests =
    Boolean(token) && (role === "seeker" || role === "agent" || role === "agency_owner");
  const canViewAgencyInvitations = Boolean(token) && (role === "seeker" || role === "agent");
  const canViewAgencyMemberships = Boolean(token);
  const requestsQuery = useMyAgencyJoinRequests(canViewAgencyRequests);
  const membershipsQuery = useMyAgencyMemberships(canViewAgencyMemberships);
  const historyQuery = useMembershipHistory(canViewAgencyMemberships);
  const invitationsQuery = useMyAgencyInvitations(canViewAgencyInvitations);
  const createReviewRequest = useCreateAgencyReviewRequest();
  const acceptInvitation = useAcceptAgencyInvitation();
  const rejectInvitation = useRejectAgencyInvitation();
  const requestReactivation = useRequestInvitationReactivation();
  const cancelJoinRequest = useCancelAgencyJoinRequest();
  const acceptReactivation = useAcceptJoinRequestReactivation();
  const reapplyJoinRequest = useReapplyAgencyJoinRequest();
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const handleReviewRequest = async (agencyId: number, membershipId: number) => {
    const message = reviewReasons[membershipId]?.trim();
    if (!message) {
      notify.error("Please provide a reason before submitting a review request.");
      return;
    }
    try {
      await createReviewRequest.mutateAsync({
        agencyId,
        payload: { message },
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
        error.status === 409 &&
        (text.includes("pending") || text.includes("already"))
      ) {
        notify.info("Review request already submitted - waiting for agency response.");
        return;
      }

      notify.error("Could not submit review request");
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await acceptInvitation.mutateAsync(invitationId);
      notify.success("Invitation accepted");
    } catch {
      notify.error("Could not accept invitation");
    }
  };

  const handleRejectInvitation = async (invitationId: number) => {
    try {
      await rejectInvitation.mutateAsync(invitationId);
      notify.success("Invitation rejected");
    } catch {
      notify.error("Could not reject invitation");
    }
  };

  const handleRequestReactivation = async (invitationId: number) => {
    try {
      await requestReactivation.mutateAsync(invitationId);
      notify.success("Reactivation requested");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not request reactivation");
    }
  };

  const handleCancelJoinRequest = async (requestId: number) => {
    const reason = cancelReason.trim();
    if (!reason) {
      notify.error("Please provide a reason before cancelling the join request.");
      return;
    }
    try {
      await cancelJoinRequest.mutateAsync({ requestId, reason });
      notify.success("Join request cancelled");
      setCancelConfirmId(null);
      setCancelReason("");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not cancel join request");
    }
  };

  const handleAcceptReactivation = async (requestId: number) => {
    try {
      await acceptReactivation.mutateAsync(requestId);
      notify.success("Reactivation accepted — request is pending again.");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not accept reactivation");
    }
  };

  const handleReapply = async (agencyId: number) => {
    if (applyAgainDates.has(agencyId)) {
      notify.error("Limit exceeded. Apply again after the cooldown period.");
      return;
    }
    try {
      await reapplyJoinRequest.mutateAsync({ agencyId });
      notify.success("Application submitted — it will appear in the agency's Review Requests queue.");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not reapply");
    }
  };

  const requestJoinRequestReactivationAsApplicant = useRequestJoinRequestReactivationAsApplicant();
  const rejectReactivation = useRejectJoinRequestReactivation();

  const handleRequestJoinRequestReactivationAsApplicant = async (requestId: number) => {
    try {
      await requestJoinRequestReactivationAsApplicant.mutateAsync(requestId);
      notify.success("Reactivation requested — awaiting agency response.");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not request reactivation");
    }
  };

  const handleRejectReactivation = async (requestId: number) => {
    try {
      await rejectReactivation.mutateAsync({ requestId });
      notify.success("Reactivation request rejected.");
    } catch (error) {
      const detail = error instanceof ApiError ? error.detail : null;
      notify.error(typeof detail === "string" ? detail : "Could not reject reactivation");
    }
  };

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
  const applyAgainDates = new Map<number, Date>();
  for (const group of cancelledRequestGroups) {
    const applyAgainDate = getApplyAgainDate(group.requests);
    if (applyAgainDate) applyAgainDates.set(group.agencyId, applyAgainDate);
  }
  const cancelConfirmRequest = cancelConfirmId === null
    ? null
    : requests.find((request) => request.join_request_id === cancelConfirmId) ?? null;
  const cancelConfirmRecentCount = cancelConfirmRequest
    ? getRecentCancelledRequests(requests.filter((request) => request.agency_id === cancelConfirmRequest.agency_id)).length
    : 0;
  const cancelWarningMessage = cancelConfirmRecentCount >= COOLDOWN_LIMIT - 1
    ? "If you proceed, you will not be able to reapply to this agency for 30 days."
    : cancelConfirmRecentCount >= COOLDOWN_LIMIT - 2
      ? "If you proceed, you are close to exhausting the maximum allowed limit for reapplications."
      : "Are you sure you want to cancel this join request? This cannot be undone.";
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
              { value: "revoked" as const, label: `Revoked (${invitations.filter(i => i.status === "revoked").length})` },
            ].map(({ value, label }) => (
              <Button key={value} type="button" variant={invitationSubTab === value ? "primary" : "ghost"} size="sm" onClick={() => setInvitationSubTab(value as "pending" | "accepted" | "rejected" | "expired" | "revoked" | "withdrawn")}>
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${invitation.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {invitation.agency_name}
                        </Link>
                        <Badge variant="warning">pending</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        You have been invited to join {invitation.agency_name}.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sent {formatDate(invitation.created_at)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={
                            acceptInvitation.isPending &&
                            acceptInvitation.variables === invitation.invitation_id
                          }
                          onClick={() =>
                            void handleAcceptInvitation(invitation.invitation_id)
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
                            void handleRejectInvitation(invitation.invitation_id)
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
                invitations.filter(i => i.status === "rejected").map((invitation) => (
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
                        Invitation from {invitation.agency_name} was rejected.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sent {formatDate(invitation.created_at)}
                      </p>
                      {invitation.rejected_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Rejected {formatDate(invitation.rejected_at)}
                        </p>
                      ) : null}
                      <Link
                        href={`/agencies/${invitation.agency_id}/join`}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        Apply Again
                      </Link>
                    </CardBody>
                  </Card>
                ))
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
                              void handleRequestReactivation(invitation.invitation_id)
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
                invitations.filter(hasWithdrawnHistory).map((invitation) => {
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
                          Invitation from {invitation.agency_name} was withdrawn.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Sent {formatDate(invitation.created_at)}
                        </p>
                        {invitation.withdrawn_at ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Withdrawn {formatDate(invitation.withdrawn_at)}
                          </p>
                        ) : null}
                        {invitation.reactivated_at ? (
                          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
                            Invitation reactivated — pending your response.
                          </p>
                        ) : hasPendingAction ? (
                          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            Interest expressed — awaiting agency response
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
                              void handleRequestReactivation(invitation.invitation_id)
                            }
                          >
                            Express Interest
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitations.filter(i => i.status === "revoked").length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No revoked invitations" description="Revoked invitations will appear here." />
                </div>
              ) : (
                invitations.filter(i => i.status === "revoked").map((invitation) => (
                  <Card key={invitation.invitation_id}>
                    <CardBody className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${invitation.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {invitation.agency_name}
                        </Link>
                        <Badge variant="danger">revoked</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Invitation from {invitation.agency_name} was revoked.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sent {formatDate(invitation.created_at)}
                      </p>
                      <Link
                        href={`/agencies/${invitation.agency_id}/join`}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        Apply Again
                      </Link>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          )}
        </section>
      ) : null}

      {canViewAgencyMemberships && activeTab === "memberships" ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agency memberships
          </h2>

          <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-gray-900">
            {[
              { value: "active" as const, label: `Active (${activeMemberships.length})` },
              { value: "suspended" as const, label: `Suspended (${suspendedMemberships.length})` },
              { value: "left" as const, label: `Left (${leftMemberships.length})` },
              { value: "revoked" as const, label: `Revoked (${revokedMemberships.length})` },
              { value: "blocked" as const, label: `Blocked (${blockedMemberships.length})` },
              { value: "history" as const, label: `History (${historyQuery.data?.length ?? 0})` },
            ].filter(t => {
              if (t.value === "history") return (historyQuery.data?.length ?? 0) > 0 || membershipSubTab === "history";
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${membership.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {membership.agency_name}
                        </Link>
                        <Badge variant="warning">suspended</Badge>
                      </div>
                      {membership.status_decided_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Suspended {formatDate(membership.status_decided_at)}
                        </p>
                      ) : null}
                      {membership.status_reason ? (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                          {membership.status_reason}
                        </div>
                      ) : null}
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${membership.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {membership.agency_name}
                        </Link>
                        <Badge variant="warning">left</Badge>
                      </div>
                      {membership.status_decided_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Left {formatDate(membership.status_decided_at)}
                        </p>
                      ) : null}
                      {membership.status_reason ? (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                          {membership.status_reason}
                        </div>
                      ) : null}
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
                  const agencyHistory = (historyQuery.data ?? []).filter(
                    (h) => h.agency_id === membership.agency_id || h.agency_name === membership.agency_name,
                  );
                  const reinstatementEvent = [...agencyHistory]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .find((h) => h.action === "reinstated" || h.action === "joined");
                  return (
                    <Card key={membership.membership_id}>
                      <CardBody className="space-y-4">
                        {agencyHistory.length > 0 ? (
                          <MembershipTimeline
                            tier="rich"
                            history={agencyHistory}
                            defaultUserDisplayName={membership.agency_name}
                            alwaysExpanded
                            status={displayMembershipStatus(membership.status)}
                          />
                        ) : null}
                        {!reinstatementEvent && !membership.pending_review_request_id ? (
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${membership.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {membership.agency_name}
                        </Link>
                        <Badge variant="danger">blocked</Badge>
                      </div>
                      {membership.status_decided_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Blocked {formatDate(membership.status_decided_at)}
                        </p>
                      ) : null}
                      {membership.status_reason ? (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                          {membership.status_reason}
                        </div>
                      ) : null}
                      <p className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        This agency has restricted your access. Contact platform support if you believe this is in error.
                      </p>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          ) : membershipSubTab === "history" ? (
            <div className="space-y-4">
              {historyQuery.isLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
              ) : historyQuery.isError ? (
                <p className="text-sm text-red-500">Could not load membership history.</p>
              ) : !historyQuery.data || historyQuery.data.length === 0 ? (
                <EmptyState
                  title="No membership history"
                  description="Agency membership events will appear here when they exist."
                />
              ) : (
                (() => {
                  const grouped = historyQuery.data.reduce((acc, entry) => {
                    const agencyName = entry.agency_name ?? "Unknown Agency";
                    if (!acc[agencyName]) {
                      acc[agencyName] = [];
                    }
                    acc[agencyName].push(entry);
                    return acc;
                  }, {} as Record<string, typeof historyQuery.data>);
                  const sortedAgencies = Object.keys(grouped).sort();
                  return (
                    <div className="space-y-6">
                      {sortedAgencies.map((agencyName) => (
                        <div key={agencyName} className="space-y-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {agencyName}
                          </h3>
                          <MembershipTimeline
                            tier="rich"
                            history={grouped[agencyName]}
                            defaultUserDisplayName={defaultUserDisplayName}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()
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
            { value: "rejected" as const, label: `Rejected (${requests.filter(r => r.status === "rejected").length})` },
            { value: "expired" as const, label: `Expired (${requests.filter(hasExpiredHistory).length})` },
            { value: "cancelled" as const, label: `Cancelled (${requests.filter(r => r.status === "cancelled").length})` },
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
              requests.filter(r => r.status === "pending").map((request) => (
                <Card key={request.join_request_id}>
                  <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link
                        href={`/agencies/${request.agency_id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {request.agency_name}
                      </Link>
                      <Badge variant="warning">pending</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Submitted {formatDate(request.submitted_at)}
                    </p>
                    {request.cover_note ? (
                      <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Cover note</p>
                        <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{request.cover_note}</p>
                      </div>
                    ) : null}
                    {request.portfolio_details ? (
                      <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Portfolio details</p>
                        <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{request.portfolio_details}</p>
                      </div>
                    ) : null}
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={cancelJoinRequest.isPending && cancelJoinRequest.variables?.requestId === request.join_request_id}
                        onClick={() => setCancelConfirmId(request.join_request_id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))
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
                const membership = memberships.find(
                  m => m.source_join_request_id === request.join_request_id,
                );
                const liveStatus = membership?.status ?? request.status;
                const badge = resolveStatusBadge(liveStatus);
                const reactivationEvents = resolveJoinRequestReactivationTrace(
                  request,
                  user?.user_id ?? null,
                  true,
                );
                return (
                    <Card key={request.join_request_id}>
                      <CardBody className="space-y-4">
                        {(() => {
                          const requestHistory = (historyQuery.data ?? []).filter(
                            (h) => h.agency_id === request.agency_id || h.agency_name === request.agency_name,
                          );
                          if (requestHistory.length === 0) return null;
                          return (
                            <MembershipTimeline
                              tier="simple"
                              history={requestHistory}
                              emptyTitle="No events"
                              emptyDescription=""
                              defaultUserDisplayName={request.agency_name}
                              status={badge.label}
                            />
                          );
                        })()}
                        {reactivationEvents.length > 0 ? (
                        <div className="space-y-1.5 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                          {reactivationEvents.map((event) => (
                            <p key={`${event.at ?? ""}-${event.text}`} className="text-sm text-gray-700 dark:text-gray-300">
                              {event.text} — {formatDate(event.at!)}
                            </p>
                          ))}
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
              requests.filter(r => r.status === "rejected").map((request) => (
                <Card key={request.join_request_id}>
                  <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link
                        href={`/agencies/${request.agency_id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {request.agency_name}
                      </Link>
                      <Badge variant="danger">rejected</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Submitted {formatDate(request.submitted_at)}
                    </p>
                    {request.decided_at ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Rejected {formatDate(request.decided_at)}
                      </p>
                    ) : null}
                    {request.rejection_reason ? (
                      <div className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {request.rejection_reason}
                      </div>
                    ) : null}
                    {request.reactivation_requested_at ? (
                      <p className="pt-1 text-sm text-gray-500 dark:text-gray-400">
                        {resolveTerminalReactivationRejectionMessage()}
                      </p>
                    ) : request.decided_at && request.rejection_reason ? (
                      <div className="pt-2">
                        <Link
                          href={`/agencies/${request.agency_id}/join`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                          Apply Again
                        </Link>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        ) : requestSubTab === "expired" ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {requests.filter(hasExpiredHistory).length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="No expired requests" description="Requests that ever passed through the expired state will appear here." />
              </div>
            ) : (
              requests.filter(hasExpiredHistory).map((request) => {
                const hasPendingAction = joinRequestHasPendingAction(request, user?.user_id ?? null);
                const badge = resolveStatusBadge(request.status);
                const reactivationEvents = resolveJoinRequestReactivationTrace(
                  request,
                  user?.user_id ?? null,
                  true,
                );
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
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Submitted {formatDate(request.submitted_at)}
                      </p>
                      {request.expires_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Expired {formatDate(request.originally_expired_at ?? request.expires_at)}
                        </p>
                      ) : null}
                      {request.cover_note ? (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Cover note</p>
                          <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{request.cover_note}</p>
                        </div>
                      ) : null}
                      {reactivationEvents.length > 0 ? (
                        <div className="space-y-1.5 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                          {reactivationEvents.map((event) => (
                            <p key={`${event.at ?? ""}-${event.text}`} className="text-sm text-gray-700 dark:text-gray-300">
                              {event.text} — {formatDate(event.at!)}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      {request.reactivation_accepted_at ? (
                        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
                          Reactivation request is pending. Find it in the Pending tab.
                        </p>
                      ) : hasPendingAction ? (
                        <div className="space-y-3">
                          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            {request.agency_name ?? "The agency"} has requested to reactivate your expired application.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button" size="sm"
                              loading={acceptReactivation.isPending && acceptReactivation.variables === request.join_request_id}
                              onClick={() => void handleAcceptReactivation(request.join_request_id)}
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
                      ) : request.reactivation_requested_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Request is pending a response from {request.agency_name ?? "the agency"}.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            This application has expired. You can request reactivation, or wait for {request.agency_name ?? "the agency"} to reach out.
                          </p>
                          <Button
                            type="button" size="sm"
                            loading={requestJoinRequestReactivationAsApplicant.isPending && requestJoinRequestReactivationAsApplicant.variables === request.join_request_id}
                            onClick={() => void handleRequestJoinRequestReactivationAsApplicant(request.join_request_id)}
                          >
                            Request Reactivation
                          </Button>
                        </div>
                      )}
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
                const applyAgainDate = getApplyAgainDate(group.requests);
                return (
                <Card key={group.agencyId}>
                  <CardBody className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link
                        href={`/agencies/${group.agencyId}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {group.agencyName}
                      </Link>
                      <Badge variant="danger">cancelled</Badge>
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        const sortedRequests = [...group.requests].sort(
                          (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
                        );
                        const events: Array<{ key: string; type: string; date: string; message?: string | null; eventNum: number }> = [];
                        for (let idx = 0; idx < sortedRequests.length; idx++) {
                          const req = sortedRequests[idx];
                          const eventNum = idx + 1;
                              events.push({
                                key: `submitted-${req.join_request_id}`,
                                type: "Application submitted",
                                date: req.submitted_at,
                                message: req.cover_note ? `Message: ${req.cover_note}` : null,
                                eventNum,
                              });
                              const reactivationTrace = resolveJoinRequestReactivationTrace(req, user?.user_id ?? null, true);
                              reactivationTrace.forEach((event) => {
                                events.push({
                                  key: `${event.text}-${req.join_request_id}`,
                                  type: event.text,
                                  date: event.at ?? req.submitted_at,
                                  eventNum,
                                });
                              });
                              if (req.status === "cancelled") {
                                events.push({
                                  key: `cancelled-${req.join_request_id}`,
                                  type: "Application cancelled",
                                  date: req.decided_at ?? req.submitted_at,
                                  message: req.cancel_reason ? `Reason: ${req.cancel_reason}` : null,
                                  eventNum,
                                });
                              }
                        }
                        return events.map((event) => (
                          <div key={event.key} className="rounded-lg bg-gray-50 p-3 text-sm leading-6 dark:bg-gray-950/40">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {event.type} — {formatDate(event.date)}
                            </p>
                            {event.message ? (
                              <p className="mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{event.message}</p>
                            ) : null}
                            <p className="mt-0.5 text-xs text-gray-400">Cycle: {event.eventNum || "—"}</p>
                          </div>
                        ));
                      })()}
                    </div>
                    <div className="space-y-2 pt-2">
                      <Button
                        type="button" size="sm"
                        loading={reapplyJoinRequest.isPending && reapplyJoinRequest.variables?.agencyId === group.agencyId}
                        onClick={() => void handleReapply(group.agencyId)}
                      >
                        Apply Again
                      </Button>
                      {applyAgainDate ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          You have exceeded the maximum number of reapplications. Apply again on {formatDate(applyAgainDate.toISOString())}.
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          This will appear to the agency alongside your prior cancelled request, in their Review Requests queue.
                        </p>
                      )}
                      <div className="rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
                        This cooldown is enforced server-side; the API blocks reapply with the authoritative date.
                      </div>
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

      <Dialog open={cancelConfirmId !== null} onOpenChange={(open) => { if (!open) { setCancelConfirmId(null); setCancelReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel join request</DialogTitle>
            <DialogDescription>
              {cancelWarningMessage}
            </DialogDescription>
          </DialogHeader>
          <textarea
            rows={3}
            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Reason for cancelling (required)"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => { setCancelConfirmId(null); setCancelReason(""); }}>
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={cancelJoinRequest.isPending}
              onClick={() => cancelConfirmId !== null && void handleCancelJoinRequest(cancelConfirmId)}
            >
              Cancel request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
