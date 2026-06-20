"use client";

import { useState } from "react";
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
} from "@/components";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentRoleGate } from "@/hooks/useAgentRoleGate";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import {
  useAgencyAgents,
  useAgencyInvitations,
  useAgencyJoinRequests,
  useAgencyReviewRequests,
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
import { MembershipHistoryList } from "./MembershipHistoryList";
import {
  AgencyOwnerRosterSkeleton,
  AgencyOwnerTabListSkeleton,
} from "./AgencyOwnerDashboardSkeleton";

const inviteSchema = z.object({
  email: z.email("Use a valid email address"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;
type AgencyOwnerTab = "joinRequests" | "reviewRequests" | "agents" | "invitations" | "rejected" | "suspended" | "leftCancelled" | "revoked";
type MembershipDecisionAction = "suspend" | "revoke" | "block" | "restore";
type PendingMembershipDecision = {
  action: MembershipDecisionAction;
  membershipId: number;
  agentName: string;
};

const AGENCY_OWNER_TABS: Array<{ value: AgencyOwnerTab; label: string }> = [
  { value: "joinRequests", label: "Join requests" },
  { value: "reviewRequests", label: "Review requests" },
  { value: "agents", label: "Agent roster" },
  { value: "invitations", label: "Invitations" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "leftCancelled", label: "Left/Cancelled" },
  { value: "revoked", label: "Revoked" },
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
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

function getMembershipBadgeVariant(status: string) {
  if (status === "active") return "success" as const;
  if (status === "suspended") return "warning" as const;
  if (status === "revoked" || status === "inactive") return "danger" as const;
  if (status === "left") return "outline" as const;
  return "outline" as const;
}

function getRequiredDecisionReasonMessage(action: MembershipDecisionAction) {
  const actionLabels = {
    suspend: "suspending",
    revoke: "revoking",
    block: "blocking",
    restore: "restoring",
  } as const;
  return `Enter a reason before ${actionLabels[action]} this agent.`;
}

function getMembershipDecisionLabel(action: MembershipDecisionAction) {
  const labels = {
    suspend: "Suspend agent",
    revoke: "Remove from agency",
    block: "Block agent",
    restore: "Restore agent",
  } as const;
  return labels[action];
}

export function AgencyMembersClient() {
  const gate = useAgentRoleGate();
  const { user } = useAuth();
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [membershipReasons, setMembershipReasons] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<AgencyOwnerTab>("joinRequests");
  const [pendingMembershipDecision, setPendingMembershipDecision] =
    useState<PendingMembershipDecision | null>(null);
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
  const agentsQuery = useAgencyAgents(agencyId ?? "", "all", activeTab === "agents");
  const joinRequestsQuery = useAgencyJoinRequests(agencyId, Boolean(agencyId));
  const reviewRequestsQuery = useAgencyReviewRequests(agencyId, Boolean(agencyId));
  const invitationsQuery = useAgencyInvitations(agencyId, Boolean(agencyId));
  const approveJoinRequest = useApproveAgencyJoinRequest(agencyId);
  const rejectJoinRequest = useRejectAgencyJoinRequest(agencyId);
  const suspendMembership = useSuspendAgencyMembership(agencyId);
  const revokeMembership = useRevokeAgencyMembership(agencyId);
  const blockMembership = useBlockAgencyMembership(agencyId);
  const restoreMembership = useRestoreAgencyMembership(agencyId);
  const acceptReview = useAcceptAgencyReviewRequest(agencyId);
  const declineReview = useDeclineAgencyReviewRequest(agencyId);
  const inviteAgent = useInviteAgencyAgent(agencyId);

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
      await rejectJoinRequest.mutateAsync({ requestId, payload: { reason } });
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
      setError("root", { type: "server", message });
    }
  };

  const handleMembershipAction = async (
    action: Exclude<MembershipDecisionAction, "restore">,
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
      await restoreMembership.mutateAsync({ membershipId, payload: { reason } });
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

  const handleConfirmMembershipDecision = async () => {
    if (!pendingMembershipDecision) return;
    if (pendingMembershipDecision.action === "restore") {
      await handleRestoreMembership(pendingMembershipDecision.membershipId);
    } else {
      await handleMembershipAction(
        pendingMembershipDecision.action,
        pendingMembershipDecision.membershipId,
      );
    }
    setPendingMembershipDecision(null);
  };

  const handleReviewDecision = async (action: "accept" | "decline", requestId: number) => {
    const reason = membershipReasons[requestId]?.trim() || null;
    try {
      if (action === "accept") {
        await acceptReview.mutateAsync({ requestId, payload: { reason } });
        notify.success("Review request accepted. The agent role has been reinstated if needed.");
      } else {
        await declineReview.mutateAsync({ requestId, payload: { reason } });
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

  if (gate.isChecking || !gate.isAllowed || !agencyId) {
    return (
      <div className="space-y-6">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Membership management</p></div>
        <Card>
          <CardBody>
            <EmptyState title="No agency profile found" description="Your agency owner account is active, but no agency could be resolved." />
          </CardBody>
        </Card>
      </div>
    );
  }

  const joinRequests = joinRequestsQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const reviewRequests = reviewRequestsQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const tabCounts: Record<AgencyOwnerTab, number | undefined> = {
    joinRequests: joinRequests.length,
    reviewRequests: reviewRequests.length,
    agents: agentsQuery.isSuccess ? agents.length : undefined,
    invitations: invitations.length,
    rejected: joinRequests.filter(r => r.status === "rejected").length,
    suspended: agents.filter(a => a.membership_status === "suspended").length,
    leftCancelled: agents.filter(a => a.membership_status === "left").length,
    revoked: agents.filter(a => a.membership_status === "revoked").length,
  };
  const pendingDecisionReason = pendingMembershipDecision
    ? membershipReasons[pendingMembershipDecision.membershipId]?.trim()
    : "";
  const isPendingDecisionSubmitting = pendingMembershipDecision
    ? (pendingMembershipDecision.action === "suspend" && suspendMembership.isPending) ||
      (pendingMembershipDecision.action === "revoke" && revokeMembership.isPending) ||
      (pendingMembershipDecision.action === "block" && blockMembership.isPending) ||
      (pendingMembershipDecision.action === "restore" && restoreMembership.isPending)
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
                Review and audit people asking to join your agency roster.
              </p>
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
            {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && joinRequests.length === 0 ? (
              <EmptyState title="No join requests" description="New requests and decision history will appear here." />
            ) : null}
            {!joinRequestsQuery.isLoading && joinRequests.length > 0 ? (
              <div className="space-y-4">
                {joinRequests.map((request) => (
                  <div key={request.join_request_id} className="rounded-lg border border-border p-4">
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
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile details</p>
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
                            type="button" size="sm"
                            loading={approveJoinRequest.isPending && approveJoinRequest.variables === request.join_request_id}
                            onClick={() => void handleApproveJoinRequest(request.join_request_id)}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button" size="sm" variant="destructive"
                            loading={rejectJoinRequest.isPending && rejectJoinRequest.variables?.requestId === request.join_request_id}
                            onClick={() => void handleRejectJoinRequest(request.join_request_id)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {request.status === "pending" ? (
                      <Input
                        className="mt-4" label="Reject reason" placeholder="Required before rejecting"
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review requests</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review returning agents who asked for a membership decision to be reconsidered.
              </p>
            </div>
            {reviewRequestsQuery.isLoading ? <AgencyOwnerTabListSkeleton /> : null}
            {reviewRequestsQuery.isError ? (
              <ErrorState
                title="Could not load review requests" message="There was a problem loading agency review requests."
                onRetry={() => { void reviewRequestsQuery.refetch(); }}
              />
            ) : null}
            {!reviewRequestsQuery.isLoading && !reviewRequestsQuery.isError && reviewRequests.length === 0 ? (
              <EmptyState title="No review requests" description="Requests to rejoin or review a membership decision will appear here." />
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
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Prior agency history</p>
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
                          <Button type="button" size="sm"
                            loading={acceptReview.isPending && acceptReview.variables?.requestId === request.id}
                            onClick={() => void handleReviewDecision("accept", request.id)}
                          >
                            Accept
                          </Button>
                          <Button type="button" size="sm" variant="secondary"
                            loading={declineReview.isPending && declineReview.variables?.requestId === request.id}
                            onClick={() => void handleReviewDecision("decline", request.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {request.status === "pending" ? (
                      <Input className="mt-4" label="Decision reason" placeholder="Optional reason shown to the requester"
                        value={membershipReasons[request.id] ?? ""}
                        onChange={(event) =>
                          setMembershipReasons((current) => ({ ...current, [request.id]: event.target.value }))
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
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.length === 0 ? (
              <EmptyState title="No agents yet" description="Approved join requests and invited agents will appear here." />
            ) : null}
            {!agentsQuery.isLoading && agents.length > 0 ? (
              <div className="divide-y divide-border">
                {agents.map((agent) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="flex min-w-0 items-center gap-3">
                        {agent.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={agent.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            {(agent.display_name || "Agent").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}
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
                            {agent.email}{agent.phone_number ? ` - ${agent.phone_number}` : ""}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{agent.specialization ?? "Real estate agent"}</span>
                            {agent.years_experience != null ? <span>{agent.years_experience} years experience</span> : null}
                            {agent.license_number ? <span>License {agent.license_number}</span> : null}
                          </div>
                          {agent.status_reason ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Decision reason: {agent.status_reason}</p>
                          ) : null}
                          {agent.status_decided_at ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last decision {formatOptionalDate(agent.status_decided_at)}</p>
                          ) : null}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {agent.listing_count} active listing{agent.listing_count !== 1 ? "s" : ""}.
                          </p>
                          {agent.pending_review_request_id ? (
                            <div className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                              <p className="font-medium">Review requested</p>
                              {agent.pending_review_reason ? <p className="mt-1">{agent.pending_review_reason}</p> : null}
                              {agent.pending_review_submitted_at ? <p className="mt-1">Submitted {formatOptionalDate(agent.pending_review_submitted_at)}</p> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {agent.profile_id ? (
                          <Link href={`/agents/${agent.profile_id}`}
                            className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-transparent bg-secondary px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-secondary-foreground transition-all outline-none select-none hover:bg-secondary/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            View
                          </Link>
                        ) : null}
                        {agent.membership_status === "active" ? (
                          <Button type="button" size="sm" variant="secondary"
                            loading={suspendMembership.isPending && suspendMembership.variables?.membershipId === agent.membership_id}
                            onClick={() =>
                              setPendingMembershipDecision({
                                action: "suspend", membershipId: agent.membership_id,
                                agentName: agent.display_name || agent.company_name || "this agent",
                              })
                            }
                          >
                            Suspend
                          </Button>
                        ) : null}
                        {agent.membership_status !== "active" ? (
                          <Button type="button" size="sm"
                            loading={restoreMembership.isPending && restoreMembership.variables?.membershipId === agent.membership_id}
                            onClick={() =>
                              setPendingMembershipDecision({
                                action: "restore", membershipId: agent.membership_id,
                                agentName: agent.display_name || agent.company_name || "this agent",
                              })
                            }
                          >
                            Restore
                          </Button>
                        ) : null}
                        {agent.membership_status !== "inactive" ? (
                          <Button type="button" size="sm" variant="secondary"
                            loading={revokeMembership.isPending && revokeMembership.variables?.membershipId === agent.membership_id}
                            onClick={() =>
                              setPendingMembershipDecision({
                                action: "revoke", membershipId: agent.membership_id,
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
                              setPendingMembershipDecision({
                                action: "block", membershipId: agent.membership_id,
                                agentName: agent.display_name || agent.company_name || "this agent",
                              })
                            }
                          >
                            Block
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <Input
                      label="Decision reason" placeholder="Required before membership decisions or review responses"
                      value={membershipReasons[agent.membership_id] ?? ""}
                      onChange={(event) =>
                        setMembershipReasons((current) => ({ ...current, [agent.membership_id]: event.target.value }))
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite agent</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create an invite for an agent by email.
              </p>
            </div>
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(handleInvite)(event)}>
              <Input label="Agent email" type="email" placeholder="agent@example.com" error={errors.email?.message} {...register("email")} />
              {errors.root?.message ? <p className="text-sm text-red-600" role="alert">{errors.root.message}</p> : null}
              <Button type="submit" loading={inviteAgent.isPending}>Send invite</Button>
            </form>
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
              {!invitationsQuery.isLoading && invitations.length > 0 ? (
                <div className="space-y-3">
                  {invitations.slice(0, 5).map((invitation) => (
                    <div key={invitation.invitation_id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{invitation.email}</p>
                        <Badge variant={getJoinRequestBadgeVariant(invitation.status)}>{invitation.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Sent {formatDate(invitation.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {activeTab === "rejected" ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rejected</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Review rejected join requests and their reasons.
              </p>
            </div>
            {joinRequestsQuery.isLoading ? <AgencyOwnerTabListSkeleton /> : null}
            {joinRequestsQuery.isError ? (
              <ErrorState
                title="Could not load rejected requests"
                message="There was a problem loading rejected requests."
                onRetry={() => { void joinRequestsQuery.refetch(); }}
              />
            ) : null}
            {!joinRequestsQuery.isLoading && !joinRequestsQuery.isError && joinRequests.filter(r => r.status === "rejected").length === 0 ? (
              <EmptyState title="No rejected applications." description="" />
            ) : null}
            {!joinRequestsQuery.isLoading && joinRequests.filter(r => r.status === "rejected").length > 0 ? (
              <div className="space-y-4">
                {joinRequests.filter(r => r.status === "rejected").map((request) => (
                  <div key={request.join_request_id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {request.seeker_name ?? "Seeker"}
                          </p>
                          <Badge variant="danger">{request.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.seeker_email ?? "Email unavailable"}
                        </p>
                        {request.decided_at ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Rejected {formatDate(request.decided_at)}
                          </p>
                        ) : null}
                        {request.rejection_reason ? (
                          <div className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            {request.rejection_reason}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
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
            {!agentsQuery.isLoading && agents.filter(a => a.membership_status === "suspended").length > 0 ? (
              <div className="divide-y divide-border">
                {agents.filter(a => a.membership_status === "suspended").map((agent) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="flex min-w-0 items-center gap-3">
                        {agent.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={agent.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            {(agent.display_name || "Agent").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {agent.display_name || agent.company_name || "Listing agent"}
                          </p>
                          <Badge variant="warning">suspended</Badge>
                          {agent.status_decided_at ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Suspended {formatDate(agent.status_decided_at)}
                            </p>
                          ) : null}
                          {agent.status_reason ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reason: {agent.status_reason}</p>
                          ) : null}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {agent.listing_count} active listing{agent.listing_count !== 1 ? "s" : ""}.
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="button" size="sm"
                          loading={restoreMembership.isPending && restoreMembership.variables?.membershipId === agent.membership_id}
                          onClick={() =>
                            setPendingMembershipDecision({
                              action: "restore", membershipId: agent.membership_id,
                              agentName: agent.display_name || agent.company_name || "this agent",
                            })
                          }
                        >
                          Reinstate
                        </Button>
                      </div>
                    </div>
                    <Input
                      label="Decision reason" placeholder="Required before membership decisions or review responses"
                      value={membershipReasons[agent.membership_id] ?? ""}
                      onChange={(event) =>
                        setMembershipReasons((current) => ({ ...current, [agent.membership_id]: event.target.value }))
                      }
                    />
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
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.filter(a => a.membership_status === "left").length === 0 ? (
              <EmptyState title="No departed members." description="" />
            ) : null}
            {!agentsQuery.isLoading && agents.filter(a => a.membership_status === "left").length > 0 ? (
              <div className="divide-y divide-border">
                {agents.filter(a => a.membership_status === "left").map((agent) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="flex min-w-0 items-center gap-3">
                        {agent.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={agent.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            {(agent.display_name || "Agent").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {agent.display_name || agent.company_name || "Listing agent"}
                          </p>
                          <Badge variant="outline">left</Badge>
                          {agent.status_decided_at ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Left {formatDate(agent.status_decided_at)}
                            </p>
                          ) : null}
                          {agent.status_reason ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reason: {agent.status_reason}</p>
                          ) : null}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {agent.listing_count} active listing{agent.listing_count !== 1 ? "s" : ""}.
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="button" size="sm"
                          loading={restoreMembership.isPending && restoreMembership.variables?.membershipId === agent.membership_id}
                          onClick={() =>
                            setPendingMembershipDecision({
                              action: "restore", membershipId: agent.membership_id,
                              agentName: agent.display_name || agent.company_name || "this agent",
                            })
                          }
                        >
                          Reinstate
                        </Button>
                      </div>
                    </div>
                    <Input
                      label="Decision reason" placeholder="Required before membership decisions or review responses"
                      value={membershipReasons[agent.membership_id] ?? ""}
                      onChange={(event) =>
                        setMembershipReasons((current) => ({ ...current, [agent.membership_id]: event.target.value }))
                      }
                    />
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
            {!agentsQuery.isLoading && !agentsQuery.isError && agents.filter(a => a.membership_status === "revoked").length === 0 ? (
              <EmptyState title="No revoked memberships." description="" />
            ) : null}
            {!agentsQuery.isLoading && agents.filter(a => a.membership_status === "revoked").length > 0 ? (
              <div className="divide-y divide-border">
                {agents.filter(a => a.membership_status === "revoked").map((agent) => (
                  <div key={agent.membership_id} className="space-y-4 py-4">
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="flex min-w-0 items-center gap-3">
                        {agent.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={agent.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            {(agent.display_name || "Agent").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {agent.display_name || agent.company_name || "Listing agent"}
                          </p>
                          <Badge variant="danger">revoked</Badge>
                          {agent.status_decided_at ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Revoked {formatDate(agent.status_decided_at)}
                            </p>
                          ) : null}
                          {agent.status_reason ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reason: {agent.status_reason}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="button" size="sm"
                          loading={restoreMembership.isPending && restoreMembership.variables?.membershipId === agent.membership_id}
                          onClick={() =>
                            setPendingMembershipDecision({
                              action: "restore", membershipId: agent.membership_id,
                              agentName: agent.display_name || agent.company_name || "this agent",
                            })
                          }
                        >
                          Reinstate
                        </Button>
                      </div>
                    </div>
                    <Input
                      label="Decision reason" placeholder="Required before membership decisions or review responses"
                      value={membershipReasons[agent.membership_id] ?? ""}
                      onChange={(event) =>
                        setMembershipReasons((current) => ({ ...current, [agent.membership_id]: event.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

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
              variant={
                pendingMembershipDecision?.action === "block" ||
                pendingMembershipDecision?.action === "revoke" ||
                pendingMembershipDecision?.action === "suspend"
                  ? "destructive"
                  : "primary"
              }
              loading={isPendingDecisionSubmitting}
              disabled={!pendingDecisionReason}
              onClick={() => void handleConfirmMembershipDecision()}
            >
              {pendingMembershipDecision ? getMembershipDecisionLabel(pendingMembershipDecision.action) : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
