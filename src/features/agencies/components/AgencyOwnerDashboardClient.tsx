"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import {
  useAgencies,
  useAgencyAgents,
  useAgencyInvitations,
  useAgencyProfile,
  useAgencyJoinRequests,
  useAgencyReviewRequests,
  useAgencyStats,
  useUpdateAgencyProfile,
  getAgencyAgentCount,
  getAgencyListingCount,
  useAcceptAgencyReviewRequest,
  useApproveAgencyJoinRequest,
  useBlockAgencyMembership,
  useDeclineAgencyReviewRequest,
  useInviteAgencyAgent,
  useRejectAgencyJoinRequest,
  useRevokeAgencyMembership,
  useRestoreAgencyMembership,
  useSuspendAgencyMembership,
} from "@/features/agencies/hooks";
import { isVerifiedAgency } from "@/features/agencies/lib/verification";
import { MembershipHistoryList } from "./MembershipHistoryList";

const inviteSchema = z.object({
  email: z.email("Use a valid email address"),
});

const agencyProfileSchema = z.object({
  name: z.string().trim().min(2, "Agency name is required"),
  description: z.string().trim().optional(),
  address: z.string().trim().optional(),
  website_url: z.union([z.url("Use a valid website URL"), z.literal("")]).optional(),
  logo_url: z.union([z.url("Use a valid logo URL"), z.literal("")]).optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;
type AgencyProfileFormValues = z.infer<typeof agencyProfileSchema>;
type AgencyOwnerTab = "joinRequests" | "reviewRequests" | "agents" | "invitations";

const AGENCY_OWNER_TABS: Array<{ value: AgencyOwnerTab; label: string }> = [
  { value: "joinRequests", label: "Join requests" },
  { value: "reviewRequests", label: "Review requests" },
  { value: "agents", label: "Agent roster" },
  { value: "invitations", label: "Invitations" },
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

function getJoinRequestBadgeVariant(status: string) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "rejected") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getMembershipBadgeVariant(status: string) {
  if (status === "active") {
    return "success" as const;
  }

  if (status === "suspended") {
    return "warning" as const;
  }

  if (status === "blocked" || status === "inactive") {
    return "danger" as const;
  }

  return "outline" as const;
}

function getRequiredDecisionReasonMessage(
  action: "suspend" | "revoke" | "block" | "restore",
) {
  const actionLabels = {
    suspend: "suspending",
    revoke: "revoking",
    block: "blocking",
    restore: "restoring",
  } as const;

  return `Enter a reason before ${actionLabels[action]} this agent.`;
}

export function AgencyOwnerDashboardClient() {
  const gate = useAgentRoleGate();
  const { user } = useAuth();
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [membershipReasons, setMembershipReasons] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<AgencyOwnerTab>("joinRequests");
  const [isEditingAgencyProfile, setIsEditingAgencyProfile] = useState(false);
  const userAgencyId = user?.agency_id;
  const userEmail = user?.email;
  const shouldLoadAgencyDirectory = gate.isAllowed && typeof userAgencyId !== "number";
  const agencyProfileQuery = useAgencyProfile(userAgencyId ?? "");
  const agenciesQuery = useAgencies(shouldLoadAgencyDirectory);

  const agency = useMemo(() => {
    if (typeof userAgencyId === "number") {
      return agencyProfileQuery.data;
    }

    const email = userEmail?.toLowerCase();

    if (!email) {
      return undefined;
    }

    return (agenciesQuery.data ?? []).find(
      (candidate) => candidate.owner_email?.toLowerCase() === email,
    );
  }, [agenciesQuery.data, agencyProfileQuery.data, userAgencyId, userEmail]);

  const agencyId = agency?.agency_id;
  const agentsQuery = useAgencyAgents(
    agencyId ?? "",
    "all",
    activeTab === "agents",
  );
  const joinRequestsQuery = useAgencyJoinRequests(agencyId, Boolean(agencyId));
  const reviewRequestsQuery = useAgencyReviewRequests(agencyId, Boolean(agencyId));
  const invitationsQuery = useAgencyInvitations(agencyId, Boolean(agencyId));
  const agencyStatsQuery = useAgencyStats(agencyId, Boolean(agencyId));
  const approveJoinRequest = useApproveAgencyJoinRequest(agencyId);
  const rejectJoinRequest = useRejectAgencyJoinRequest(agencyId);
  const suspendMembership = useSuspendAgencyMembership(agencyId);
  const revokeMembership = useRevokeAgencyMembership(agencyId);
  const blockMembership = useBlockAgencyMembership(agencyId);
  const restoreMembership = useRestoreAgencyMembership(agencyId);
  const acceptReview = useAcceptAgencyReviewRequest(agencyId);
  const declineReview = useDeclineAgencyReviewRequest(agencyId);
  const inviteAgent = useInviteAgencyAgent(agencyId);
  const updateAgencyProfile = useUpdateAgencyProfile(agencyId);
  const agencyProfileForm = useForm<AgencyProfileFormValues>({
    resolver: zodResolver(agencyProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      website_url: "",
      logo_url: "",
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleStartAgencyProfileEdit = () => {
    if (!agency) {
      return;
    }

    agencyProfileForm.reset({
      name: agency.name,
      description: agency.description ?? "",
      address: agency.address ?? "",
      website_url: agency.website_url ?? "",
      logo_url: agency.logo_url ?? "",
    });
    setIsEditingAgencyProfile(true);
  };

  const handleCancelAgencyProfileEdit = () => {
    setIsEditingAgencyProfile(false);
    agencyProfileForm.clearErrors();
  };

  const handleUpdateAgencyProfile = async (values: AgencyProfileFormValues) => {
    try {
      await updateAgencyProfile.mutateAsync({
        name: values.name,
        description: values.description?.trim() || null,
        address: values.address?.trim() || null,
        website_url: values.website_url?.trim() || null,
        logo_url: values.logo_url?.trim() || null,
      });
      notify.success("Agency profile updated");
      setIsEditingAgencyProfile(false);
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not update agency profile.";
      agencyProfileForm.setError("root", {
        type: "server",
        message,
      });
    }
  };

  const handleApproveJoinRequest = async (requestId: number) => {
    try {
      await approveJoinRequest.mutateAsync(requestId);
      notify.success("Join request approved. The applicant can see the decision in My Agencies.");
    } catch {
      notify.error("Could not approve join request");
    }
  };

  const handleRejectJoinRequest = async (requestId: number) => {
    const reason = rejectReasons[requestId]?.trim();

    if (!reason) {
      notify.error("Enter a reason before rejecting this join request.");
      return;
    }

    try {
      await rejectJoinRequest.mutateAsync({
        requestId,
        payload: { reason },
      });
      notify.success("Join request rejected. The applicant can see the reason in My Agencies.");
      setRejectReasons((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    } catch {
      notify.error("Could not reject join request");
    }
  };

  const handleInvite = async (values: InviteFormValues) => {
    try {
      await inviteAgent.mutateAsync({ email: values.email.trim() });
      notify.success("Invite saved and email delivery queued.");
      reset();
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not create invite. Please try again.";
      setError("root", {
        type: "server",
        message,
      });
    }
  };

  const handleMembershipAction = async (
    action: "suspend" | "revoke" | "block",
    membershipId: number,
  ) => {
    const reason = membershipReasons[membershipId]?.trim() || null;

    if (!reason) {
      notify.error(getRequiredDecisionReasonMessage(action));
      return;
    }

    try {
      const payload = { membershipId, payload: { reason } };

      if (action === "suspend") {
        await suspendMembership.mutateAsync(payload);
        notify.success("Agent membership suspended. The agent can see the reason in My Agencies.");
      } else if (action === "revoke") {
        await revokeMembership.mutateAsync(payload);
        notify.success("Agent membership revoked. The agent can see the reason in My Agencies.");
      } else {
        await blockMembership.mutateAsync(payload);
        notify.success("Agent membership blocked. The agent can see the reason in My Agencies.");
      }

      setMembershipReasons((current) => {
        const next = { ...current };
        delete next[membershipId];
        return next;
      });
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not update agent membership.";
      notify.error(message);
    }
  };

  const handleRestoreMembership = async (membershipId: number) => {
    const reason = membershipReasons[membershipId]?.trim();

    if (!reason) {
      notify.error(getRequiredDecisionReasonMessage("restore"));
      return;
    }

    try {
      await restoreMembership.mutateAsync({
        membershipId,
        payload: { reason },
      });
      notify.success("Agent membership restored. The agent can see the updated status in My Agencies.");
      setMembershipReasons((current) => {
        const next = { ...current };
        delete next[membershipId];
        return next;
      });
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not restore agent membership.";
      notify.error(message);
    }
  };

  const handleReviewDecision = async (action: "accept" | "decline", requestId: number) => {
    const reason = membershipReasons[requestId]?.trim() || null;

    try {
      if (action === "accept") {
        await acceptReview.mutateAsync({
          requestId,
          payload: { reason },
        });
        notify.success("Review request accepted. The agent role has been reinstated if needed.");
      } else {
        await declineReview.mutateAsync({
          requestId,
          payload: { reason },
        });
        notify.success("Review request declined. The requester has been notified.");
      }

      setMembershipReasons((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
    } catch (error) {
      const message =
        error instanceof ApiError && typeof error.detail === "string"
          ? error.detail
          : "Could not update review request.";
      notify.error(message);
    }
  };

  const isAgencyLoading =
    typeof userAgencyId === "number"
      ? agencyProfileQuery.isLoading
      : agenciesQuery.isLoading;
  const isAgencyError =
    typeof userAgencyId === "number"
      ? agencyProfileQuery.isError
      : agenciesQuery.isError;

  if (gate.isChecking || !gate.isAllowed || isAgencyLoading) {
    return <LoadingState />;
  }

  if (isAgencyError) {
    return (
      <ErrorState
        title="Could not load agency dashboard"
        message="There was a problem loading your agency profile."
        onRetry={() => {
          if (typeof userAgencyId === "number") {
            void agencyProfileQuery.refetch();
            return;
          }

          void agenciesQuery.refetch();
        }}
      />
    );
  }

  if (!agency) {
    return (
      <EmptyState
        title="No agency profile found"
        description="Your agency owner account is active, but no approved agency profile was matched to your email."
      />
    );
  }

  const joinRequests = joinRequestsQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const reviewRequests = reviewRequestsQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const agencyStats = agencyStatsQuery.data;
  const statsListingCount = getAgencyListingCount(agencyStats);
  const statsAgentCount = getAgencyAgentCount(agencyStats);
  const tabCounts: Record<AgencyOwnerTab, number | undefined> = {
    joinRequests: joinRequests.length,
    reviewRequests: reviewRequests.length,
    agents: agentsQuery.isSuccess ? agents.length : undefined,
    invitations: invitations.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Agency dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {agency.name}
        </h1>
      </div>

      <Card>
        <CardBody className="space-y-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Agency profile
                </h2>
                <Badge>{agency.status}</Badge>
                {isVerifiedAgency(agency) ? <Badge>Verified</Badge> : null}
              </div>
              {agency.description ? (
                <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {agency.description}
                </p>
              ) : null}
              {agency.status_reason ? (
                <p className="max-w-3xl rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Latest agency decision: {agency.status_reason}
                </p>
              ) : null}
            </div>
            <Link
              href={`/agencies/${agency.agency_id}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              View profile
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={handleStartAgencyProfileEdit}
            >
              Edit profile
            </Button>
          </div>

          {isEditingAgencyProfile ? (
            <form
              className="space-y-4 rounded-lg border border-border p-4"
              onSubmit={(event) =>
                void agencyProfileForm.handleSubmit(handleUpdateAgencyProfile)(event)
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Agency name"
                  error={agencyProfileForm.formState.errors.name?.message}
                  {...agencyProfileForm.register("name")}
                />
                <Input
                  label="Website URL"
                  placeholder="https://example.com"
                  error={agencyProfileForm.formState.errors.website_url?.message}
                  {...agencyProfileForm.register("website_url")}
                />
                <Input
                  label="Logo URL"
                  placeholder="https://example.com/logo.png"
                  error={agencyProfileForm.formState.errors.logo_url?.message}
                  {...agencyProfileForm.register("logo_url")}
                />
                <Input
                  label="Address"
                  error={agencyProfileForm.formState.errors.address?.message}
                  {...agencyProfileForm.register("address")}
                />
              </div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Description
                <textarea
                  rows={4}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  {...agencyProfileForm.register("description")}
                />
              </label>
              {agencyProfileForm.formState.errors.root?.message ? (
                <p className="text-sm text-red-600" role="alert">
                  {agencyProfileForm.formState.errors.root.message}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  loading={updateAgencyProfile.isPending}
                >
                  Save profile
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelAgencyProfileEdit}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Contact
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {agency.email ?? "Email unavailable"}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {agency.phone_number ?? "Phone unavailable"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Owner
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {agency.owner_name ?? user?.first_name ?? "Owner"}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {agency.owner_email ?? user?.email ?? "Email unavailable"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Address
              </p>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {agency.address ?? "Address unavailable"}
              </p>
            </div>
          </div>
          {agencyStatsQuery.isLoading ? (
            <div className="border-t border-border pt-4">
              <LoadingState message="Loading live agency stats..." />
            </div>
          ) : null}
          {agencyStatsQuery.isError ? (
            <div
              className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
              role="alert"
            >
              <p className="font-medium">Live agency stats could not be loaded.</p>
              <p>
                Profile details are still available, but listing and roster counts may be stale.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void agencyStatsQuery.refetch();
                }}
              >
                Retry stats
              </Button>
            </div>
          ) : null}
          {!agencyStatsQuery.isLoading && !agencyStatsQuery.isError && agencyStats ? (
            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Active listings
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {statsListingCount ?? "Not recorded"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Roster agents
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {statsAgentCount ?? "Not recorded"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Stats source
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  Live backend agency stats
                </p>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Join requests
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review and audit people asking to join your agency roster.
            </p>
          </div>

          {joinRequestsQuery.isLoading ? <LoadingState /> : null}
          {joinRequestsQuery.isError ? (
            <ErrorState
              title="Could not load join requests"
              message={
                joinRequestsQuery.error instanceof ApiError &&
                typeof joinRequestsQuery.error.detail === "string"
                  ? joinRequestsQuery.error.detail
                  : "There was a problem loading pending requests."
              }
              onRetry={() => {
                void joinRequestsQuery.refetch();
              }}
            />
          ) : null}
          {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && joinRequests.length === 0 ? (
            <EmptyState
              title="No join requests"
              description="New requests and decision history will appear here."
            />
          ) : null}
          {!joinRequestsQuery.isLoading && joinRequests.length > 0 ? (
            <div className="space-y-4">
              {joinRequests.map((request) => (
                <div
                  key={request.join_request_id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {request.seeker_name ?? "Seeker"}
                        </p>
                        <Badge variant={getJoinRequestBadgeVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {request.seeker_email ?? "Email unavailable"} - {formatDate(request.created_at)}
                      </p>
                      {request.status !== "pending" ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Decision recorded {formatOptionalDate(request.decided_at)}
                        </p>
                      ) : null}
                      {request.cover_note ? (
                        <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {request.cover_note}
                        </p>
                      ) : null}
                      {request.portfolio_details ? (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-600 dark:bg-gray-950/40 dark:text-gray-300">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Profile details
                          </p>
                          <p className="whitespace-pre-wrap">{request.portfolio_details}</p>
                        </div>
                      ) : null}
                      {request.rejection_reason ? (
                        <div className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          {request.rejection_reason}
                        </div>
                      ) : null}
                    </div>
                    {request.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        loading={
                          approveJoinRequest.isPending &&
                          approveJoinRequest.variables === request.join_request_id
                        }
                        onClick={() => void handleApproveJoinRequest(request.join_request_id)}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        loading={
                          rejectJoinRequest.isPending &&
                          rejectJoinRequest.variables?.requestId === request.join_request_id
                        }
                        onClick={() => void handleRejectJoinRequest(request.join_request_id)}
                      >
                        Reject
                      </Button>
                    </div>
                    ) : null}
                  </div>
                  {request.status === "pending" ? (
                    <Input
                      className="mt-4"
                      label="Reject reason"
                      placeholder="Required before rejecting"
                      value={rejectReasons[request.join_request_id] ?? ""}
                      onChange={(event) =>
                        setRejectReasons((current) => ({
                          ...current,
                          [request.join_request_id]: event.target.value,
                        }))
                      }
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>
      ) : null}

      {activeTab === "reviewRequests" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Review requests
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review returning agents who asked for a membership decision to be reconsidered.
              </p>
            </div>
            {reviewRequestsQuery.isLoading ? <LoadingState /> : null}
            {reviewRequestsQuery.isError ? (
              <ErrorState
                title="Could not load review requests"
                message="There was a problem loading agency review requests."
                onRetry={() => {
                  void reviewRequestsQuery.refetch();
                }}
              />
            ) : null}
            {!reviewRequestsQuery.isLoading && !reviewRequestsQuery.isError && reviewRequests.length === 0 ? (
              <EmptyState
                title="No review requests"
                description="Requests to rejoin or review a membership decision will appear here."
              />
            ) : null}
            {!reviewRequestsQuery.isLoading && reviewRequests.length > 0 ? (
              <div className="space-y-4">
                {reviewRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {request.requester_name ?? request.requester_email ?? "Applicant"}
                            </p>
                            <Badge variant={request.status === "accepted" ? "success" : request.status === "declined" ? "danger" : "warning"}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {request.requester_email ?? "Email unavailable"} - Submitted {formatDate(request.created_at)}
                          </p>
                          {request.message ? (
                            <div className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              {request.message}
                            </div>
                          ) : null}
                          {request.membership_history && request.membership_history.length > 0 ? (
                            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-950/40">
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Prior agency history
                              </p>
                              <MembershipHistoryList history={request.membership_history} />
                            </div>
                          ) : null}
                          {request.reason ? (
                            <p className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                              Decision reason: {request.reason}
                            </p>
                          ) : null}
                        </div>
                        {request.status === "pending" ? (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            loading={
                              acceptReview.isPending &&
                              acceptReview.variables?.requestId === request.id
                            }
                            onClick={() =>
                              void handleReviewDecision(
                                "accept",
                                request.id,
                              )
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            loading={
                              declineReview.isPending &&
                              declineReview.variables?.requestId === request.id
                            }
                            onClick={() =>
                              void handleReviewDecision(
                                "decline",
                                request.id,
                              )
                            }
                          >
                            Decline
                          </Button>
                        </div>
                        ) : null}
                      </div>
                      {request.status === "pending" ? (
                        <Input
                        className="mt-4"
                        label="Decision reason"
                        placeholder="Optional reason shown to the requester"
                        value={membershipReasons[request.id] ?? ""}
                        onChange={(event) =>
                          setMembershipReasons((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                      />
                      ) : null}
                    </div>
                  ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "agents" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Agent roster
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage active, suspended, inactive, and blocked agency memberships.
              </p>
            </div>
            {agentsQuery.isLoading ? <LoadingState /> : null}
            {agentsQuery.isError ? (
              <ErrorState
                title="Could not load agents"
                message="There was a problem loading your agency roster."
                onRetry={() => {
                  void agentsQuery.refetch();
                }}
              />
            ) : null}
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.length === 0 ? (
              <EmptyState
                title="No agents yet"
                description="Approved join requests and invited agents will appear here."
              />
            ) : null}
            {!agentsQuery.isLoading && agents.length > 0 ? (
              <div className="divide-y divide-border">
                {agents.map((agent) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="flex min-w-0 items-center gap-3">
                        {agent.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={agent.profile_image_url}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            {(agent.display_name || "Agent")
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() ?? "")
                              .join("")}
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {agent.display_name || agent.company_name || "Listing agent"}
                            </p>
                            <Badge variant={getMembershipBadgeVariant(agent.membership_status)}>
                              {agent.membership_status}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {agent.email}
                            {agent.phone_number ? ` - ${agent.phone_number}` : ""}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{agent.specialization ?? "Real estate agent"}</span>
                            {agent.years_experience != null ? (
                              <span>{agent.years_experience} years experience</span>
                            ) : null}
                            {agent.license_number ? (
                              <span>License {agent.license_number}</span>
                            ) : null}
                          </div>
                          {agent.status_reason ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Decision reason: {agent.status_reason}
                            </p>
                          ) : null}
                          {agent.status_decided_at ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Last decision {formatOptionalDate(agent.status_decided_at)}
                            </p>
                          ) : null}
                          {agent.pending_review_request_id ? (
                            <div className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              <p className="font-medium">Review requested</p>
                              {agent.pending_review_reason ? (
                                <p className="mt-1">{agent.pending_review_reason}</p>
                              ) : null}
                              {agent.pending_review_submitted_at ? (
                                <p className="mt-1">
                                  Submitted {formatOptionalDate(agent.pending_review_submitted_at)}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {agent.profile_id ? (
                          <Link
                            href={`/agents/${agent.profile_id}`}
                            className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-transparent bg-secondary px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-secondary-foreground transition-all outline-none select-none hover:bg-secondary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            View
                          </Link>
                        ) : null}
                        {agent.membership_status === "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            loading={
                              suspendMembership.isPending &&
                              suspendMembership.variables?.membershipId === agent.membership_id
                            }
                            onClick={() => void handleMembershipAction("suspend", agent.membership_id)}
                          >
                            Suspend
                          </Button>
                        ) : null}
                        {agent.membership_status !== "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            loading={
                              restoreMembership.isPending &&
                              restoreMembership.variables?.membershipId === agent.membership_id
                            }
                            onClick={() => void handleRestoreMembership(agent.membership_id)}
                          >
                            Restore
                          </Button>
                        ) : null}
                        {agent.membership_status !== "inactive" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            loading={
                              revokeMembership.isPending &&
                              revokeMembership.variables?.membershipId === agent.membership_id
                            }
                            onClick={() => void handleMembershipAction("revoke", agent.membership_id)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                        {agent.membership_status !== "blocked" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            loading={
                              blockMembership.isPending &&
                              blockMembership.variables?.membershipId === agent.membership_id
                            }
                            onClick={() => void handleMembershipAction("block", agent.membership_id)}
                          >
                            Block
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <Input
                      label="Decision reason"
                      placeholder="Required before membership decisions or review responses"
                      value={membershipReasons[agent.membership_id] ?? ""}
                      onChange={(event) =>
                        setMembershipReasons((current) => ({
                          ...current,
                          [agent.membership_id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "invitations" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Invite agent
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create an invite for an agent by email.
              </p>
            </div>
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(handleInvite)(event)}>
              <Input
                label="Agent email"
                type="email"
                placeholder="agent@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              {errors.root?.message ? (
                <p className="text-sm text-red-600" role="alert">
                  {errors.root.message}
                </p>
              ) : null}
              <Button type="submit" loading={inviteAgent.isPending}>
                Send invite
              </Button>
            </form>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Sent invitations
              </h3>
              {invitationsQuery.isLoading ? <LoadingState /> : null}
              {invitationsQuery.isError ? (
                <ErrorState
                  title="Could not load invitations"
                  message="There was a problem loading sent invitations."
                  onRetry={() => {
                    void invitationsQuery.refetch();
                  }}
                />
              ) : null}
              {!invitationsQuery.isLoading &&
              !invitationsQuery.isError &&
              invitations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No invitations sent yet.
                </p>
              ) : null}
              {!invitationsQuery.isLoading && invitations.length > 0 ? (
                <div className="space-y-3">
                  {invitations.slice(0, 5).map((invitation) => (
                    <div
                      key={invitation.invitation_id}
                      className="rounded-lg border border-border p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invitation.email}
                        </p>
                        <Badge variant={getJoinRequestBadgeVariant(invitation.status)}>
                          {invitation.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Sent {formatDate(invitation.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
