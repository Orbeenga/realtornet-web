"use client";

import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentInquiryResponseRate } from "@/features/agents/hooks/useAgentStatsDrillDown";
import { StatsDrillDownShell } from "@/features/agents/components/stats/StatsDrillDownShell";
import { StatsDrillDownTable } from "@/features/agents/components/stats/StatsDrillDownTable";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

export default function InquiryResponseRateDrillDownPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAgentInquiryResponseRate(Boolean(user));

  const columns = useMemo(
    () => [
      { key: "property_title", label: "Listing" },
      { key: "property_id", label: "Property ID" },
      {
        key: "responded",
        label: "Responded",
        render: (row: Record<string, unknown>) => (row.responded ? "Yes" : "No"),
      },
      {
        key: "response_time_minutes",
        label: "Response time (min)",
        render: (row: Record<string, unknown>) =>
          row.response_time_minutes == null ? "—" : String(row.response_time_minutes),
      },
      {
        key: "created_at",
        label: "Received",
        render: (row: Record<string, unknown>) =>
          new Date(String(row.created_at)).toLocaleDateString(),
      },
    ],
    [],
  );

  return (
    <StatsDrillDownShell
      title="Inquiry response rate"
      countLabel={data ? `${Math.round(data.rate * 100)}%` : undefined}
      description={
        data
          ? `${data.responded} responded of ${data.total_inquiries} inquiries (${data.unresponded} unresponded).`
          : "Breakdown of inquiries received on your listings."
      }
    >
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState
          title="Could not load inquiry details"
          message="There was a problem loading your inquiry feed."
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}
      {!isLoading && !isError && (!data?.details || data.details.length === 0) ? (
        <EmptyState title="No inquiries yet" description="" />
      ) : null}
      {data && data.details && data.details.length > 0 ? (
        <StatsDrillDownTable
          rows={data.details}
          columns={columns}
          getRowKey={(row) => row.inquiry_id}
          searchPlaceholder="Search inquiries…"
        />
      ) : null}
    </StatsDrillDownShell>
  );
}
