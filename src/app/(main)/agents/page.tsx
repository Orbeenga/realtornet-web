import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components";
import { AgentDirectoryClient } from "@/features/agents/components";
import { buildAgentDirectoryPath } from "@/features/agents/hooks/useAgentDirectory";
import { serverPublicApi } from "@/lib/api/serverPublic";
import type { Agent } from "@/types";

export const metadata: Metadata = {
  title: "Property Agents in Lagos",
  description: "Find verified real estate agents in Lagos on RealtorNet.",
  openGraph: {
    title: "Property Agents in Lagos | RealtorNet",
    description: "Find verified real estate agents in Lagos on RealtorNet.",
    url: "/agents",
    siteName: "RealtorNet",
    locale: "en_NG",
    type: "website",
  },
};

function AgentsPageFallback() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-28 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchValue(searchParams: SearchParams, key: string) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

function readNumberSearchValue(searchParams: SearchParams, key: string) {
  const value = readSearchValue(searchParams, key);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface AgentsPageProps {
  searchParams?: Promise<SearchParams>;
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialData = await serverPublicApi<Agent[]>(
    buildAgentDirectoryPath({
      agency_id: readNumberSearchValue(resolvedSearchParams, "agency_id"),
      location_id: readNumberSearchValue(resolvedSearchParams, "location_id"),
      limit: 24,
    }),
    60,
  );

  return (
    <Suspense fallback={<AgentsPageFallback />}>
      <AgentDirectoryClient initialData={initialData} />
    </Suspense>
  );
}
