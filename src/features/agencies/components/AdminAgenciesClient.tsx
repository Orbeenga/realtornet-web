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

export function AdminAgenciesClient() {
  const gate = useAdminRoleGate();
  const pendingAgenciesQuery = useAdminAgencies("pending", gate.isAllowed);
  const approvedAgenciesQuery = useAdminAgencies("approved", gate.isAllowed);
  const approveAgency = useApproveAgencyApplication();
  const rejectAgency = useRejectAgencyApplication();
  const revokeAgency = useRevokeAgencyApproval();
  const suspendAgency = useSuspendAgency();
  const [decisionReasons, setDecisionReasons] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");

  const getDecisionReason = (agencyId: number, action: string) => {
    const reason = decisionReasons[agencyId]?.trim();

    if (!reason) {
      notify.error(`Enter a reason before ${action} this agency.`);
      return null;
    }

    return reason;
  };

  const clearDecisionReason = (agencyId: number) => {
    setDecisionReasons((current) => {
      const next = { ...current };
      delete next[agencyId];
      return next;
    });
  };

  const handleApprove = async (agencyId: number) => {
    const reason = getDecisionReason(agencyId, "approving");

    if (!reason) {
      return;
    }

    try {
      await approveAgency.mutateAsync({ agencyId, payload: { reason } });
      notify.success("Agency approved");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not approve agency");
    }
  };

  const handleReject = async (agencyId: number) => {
    const reason = getDecisionReason(agencyId, "rejecting");

    if (!reason) {
      return;
    }

    try {
      await rejectAgency.mutateAsync({
        agencyId,
        payload: { reason },
      });
      notify.success("Agency rejected");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not reject agency");
    }
  };

  const handleRevoke = async (agencyId: number) => {
    const reason = getDecisionReason(agencyId, "revoking");

    if (!reason) {
      return;
    }

    try {
      await revokeAgency.mutateAsync({ agencyId, payload: { reason } });
      notify.success("Agency approval revoked");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not revoke agency approval");
    }
  };

  const handleSuspend = async (agencyId: number) => {
    const reason = getDecisionReason(agencyId, "suspending");

    if (!reason) {
      return;
    }

    try {
      await suspendAgency.mutateAsync({ agencyId, payload: { reason } });
      notify.success("Agency suspended");
      clearDecisionReason(agencyId);
    } catch {
      notify.error("Could not suspend agency");
    }
  };

  if (gate.isChecking || !gate.isAllowed) {
    return <LoadingState />;
  }

  if (pendingAgenciesQuery.isLoading || approvedAgenciesQuery.isLoading) {
    return <LoadingState />;
  }

  if (pendingAgenciesQuery.isError || approvedAgenciesQuery.isError) {
    return (
      <ErrorState
        title="Could not load agencies"
        message="There was a problem loading agency review data."
        onRetry={() => {
          void pendingAgenciesQuery.refetch();
          void approvedAgenciesQuery.refetch();
        }}
      />
    );
  }

  const pendingAgencies = pendingAgenciesQuery.data ?? [];
  const approvedAgencies = approvedAgenciesQuery.data ?? [];

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
        {[
          ["pending", "Pending Applications"],
          ["approved", "Approved Agencies"],
        ].map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={activeTab === value ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(value as "pending" | "approved")}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "pending" ? (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Pending applications
        </h2>
        {pendingAgencies.length === 0 ? (
          <EmptyState
            title="No pending applications"
            description="New agency applications will appear here for review."
          />
        ) : (
          <div className="space-y-4">
            {pendingAgencies.map((agency) => (
            <Card key={agency.agency_id}>
              <CardBody className="space-y-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {agency.name}
                      </h2>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    {agency.description ? (
                      <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {agency.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
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
                  </div>
                </div>

                <div className="grid gap-4 text-sm md:grid-cols-3">
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
                </div>

                <Input
                  label="Decision reason"
                  placeholder="Required before approving or rejecting"
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
      ) : null}

      {activeTab === "approved" ? (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Approved agencies
        </h2>
        {approvedAgencies.length === 0 ? (
          <EmptyState
            title="No approved agencies"
            description="Approved agencies will appear here after review."
          />
        ) : (
          <div className="space-y-4">
            {approvedAgencies.map((agency) => (
              <Card key={agency.agency_id}>
                <CardBody className="space-y-4">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {agency.name}
                        </h3>
                        <Badge>Approved</Badge>
                      </div>
                      {agency.description ? (
                        <p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {agency.description}
                        </p>
                      ) : null}
                      {agency.status_reason ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Last decision reason: {agency.status_reason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/agencies/${agency.agency_id}`}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                      >
                        View
                      </Link>
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
                    </div>
                  </div>
                  <Input
                    label="Decision reason"
                    placeholder="Required before revoking or suspending"
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
      ) : null}
    </div>
  );
}
