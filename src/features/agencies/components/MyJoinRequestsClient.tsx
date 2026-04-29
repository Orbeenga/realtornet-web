"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, LoadingState } from "@/components";
import { normalizeAppRole } from "@/features/auth/navigation";
import {
  useAcceptAgencyInvitation,
  useCreateAgencyMembershipReviewRequest,
  useMyAgencyInvitations,
  useMyAgencyJoinRequests,
  useMyAgencyMemberships,
  useRejectAgencyInvitation,
} from "@/features/agencies/hooks";
import { getStoredJwtRole, getStoredToken } from "@/lib/jwt";
import { notify } from "@/lib/toast";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getStatusVariant(status: string) {
  if (status === "approved" || status === "active") {
    return "success" as const;
  }

  if (status === "rejected" || status === "blocked" || status === "inactive") {
    return "danger" as const;
  }

  return "warning" as const;
}

function displayMembershipStatus(status: string) {
  return status === "inactive" ? "revoked" : status;
}

export function MyJoinRequestsClient() {
  const [reviewReasons, setReviewReasons] = useState<Record<number, string>>({});
  const token = getStoredToken();
  const role = normalizeAppRole(getStoredJwtRole());
  const canViewAgencyRequests =
    Boolean(token) && (role === "seeker" || role === "agent" || role === "agency_owner");
  const requestsQuery = useMyAgencyJoinRequests(canViewAgencyRequests);
  const membershipsQuery = useMyAgencyMemberships(Boolean(token) && role === "agent");
  const invitationsQuery = useMyAgencyInvitations(Boolean(token) && role === "agent");
  const createReviewRequest = useCreateAgencyMembershipReviewRequest();
  const acceptInvitation = useAcceptAgencyInvitation();
  const rejectInvitation = useRejectAgencyInvitation();

  const handleReviewRequest = async (agencyId: number, membershipId: number) => {
    try {
      await createReviewRequest.mutateAsync({
        agencyId,
        membershipId,
        payload: { reason: reviewReasons[membershipId]?.trim() || null },
      });
      notify.success("Review request submitted");
      setReviewReasons((current) => {
        const next = { ...current };
        delete next[membershipId];
        return next;
      });
    } catch {
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
  const invitations = invitationsQuery.data ?? [];

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

      {invitations.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agency invitations
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {invitations.map((invitation) => (
              <Card key={invitation.invitation_id}>
                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link
                      href={`/agencies/${invitation.agency_id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                    >
                      {invitation.agency_name}
                    </Link>
                    <Badge variant={getStatusVariant(invitation.status)}>
                      {invitation.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    You have been invited to join {invitation.agency_name}.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sent {formatDate(invitation.created_at)}
                  </p>
                  {invitation.status === "pending" ? (
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
                  ) : null}
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {memberships.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Agency memberships
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {memberships.map((membership) => {
              const isRestricted =
                membership.status === "blocked" ||
                membership.status === "suspended" ||
                membership.status === "inactive";

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
                      <Badge variant={getStatusVariant(membership.status)}>
                        {displayMembershipStatus(membership.status)}
                      </Badge>
                    </div>
                    {membership.status_reason ? (
                      <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                        {membership.status_reason}
                      </div>
                    ) : null}
                    {membership.pending_review_request_id ? (
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Review request pending
                      </p>
                    ) : isRestricted ? (
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
                            createReviewRequest.variables?.membershipId === membership.membership_id
                          }
                          onClick={() =>
                            void handleReviewRequest(
                              membership.agency_id,
                              membership.membership_id,
                            )
                          }
                        >
                          Request review
                        </Button>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {requests.length === 0 ? (
        <EmptyState
          title="No join requests yet"
          description="Open an agency profile and request to join its roster."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <Card key={request.join_request_id}>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link
                    href={`/agencies/${request.agency_id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                  >
                    {request.agency_name}
                  </Link>
                  <Badge variant={getStatusVariant(request.status)}>
                    {request.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Submitted {formatDate(request.submitted_at)}
                </p>
                {request.status === "rejected" && request.rejection_reason ? (
                  <div className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {request.rejection_reason}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
