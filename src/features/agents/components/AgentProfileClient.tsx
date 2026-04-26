"use client";

import Link from "next/link";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import { useAgentListings, useAgentProfile } from "@/features/agents/hooks";
import { AgentListingsGrid } from "@/features/agents/components/AgentListingsGrid";
import { AgentProfileHeader } from "@/features/agents/components/AgentProfileHeader";
import { ApiError } from "@/lib/api/client";

interface AgentProfileClientProps {
  id: string;
}

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

export function AgentProfileClient({ id }: AgentProfileClientProps) {
  const agentQuery = useAgentProfile(id);
  const listingsQuery = useAgentListings(id);

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

      <AgentListingsGrid
        agentName={fullName}
        properties={listingsQuery.data ?? []}
        isLoading={listingsQuery.isLoading}
      />
    </div>
  );
}
