"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import { useAgentListings, useAgentProfile, useAgentStats } from "@/features/agents/hooks";
import { AgentListingsGrid } from "@/features/agents/components/AgentListingsGrid";
import { AgentProfileHeader } from "@/features/agents/components/AgentProfileHeader";
import { ApiError } from "@/lib/api/client";

interface AgentProfileClientProps {
  id: string;
}

const ReviewSection = dynamic(
  () =>
    import("@/features/reviews/ReviewSection").then(
      (module) => module.ReviewSection,
    ),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-2xl" />,
  },
);

function AgentProfileSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-80 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function readStatValue(
  stats: Record<string, unknown> | undefined,
  keys: string[],
) {
  for (const key of keys) {
    const value = stats?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function AgentProfileClient({ id }: AgentProfileClientProps) {
  const agentQuery = useAgentProfile(id);
  const listingsQuery = useAgentListings(id);
  const statsQuery = useAgentStats(id);

  if (agentQuery.isLoading) {
    return <AgentProfileSkeleton />;
  }

  if (agentQuery.isError) {
    if (agentQuery.error instanceof ApiError && agentQuery.error.status === 404) {
      return (
        <EmptyState
          title="Agent not found"
          description="The agent profile may have been removed or is no longer available."
        />
      );
    }

    return (
      <ErrorState
        title="Could not load agent profile"
        message="There was a problem loading this agent. Please try again."
        onRetry={() => {
          void agentQuery.refetch();
        }}
      />
    );
  }

  if (!agentQuery.data) {
    return (
      <EmptyState
        title="Agent not found"
        description="The agent profile may have been removed or is no longer available."
      />
    );
  }

  const fullName =
    agentQuery.data.company_name ||
    "This agent";
  const stats = statsQuery.data;
  const totalListings =
    readStatValue(stats, ["total_listings", "listing_count", "active_listings"]) ??
    listingsQuery.data?.length ??
    null;
  const averageRating = readStatValue(stats, ["average_rating", "avg_rating"]);
  const inquiryCount = readStatValue(stats, ["inquiry_count", "total_inquiries"]);

  const statCards = [
    {
      label: "Total listings",
      value: totalListings,
      formatter: (value: number) => value.toLocaleString(),
    },
    {
      label: "Average rating",
      value: averageRating,
      formatter: (value: number) => value.toFixed(1),
    },
    {
      label: "Inquiries",
      value: inquiryCount,
      formatter: (value: number) => value.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-8">
      <Link
        href="/agencies"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to agencies
      </Link>

      <AgentProfileHeader agent={agentQuery.data} />

      <section
        aria-label="Agent performance summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
          >
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
              {statsQuery.isLoading
                ? "..."
                : typeof stat.value === "number"
                  ? stat.formatter(stat.value)
                  : "Not recorded"}
            </p>
          </div>
        ))}
      </section>

      <AgentListingsGrid
        agentName={fullName}
        properties={listingsQuery.data ?? []}
        isLoading={listingsQuery.isLoading}
        isError={listingsQuery.isError}
        errorMessage={
          listingsQuery.error instanceof ApiError && typeof listingsQuery.error.detail === "string"
            ? listingsQuery.error.detail
            : "There was a problem loading this agent's listings."
        }
        onRetry={() => {
          void listingsQuery.refetch();
        }}
      />

      <ReviewSection target="agent" targetId={agentQuery.data.profile_id} />
    </div>
  );
}
