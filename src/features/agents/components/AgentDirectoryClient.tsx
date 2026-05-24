"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components";
import { useAgencies } from "@/features/agencies/hooks";
import {
  isPublicDisplayableAgent,
  resolveAgentDisplayName,
} from "@/features/agents/lib/agentDirectoryCompleteness";
import { useAgentDirectory, useVisibleAgentStats } from "@/features/agents/hooks";
import { useLocations } from "@/features/properties/hooks";
import { useIdleHydration } from "@/lib/useIdleHydration";
import type { Agent, Location } from "@/types";

function readNumberParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  agencyId,
  agencyName,
  listingCount,
  averageRating,
  reviewCount,
}: {
  agent: Agent;
  agencyId?: number | null;
  agencyName?: string | null;
  listingCount?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
}) {
  const displayName = resolveAgentDisplayName(agent);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const extended = agent as Agent & {
    phone_number?: string | null;
    is_verified?: boolean;
  };

  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {initials || "A"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-gray-950 dark:text-white">
              {displayName}
            </h2>
            {extended.is_verified === true ? <Badge>Verified</Badge> : null}
          </div>
          {typeof agencyId === "number" && agencyName ? (
            <Link
              href={`/agencies/${agencyId}`}
              prefetch={false}
              className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
            >
              {agencyName}
            </Link>
          ) : null}
          {agent.specialization ? (
            <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {agent.specialization}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        {typeof listingCount === "number" ? (
          <p>
            {listingCount} active listing{listingCount === 1 ? "" : "s"}
          </p>
        ) : null}
        {typeof reviewCount === "number" && reviewCount > 0 && typeof averageRating === "number" ? (
          <p className="font-semibold text-gray-950 dark:text-white">
            {averageRating.toFixed(1)} rating
          </p>
        ) : null}
        {extended.phone_number?.trim() ? (
          <p>{extended.phone_number}</p>
        ) : null}
      </div>

      {agent.years_experience != null ? (
        <Badge variant="outline" className="mt-4 w-fit">
          {agent.years_experience} years experience
        </Badge>
      ) : null}

      <div className="mt-auto pt-5">
        <Link
          href={`/agents/${agent.profile_id}`}
          prefetch={false}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}

export function AgentDirectoryClient({
  initialData,
}: {
  initialData?: Agent[] | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrateFilterOptions = useIdleHydration({ delay: 1_800 });
  const hydrateStats = useIdleHydration({ delay: 8_000 });
  const selectedAgencyId = readNumberParam(searchParams.get("agency_id"));
  const selectedLocationId = readNumberParam(searchParams.get("location_id"));
  const agentsQuery = useAgentDirectory(
    {
      agency_id: selectedAgencyId,
      location_id: selectedLocationId,
      limit: 24,
    },
    initialData,
  );
  const agenciesQuery = useAgencies(hydrateFilterOptions);
  const locationsQuery = useLocations(hydrateFilterOptions);
  const agencyById = useMemo(
    () => new Map((agenciesQuery.data ?? []).map((agency) => [agency.agency_id, agency])),
    [agenciesQuery.data],
  );
  const displayableAgents = useMemo(() => {
    return (agentsQuery.data ?? []).filter((agent) => isPublicDisplayableAgent(agent));
  }, [agentsQuery.data]);
  const statsByProfileId = useVisibleAgentStats(
    displayableAgents.slice(0, 9),
    hydrateStats && displayableAgents.length > 0,
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

      {!agentsQuery.isLoading && !agentsQuery.isError && displayableAgents.length === 0 ? (
        <EmptyState
          title="No agents found"
          description="Try another agency or location filter."
        />
      ) : null}

      {displayableAgents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayableAgents.map((agent) => {
            const agency =
              typeof agent.agency_id === "number"
                ? agencyById.get(agent.agency_id)
                : undefined;
            const stats = statsByProfileId.get(agent.profile_id);

            const agentAgencyName =
              (agent as Agent & { agency_name?: string | null }).agency_name ?? agency?.name;

            return (
              <AgentCard
                key={agent.profile_id}
                agent={agent}
                agencyId={agent.agency_id}
                agencyName={agentAgencyName}
                listingCount={stats?.isError ? null : stats?.listingCount}
                averageRating={stats?.isError ? null : stats?.averageRating}
                reviewCount={stats?.isError ? null : stats?.reviewCount}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
