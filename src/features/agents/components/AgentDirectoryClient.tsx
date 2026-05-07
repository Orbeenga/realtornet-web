"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components";
import { useAgencies } from "@/features/agencies/hooks";
import { useAgentDirectory, useVisibleAgentStats } from "@/features/agents/hooks";
import { useLocations } from "@/features/properties/hooks";
import { useIdleHydration } from "@/lib/useIdleHydration";
import type { Agent, Agency, Location } from "@/types";

function readNumberParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getAgentName(agent: Agent) {
  return agent.company_name?.trim() || `Agent #${agent.profile_id}`;
}

function getLocationLabel(location: Location) {
  return [location.neighborhood, location.city, location.state]
    .filter(Boolean)
    .join(", ");
}

function AgentDirectorySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-52 rounded-lg" />
      ))}
    </div>
  );
}

function AgentCard({
  agent,
  agency,
  listingCount,
  averageRating,
}: {
  agent: Agent;
  agency?: Agency;
  listingCount?: number | null;
  averageRating?: number | null;
}) {
  const name = getAgentName(agent);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Link
      href={`/agents/${agent.profile_id}`}
      prefetch={false}
      className="block rounded-lg border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-700"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {initials || "A"}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-gray-950 dark:text-white">
            {name}
          </h2>
          <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">
            {agency?.name ?? "Independent agent"}
          </p>
          {agent.specialization ? (
            <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {agent.specialization}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Listings
          </p>
          <p className="mt-1 font-semibold text-gray-950 dark:text-white">
            {listingCount ?? "Not recorded"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Rating
          </p>
          <p className="mt-1 font-semibold text-gray-950 dark:text-white">
            {typeof averageRating === "number" ? averageRating.toFixed(1) : "No reviews"}
          </p>
        </div>
      </div>

      {agent.years_experience != null ? (
        <Badge variant="outline" className="mt-4">
          {agent.years_experience} years experience
        </Badge>
      ) : null}
    </Link>
  );
}

export function AgentDirectoryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrateFilterOptions = useIdleHydration({ delay: 1_800 });
  const hydrateStats = useIdleHydration({ delay: 8_000 });
  const selectedAgencyId = readNumberParam(searchParams.get("agency_id"));
  const selectedLocationId = readNumberParam(searchParams.get("location_id"));
  const agentsQuery = useAgentDirectory({
    agency_id: selectedAgencyId,
    location_id: selectedLocationId,
    limit: 24,
  });
  const agenciesQuery = useAgencies(hydrateFilterOptions);
  const locationsQuery = useLocations(hydrateFilterOptions);
  const agents = agentsQuery.data ?? [];
  const statsByProfileId = useVisibleAgentStats(
    agents.slice(0, 9),
    hydrateStats && agents.length > 0,
  );
  const agencyById = new Map(
    (agenciesQuery.data ?? []).map((agency) => [agency.agency_id, agency]),
  );

  const setFilter = (key: "agency_id" | "location_id", value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
          Agents
        </h1>
        <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
          Browse verified agent profiles by agency affiliation and listing location.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Agency
          <select
            value={selectedAgencyId ?? ""}
            onChange={(event) => setFilter("agency_id", event.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          >
            <option value="">All agencies</option>
            {!hydrateFilterOptions ? (
              <option value="" disabled>
                Loading agencies...
              </option>
            ) : null}
            {(agenciesQuery.data ?? []).map((agency) => (
              <option key={agency.agency_id} value={agency.agency_id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Listing location
          <select
            value={selectedLocationId ?? ""}
            onChange={(event) => setFilter("location_id", event.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
          >
            <option value="">All locations</option>
            {!hydrateFilterOptions ? (
              <option value="" disabled>
                Loading locations...
              </option>
            ) : null}
            {(locationsQuery.data ?? []).map((location) => (
              <option key={location.location_id} value={location.location_id}>
                {getLocationLabel(location)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {agentsQuery.isLoading ? <AgentDirectorySkeleton /> : null}

      {!agentsQuery.isLoading && agentsQuery.isError ? (
        <ErrorState
          title="Could not load agents"
          message="There was a problem loading the agent directory."
          onRetry={() => {
            void agentsQuery.refetch();
          }}
        />
      ) : null}

      {!agentsQuery.isLoading && !agentsQuery.isError && agents.length === 0 ? (
        <EmptyState
          title="No agents found"
          description="Try another agency or location filter."
        />
      ) : null}

      {agents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const stats = statsByProfileId.get(agent.profile_id);

            return (
              <AgentCard
                key={agent.profile_id}
                agent={agent}
                agency={
                  typeof agent.agency_id === "number"
                    ? agencyById.get(agent.agency_id)
                    : undefined
                }
                listingCount={stats?.isError ? null : stats?.listingCount}
                averageRating={stats?.isError ? null : stats?.averageRating}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
