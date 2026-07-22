"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentListingsByStatus } from "@/features/agents/hooks/useAgentStatsDrillDown";
import { StatsDrillDownShell } from "@/features/agents/components/stats/StatsDrillDownShell";
import { StatsDrillDownTable } from "@/features/agents/components/stats/StatsDrillDownTable";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

export default function ListingsByStatusDrillDownPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? undefined;
  const pendingOnly = searchParams.get("pending") === "1";
  const { data, isLoading, isError, refetch } = useAgentListingsByStatus(
    { status, pendingOnly },
    Boolean(user),
  );

  const title = useMemo(() => {
    if (status) return `Listings — ${status.replace(/_/g, " ")}`;
    if (pendingOnly) return "Pending listings";
    return "Listings by status";
  }, [pendingOnly, status]);

  const columns = useMemo(
    () => [
      { key: "title", label: "Title" },
      { key: "property_type", label: "Type" },
      { key: "moderation_status", label: "Status" },
      {
        key: "created_at",
        label: "Created",
        render: (row: Record<string, unknown>) =>
          new Date(String(row.created_at)).toLocaleDateString(),
      },
    ],
    [],
  );

  return (
    <StatsDrillDownShell
      title={title}
      countLabel={data ? String(data.count) : undefined}
      description="Your listings grouped by moderation status."
    >
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState
          title="Could not load listings"
          message="There was a problem loading your listing feed."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}
      {!isLoading && !isError && (!data?.items || data.items.length === 0) ? (
        <EmptyState title="No listings found" description="" />
      ) : null}
      {data && data.items && data.items.length > 0 ? (
        <StatsDrillDownTable
          rows={data.items}
          columns={columns}
          getRowKey={(row) => row.property_id}
          searchPlaceholder="Search listings…"
        />
      ) : null}
    </StatsDrillDownShell>
  );
}
