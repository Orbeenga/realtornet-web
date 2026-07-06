"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, LoadingState } from "@/components";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeAppRole } from "@/features/auth/navigation";
import { AgencyDirectoryClient } from "@/features/agencies/components/AgencyDirectoryClient";
import {
  useAcceptAgencyInvitation,
  useCancelAgencyJoinRequest,
  useCreateAgencyReviewRequest,
  useMembershipHistory,
  useMyAgencyInvitations,
  useMyAgencyJoinRequests,
  useMyAgencyMemberships,
  useRejectAgencyInvitation,
} from "@/features/agencies/hooks";
import { getStoredJwtRole, getStoredToken } from "@/lib/jwt";
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

function getHistoryBadgeVariant(action: string) {
  if (action === "joined" || action === "reinstated") return "success" as const;
  if (action === "revoked" || action === "suspended" || action === "blocked") return "danger" as const;
  if (action === "left") return "warning" as const;
  return "outline" as const;
}

function formatMembershipAction(action: string) {
  return action.replace(/_/g, " ");
}

type MyAgenciesTab = "agencies" | "invitations" | "memberships" | "requests";

export function MyJoinRequestsClient() {
  const [reviewReasons, setReviewReasons] = useState<Record<number, string>>({});
  const [membershipSubTab, setMembershipSubTab] = useState<string>("active");
  const [requestSubTab, setRequestSubTab] = useState<string>("pending");
  const [invitationSubTab, setInvitationSubTab] = useState<string>("pending");
  const [activeTab, setActiveTab] = useState<MyAgenciesTab>("memberships");
  const [expandedRevokedIds, setExpandedRevokedIds] = useState<Set<number>>(new Set());
  const token = getStoredToken();
  const role = normalizeAppRole(getStoredJwtRole());
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
  const cancelJoinRequest = useCancelAgencyJoinRequest();
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);

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

  const handleCancelJoinRequest = async (requestId: number) => {
    try {
      await cancelJoinRequest.mutateAsync(requestId);
      notify.success("Join request cancelled");
      setCancelConfirmId(null);
    } catch {
      notify.error("Could not cancel join request");
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
  const memberships = membershipsQuery.data ?? [];
  const activeMemberships = memberships.filter(m => m.status === "active");
  const suspendedMemberships = memberships.filter(m => m.status === "suspended");
  const leftMemberships = memberships.filter(m => m.status === "left");
  const revokedMemberships = memberships.filter(m => m.status === "revoked");
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
              { value: "pending", label: `Pending (${invitations.filter(i => i.status === "pending").length})` },
              { value: "accepted", label: `Accepted (${invitations.filter(i => i.status === "accepted").length})` },
              { value: "rejected", label: `Rejected (${invitations.filter(i => i.status === "rejected" || i.status === "expired" || i.status === "revoked").length})` },
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
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitations.filter(i => i.status === "rejected" || i.status === "expired" || i.status === "revoked").length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No rejected invitations" description="Rejected, expired, or revoked invitations will appear here." />
                </div>
              ) : (
                invitations.filter(i => i.status === "rejected" || i.status === "expired" || i.status === "revoked").map((invitation) => (
                  <Card key={invitation.invitation_id}>
                    <CardBody className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Link
                          href={`/agencies/${invitation.agency_id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                        >
                          {invitation.agency_name}
                        </Link>
                        <Badge variant="danger">{invitation.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Invitation from {invitation.agency_name} was {invitation.status}.
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
              { value: "active", label: `Active (${activeMemberships.length})` },
              { value: "rejected", label: `Rejected (${requests.filter(r => r.status === "rejected").length})` },
              { value: "suspended", label: `Suspended (${suspendedMemberships.length})` },
              { value: "left", label: `Left (${leftMemberships.length})` },
              { value: "revoked", label: `Revoked (${revokedMemberships.length})` },
              { value: "blocked", label: `Blocked (${blockedMemberships.length})` },
              { value: "history", label: `History (${historyQuery.data?.length ?? 0})` },
            ].filter(t => {
              if (t.value === "rejected") return requests.some(r => r.status === "rejected") || membershipSubTab === "rejected";
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
          ) : membershipSubTab === "rejected" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {requests.filter(r => r.status === "rejected").length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState title="No rejected applications" description="You have no rejected join requests." />
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
                      <div className="space-y-2">
                        <Link
                          href={`/agencies/${request.agency_id}/join`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                          Apply Again
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Submitting a new application will appear as a returning applicant.
                        </p>
                      </div>
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
                  const isHistoryExpanded = expandedRevokedIds.has(membership.membership_id);
                  const reapplications = requests
                    .filter(
                      (r) =>
                        r.agency_id === membership.agency_id &&
                        r.join_request_id !== membership.source_join_request_id,
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
                    );
                  const agencyHistory = (historyQuery.data ?? []).filter(
                    (h) => h.agency_id === membership.agency_id,
                  );
                  const recentReapplication = reapplications[0];
                  const reinstatementEvent = [...agencyHistory]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .find((h) => h.action === "reinstated" || h.action === "joined");
                  return (
                    <Card key={membership.membership_id}>
                      <CardBody className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <Link
                            href={`/agencies/${membership.agency_id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {membership.agency_name}
                          </Link>
                          <Badge variant="danger">{displayMembershipStatus(membership.status)}</Badge>
                        </div>
                        {membership.status_decided_at ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Revoked {formatDate(membership.status_decided_at)}
                          </p>
                        ) : null}
                        {membership.status_reason ? (
                          <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                            {membership.status_reason}
                          </div>
                        ) : null}
                        {reinstatementEvent ? (
                          <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/40">
                            <p className="font-medium text-green-900 dark:text-green-200">
                              Reinstated {formatDate(reinstatementEvent.timestamp)}
                            </p>
                            {reinstatementEvent.reason ? (
                              <p className="mt-0.5 text-green-700 dark:text-green-300">
                                {reinstatementEvent.reason}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {recentReapplication ? (
                          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                            <p className="font-medium text-blue-900 dark:text-blue-200">
                              Reapplied {formatDate(recentReapplication.submitted_at)}
                            </p>
                            <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                              Status: <span className="capitalize">{recentReapplication.status}</span>
                            </p>
                            {recentReapplication.status === "rejected" && recentReapplication.rejection_reason ? (
                              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                                Reason: {recentReapplication.rejection_reason}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {!reinstatementEvent && membership.pending_review_request_id ? (
                          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            <p className="font-medium">Review requested</p>
                            {membership.pending_review_reason ? (
                              <p className="mt-1 text-xs">{membership.pending_review_reason}</p>
                            ) : null}
                            {membership.pending_review_submitted_at ? (
                              <p className="mt-1 text-xs">
                                Submitted {formatDate(membership.pending_review_submitted_at)}
                              </p>
                            ) : null}
                          </div>
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
                        {agencyHistory.length > 0 ? (
                          <div className="space-y-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandedRevokedIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(membership.membership_id)) {
                                    next.delete(membership.membership_id);
                                  } else {
                                    next.add(membership.membership_id);
                                  }
                                  return next;
                                })
                              }
                            >
                              {isHistoryExpanded ? "Hide history" : "View full history"}
                            </Button>
                            {isHistoryExpanded ? (
                              <div className="space-y-2">
                                {[...agencyHistory]
                                  .sort(
                                    (a, b) =>
                                      new Date(b.timestamp).getTime() -
                                      new Date(a.timestamp).getTime(),
                                  )
                                  .map((record) => (
                                    <div
                                      key={record.id}
                                      className="rounded-lg border border-border p-3 text-xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="font-medium capitalize text-gray-900 dark:text-white">
                                          {formatMembershipAction(record.action ?? "event")}
                                        </span>
                                        <Badge variant={getHistoryBadgeVariant(record.action ?? "event")}>
                                          {formatMembershipAction(record.action ?? "event")}
                                        </Badge>
                                      </div>
                                      <p className="mt-1 text-gray-500 dark:text-gray-400">
                                        {formatDate(record.timestamp)}
                                      </p>
                                      {record.reason ? (
                                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                                          {record.reason}
                                        </p>
                                      ) : null}
                                    </div>
                                  ))}
                              </div>
                            ) : null}
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[...historyQuery.data]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((record) => (
                      <Card key={record.id}>
                        <CardBody className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {record.agency_name ?? "Agency"}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(record.timestamp)}
                              </p>
                            </div>
                            <Badge variant={
                              record.action === "joined" || record.action === "reinstated"
                                ? "success"
                                : record.action === "revoked" || record.action === "suspended"
                                  ? "danger"
                                  : record.action === "left"
                                    ? "warning"
                                    : "outline"
                            }>
                              {(record.action ?? "event").replace(/_/g, " ")}
                            </Badge>
                          </div>
                          {record.reason ? (
                            <p className="text-sm leading-5 text-gray-600 dark:text-gray-300">{record.reason}</p>
                          ) : null}
                          {record.prior_role || record.post_role ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Role: {record.prior_role ?? "not recorded"} &rarr; {record.post_role ?? "not recorded"}
                            </p>
                          ) : null}
                        </CardBody>
                      </Card>
                    ))}
                </div>
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
            { value: "pending", label: `Pending (${requests.filter(r => r.status === "pending").length})` },
            { value: "accepted", label: `Accepted (${requests.filter(r => r.status === "approved").length})` },
            { value: "rejected", label: `Rejected (${requests.filter(r => r.status === "rejected").length})` },
          ].map(({ value, label }) => (
            <Button key={value} type="button" variant={requestSubTab === value ? "primary" : "ghost"} size="sm" onClick={() => setRequestSubTab(value)}>
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
                        loading={cancelJoinRequest.isPending && cancelJoinRequest.variables === request.join_request_id}
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
        ) : requestSubTab === "accepted" ? (
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
                        <Badge variant="success">approved</Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Submitted {formatDate(request.submitted_at)}
                      </p>
                      {request.decided_at ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Approved {formatDate(request.decided_at)}
                        </p>
                      ) : null}
                      {membership ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Membership status: {membership.status}
                        </p>
                      ) : null}
                    </CardBody>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
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
                    {request.rejection_reason ? (
                      <div className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {request.rejection_reason}
                      </div>
                    ) : null}
                    <div className="pt-2">
                      <Link
                        href={`/agencies/${request.agency_id}/join`}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        Apply Again
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        )}
      </section>
      ) : null}

      <Dialog open={cancelConfirmId !== null} onOpenChange={(open) => { if (!open) setCancelConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel join request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this join request? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCancelConfirmId(null)}>
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
