"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentAgencyMemberships } from "@/features/agents/hooks/useAgentStatsDrillDown";
import { StatsDrillDownShell } from "@/features/agents/components/stats/StatsDrillDownShell";
import { StatsDrillDownTable } from "@/features/agents/components/stats/StatsDrillDownTable";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

export default function AgencyMembershipsDrillDownPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAgentAgencyMemberships(Boolean(user));

  const columns = useMemo(
    () => [
      { key: "agency_name", label: "Agency" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
      {
        key: "joined_at",
        label: "Joined",
        render: (row: Record<string, unknown>) =>
          new Date(String(row.joined_at)).toLocaleDateString(),
      },
    ],
    [],
  );

  return (
    <StatsDrillDownShell
      title="Agency memberships"
      countLabel={data ? String(data.count) : undefined}
      description="Your agency memberships with roles and statuses."
    >
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState
          title="Could not load memberships"
          message="There was a problem loading your membership roster."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}
      {!isLoading && !isError && data?.memberships.length === 0 ? (
        <EmptyState title="No agency memberships" description="" />
      ) : null}
      {data && data.memberships.length > 0 ? (
        <StatsDrillDownTable
          rows={data.memberships}
          columns={columns}
          getRowKey={(row) => row.membership_id}
          searchPlaceholder="Search memberships…"
        />
      ) : null}
    </StatsDrillDownShell>
  );
}
