"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Input, LoadingState } from "@/components";
import {
  useAdminAgencies,
  useApproveAgencyApplication,
  useRejectAgencyApplication,
  useRevokeAgencyApproval,
  useSuspendAgency,
} from "@/features/agencies/hooks";
import { useAdminRoleGate } from "@/hooks/useAdminRoleGate";
import { notify } from "@/lib/toast";
import type { Agency, AgencyStatus } from "@/types";

type AdminAgencyTab = AgencyStatus | "revocation";

const ADMIN_AGENCY_TABS: Array<{ value: AdminAgencyTab; label: string }> = [
  ...Object.entries({
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    suspended: "Suspended",
  } satisfies Record<AgencyStatus, string>).map(([value, label]) => ({
    value: value as AgencyStatus,
    label,
  })),
  { value: "revocation", label: "Revocation review" },
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusBadgeVariant(status: AgencyStatus) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "pending") {
    return "warning" as const;
  }

  return "danger" as const;
}

function getStatusLabel(status: AgencyStatus) {
  return ADMIN_AGENCY_TABS.find((tab) => tab.value === status)?.label ?? status;
}

function isRevocationReviewAgency(agency: Agency) {
  return agency.status === "pending" && Boolean(agency.status_reason?.trim());
}

function getDecisionEmailStatus(agency: Agency) {
  const emailStatus = (agency as Record<string, unknown>).email_status;

  if (emailStatus === "sent") {
    return "Confirmation email sent.";
  }

  if (emailStatus === "failed") {
    return "Decision saved - email delivery needs retry.";
  }

  return "Decision saved. Confirmation email delivery has started.";
}

function getInternalDecisionStatus(action: string) {
  return `${action} saved. The agency owner can see this status and reason in their dashboard.`;
}

export function AdminAgenciesClient() {
  const gate = useAdminRoleGate();
  const pendingAgenciesQuery = useAdminAgencies("pending", gate.isAllowed);
  const approvedAgenciesQuery = useAdminAgencies("approved", gate.isAllowed);
  const rejectedAgenciesQuery = useAdminAgencies("rejected", gate.isAllowed);
  const suspendedAgenciesQuery = useAdminAgencies("suspended", gate.isAllowed);
  const approveAgency = useApproveAgencyApplication();
  const rejectAgency = useRejectAgencyApplication();
  const revokeAgency = useRevokeAgencyApproval();
  const suspendAgency = useSuspendAgency();
  const [decisionReasons, setDecisionReasons] = useState<Record<number, string>>({});
  const [emailStatusMessages, setEmailStatusMessages] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<AdminAgencyTab>("pending");

  const getRequiredDecisionReason = (agencyId: number, action: string) => {
    const reason = decisionReasons[agencyId]?.trim();

    if (!reason) {
      notify.error(`Enter a reason before ${action} this agency.`);
      return null;
    }

    return reason;
  };

  const getOptionalDecisionReason = (agencyId: number, fallback: string) =>
    decisionReasons[agencyId]?.trim() || fallback;

  const clearDecisionReason = (agencyId: number) => {
    setDecisionReasons((current) => {
      const next = { ...current };
      delete next[agencyId];
      return next;
    });
  };

  const handleApprove = async (agencyId: number) => {
    const reason = getOptionalDecisionReason(agencyId, "Approved by admin.");

    try {
      const agency = await approveAgency.mutateAsync({ agencyId, payload: { reason } });
      const emailStatus = getDecisionEmailStatus(agency);
      setEmailStatusMessages((current) => ({ ...current, [agencyId]: emailStatus }));
      notify.success(`Agency approved. ${emailStatus}`);
      setActiveTab("approved");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not approve agency");
    }
  };

  const handleReject = async (agencyId: number) => {
    const reason = getRequiredDecisionReason(agencyId, "rejecting");

    if (!reason) {
      return;
    }

    try {
      const agency = await rejectAgency.mutateAsync({
        agencyId,
        payload: { reason },
      });
      const emailStatus = getDecisionEmailStatus(agency);
      setEmailStatusMessages((current) => ({ ...current, [agencyId]: emailStatus }));
      notify.success(`Agency rejected. ${emailStatus}`);
      setActiveTab("rejected");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not reject agency");
    }
  };

  const handleRevoke = async (agencyId: number) => {
    const reason = getRequiredDecisionReason(agencyId, "revoking");

    if (!reason) {
      return;
    }

    try {
      await revokeAgency.mutateAsync({ agencyId, payload: { reason } });
      const internalStatus = getInternalDecisionStatus("Revocation");
      setEmailStatusMessages((current) => ({ ...current, [agencyId]: internalStatus }));
      notify.success(`Agency approval revoked. ${internalStatus}`);
      setActiveTab("revocation");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not revoke agency approval");
    }
  };

  const handleSuspend = async (agencyId: number) => {
    const reason = getRequiredDecisionReason(agencyId, "suspending");

    if (!reason) {
      return;
    }

    try {
      await suspendAgency.mutateAsync({ agencyId, payload: { reason } });
      const internalStatus = getInternalDecisionStatus("Suspension");
      setEmailStatusMessages((current) => ({ ...current, [agencyId]: internalStatus }));
      notify.success(`Agency suspended. ${internalStatus}`);
      setActiveTab("suspended");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not suspend agency");
    }
  };

  if (gate.isChecking || !gate.isAllowed) {
    return <LoadingState />;
  }

  const agencyQueries = [
    pendingAgenciesQuery,
    approvedAgenciesQuery,
    rejectedAgenciesQuery,
    suspendedAgenciesQuery,
  ];

  if (agencyQueries.some((query) => query.isLoading)) {
    return <LoadingState />;
  }

  if (agencyQueries.some((query) => query.isError)) {
    return (
      <ErrorState
        title="Could not load agencies"
        message="There was a problem loading agency review data."
        onRetry={() => {
          void pendingAgenciesQuery.refetch();
          void approvedAgenciesQuery.refetch();
          void rejectedAgenciesQuery.refetch();
          void suspendedAgenciesQuery.refetch();
        }}
      />
    );
  }

  const pendingAgencies = pendingAgenciesQuery.data ?? [];
  const approvedAgencies = approvedAgenciesQuery.data ?? [];
  const rejectedAgencies = rejectedAgenciesQuery.data ?? [];
  const suspendedAgencies = suspendedAgenciesQuery.data ?? [];
  const revocationReviewAgencies = pendingAgencies.filter(isRevocationReviewAgency);
  const agenciesByStatus: Record<AdminAgencyTab, Agency[]> = {
    pending: pendingAgencies,
    approved: approvedAgencies,
    rejected: rejectedAgencies,
    suspended: suspendedAgencies,
    revocation: revocationReviewAgencies,
  };
  const activeAgencies = agenciesByStatus[activeTab];
  const activeTabLabel =
    ADMIN_AGENCY_TABS.find((tab) => tab.value === activeTab)?.label ?? activeTab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Agency applications
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Review pending agencies and approve or reject their public profile.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        {ADMIN_AGENCY_TABS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant={activeTab === value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(value)}
          >
            {label} ({agenciesByStatus[value].length})
          </Button>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {activeTabLabel} agencies
        </h2>
        {activeAgencies.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} agencies`}
            description={
              activeTab === "revocation"
                ? "Agencies whose approval was revoked move back to pending review and appear here with their revocation reason."
                : "Agency records for this status will appear here."
            }
          />
        ) : (
          <div className="space-y-4">
            {activeAgencies.map((agency) => (
            <Card key={agency.agency_id}>
              <CardBody className="space-y-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {agency.name}
                      </h2>
                      <Badge variant={getStatusBadgeVariant(agency.status)}>
                        {getStatusLabel(agency.status)}
                      </Badge>
                    </div>
                    {agency.description ? (
                      <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {agency.description}
                      </p>
                    ) : null}
                    {agency.status_reason ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isRevocationReviewAgency(agency)
                          ? "Revocation reason"
                          : "Last decision reason"}
                        : {agency.status_reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agency.status !== "approved" ? (
                    <Button
                      type="button"
                      size="sm"
                      loading={
                        approveAgency.isPending &&
                        approveAgency.variables?.agencyId === agency.agency_id
                      }
                      onClick={() => void handleApprove(agency.agency_id)}
                    >
                      Approve
                    </Button>
                    ) : null}
                    {agency.status === "pending" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      loading={
                        rejectAgency.isPending &&
                        rejectAgency.variables?.agencyId === agency.agency_id
                      }
                      onClick={() => void handleReject(agency.agency_id)}
                    >
                      Reject
                    </Button>
                    ) : null}
                    {agency.status === "approved" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={
                            revokeAgency.isPending &&
                            revokeAgency.variables?.agencyId === agency.agency_id
                          }
                          onClick={() => void handleRevoke(agency.agency_id)}
                        >
                          Revoke
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={
                            suspendAgency.isPending &&
                            suspendAgency.variables?.agencyId === agency.agency_id
                          }
                          onClick={() => void handleSuspend(agency.agency_id)}
                        >
                          Suspend
                        </Button>
                      </>
                    ) : null}
                    <Link
                      href={`/agencies/${agency.agency_id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                    >
                      View
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Owner
                    </p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                      {agency.owner_name ?? "Not provided"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {agency.owner_email ?? "Email unavailable"}
                    </p>
                    {agency.owner_phone_number ? (
                      <p className="text-gray-500 dark:text-gray-400">
                        {agency.owner_phone_number}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Agency contact
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
                      Address
                    </p>
                    <p className="mt-1 text-gray-700 dark:text-gray-200">
                      {agency.address ?? "Address unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Timeline
                    </p>
                    <p className="mt-1 text-gray-700 dark:text-gray-200">
                      Submitted {formatDateTime(agency.created_at)}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      Updated {formatDateTime(agency.updated_at)}
                    </p>
                  </div>
                </div>

                {emailStatusMessages[agency.agency_id] ? (
                  <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                    {emailStatusMessages[agency.agency_id]}
                  </p>
                ) : null}

                <Input
                  label={
                    agency.status === "approved"
                      ? "Decision reason"
                      : "Approval note / rejection reason"
                  }
                  placeholder={
                    agency.status === "approved"
                      ? "Required before revoking or suspending"
                      : "Optional for approval, required for rejection"
                  }
                  value={decisionReasons[agency.agency_id] ?? ""}
                  onChange={(event) =>
                    setDecisionReasons((current) => ({
                      ...current,
                      [agency.agency_id]: event.target.value,
                    }))
                  }
                />
              </CardBody>
            </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
