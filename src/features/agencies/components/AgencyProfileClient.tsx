"use client";

import Link from "next/link";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import {
  useAgencyAgents,
  useAgencyListings,
  useAgencyProfile,
} from "@/features/agencies/hooks";
import {
  AgencyAgentRoster,
  AgencyListingsGrid,
  AgencyProfileHeader,
} from "@/features/agencies/components";
import { ApiError } from "@/lib/api/client";

interface AgencyProfileClientProps {
  id: string;
}

function AgencyProfileSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-80 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function AgencyProfileClient({ id }: AgencyProfileClientProps) {
  const agencyQuery = useAgencyProfile(id);
  const agentsQuery = useAgencyAgents(id);
  const listingsQuery = useAgencyListings(id);

  if (agencyQuery.isLoading) {
    return <AgencyProfileSkeleton />;
  }

  if (agencyQuery.isError) {
    if (agencyQuery.error instanceof ApiError && agencyQuery.error.status === 404) {
      return (
        <EmptyState
          title="Agency not found"
          description="The agency profile may have been removed or is no longer available."
        />
      );
    }

    return (
      <ErrorState
        title="Could not load agency profile"
        message="There was a problem loading this agency. Please try again."
        onRetry={() => {
          void agencyQuery.refetch();
        }}
      />
    );
  }

  if (!agencyQuery.data) {
    return (
      <EmptyState
        title="Agency not found"
        description="The agency profile may have been removed or is no longer available."
      />
    );
  }

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

      <AgencyProfileHeader agency={agencyQuery.data} />

      <AgencyAgentRoster
        agents={agentsQuery.data ?? []}
        isLoading={agentsQuery.isLoading}
      />

      <AgencyListingsGrid
        properties={listingsQuery.data ?? []}
        isLoading={listingsQuery.isLoading}
      />
    </div>
  );
}
