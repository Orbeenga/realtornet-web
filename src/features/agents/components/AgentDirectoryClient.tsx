"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState, ErrorState, Skeleton } from "@/components";
import { useAgencies } from "@/features/agencies/hooks";
import {
  isPublicDisplayableAgentDirectory,
} from "@/features/agents/lib/agentDirectoryCompleteness";
import { useAgentDirectory, useVisibleAgentStats } from "@/features/agents/hooks";
import { useIdleHydration } from "@/lib/useIdleHydration";
import { cn } from "@/lib/utils";
import type { AgentDirectoryResponse } from "@/types";

function readNumberParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  listingCount,
  averageRating,
  reviewCount,
}: {
  agent: AgentDirectoryResponse;
  listingCount?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
}) {
  const displayName = agent.display_name;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

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
          </div>
          {typeof agent.agency_id === "number" && agent.agency_name ? (
            <Link
              href={`/agencies/${agent.agency_id}`}
              prefetch={false}
              className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
            >
              {agent.agency_name}
            </Link>
          ) : null}
          {agent.bio ? (
            <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {agent.bio}
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
      </div>

      <div className="mt-auto pt-5">
        <Link
          href={`/agents/${agent.profile_id ?? ""}`}
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
  initialData?: AgentDirectoryResponse[] | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrateFilterOptions = useIdleHydration({ delay: 1_800 });
  const hydrateStats = useIdleHydration({ delay: 8_000 });
  const [search, setSearch] = useState("");
  const selectedAgencyId = readNumberParam(searchParams.get("agency_id"));
  const agentsQuery = useAgentDirectory(
    { limit: 24 },
    initialData,
  );
  const agenciesQuery = useAgencies(hydrateFilterOptions);
  const displayableAgents = useMemo(() => {
    const all = (agentsQuery.data ?? []).filter((agent) =>
      isPublicDisplayableAgentDirectory(agent),
    );
    const query = search.trim().toLowerCase();
    let filtered = all;
    if (query) {
      filtered = filtered.filter((agent) =>
        agent.display_name.toLowerCase().includes(query),
      );
    }
    if (typeof selectedAgencyId === "number") {
      filtered = filtered.filter((agent) => agent.agency_id === selectedAgencyId);
    }
    return filtered;
  }, [agentsQuery.data, selectedAgencyId, search]);
  const statsByProfileId = useVisibleAgentStats(
    displayableAgents.slice(0, 9),
    hydrateStats && displayableAgents.length > 0,
  );

  const setAgencyFilter = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set("agency_id", value);
    } else {
      nextParams.delete("agency_id");
    }

    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Verified agents
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
          Browse verified real estate agents
        </h1>
        <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
          Find the right agent by agency, location, or name.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <svg
            className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
            />
          </svg>
          <input
            type="text"
            aria-label="Search agents"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by agent name..."
            className={cn(
              "h-12 w-full rounded-xl border bg-white pl-12 pr-4 text-base text-gray-900 shadow-sm transition-shadow duration-150",
              "border-[1.5px] border-gray-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none focus:shadow-md",
              "placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500",
            )}
          />
        </div>
        <label className="min-w-0 flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
          <span className="sr-only">Agency</span>
          <select
            value={selectedAgencyId ?? ""}
            onChange={(event) => setAgencyFilter(event.target.value)}
            className="mt-0 block h-12 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
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
          title={search.trim() || typeof selectedAgencyId === "number" ? "No agents match your filters" : "No verified agents found"}
          description={
            search.trim() || typeof selectedAgencyId === "number"
              ? "Try clearing your search or selecting a different agency."
              : "Agents will appear here once they complete their public profiles."
          }
        />
      ) : null}

      {displayableAgents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayableAgents.map((agent) => {
            const stats = statsByProfileId.get(agent.profile_id ?? 0);

            return (
              <AgentCard
                key={agent.profile_id}
                agent={agent}
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
