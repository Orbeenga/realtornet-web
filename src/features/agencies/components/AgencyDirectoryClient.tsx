"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, Input, Skeleton } from "@/components";
import { useAgencies, useVisibleAgencyStats } from "@/features/agencies/hooks";
import type { Agency } from "@/types";

const PAGE_SIZE = 9;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AgencyDirectoryCard({
  agency,
  listingCount,
  agentCount,
  statsLoading,
}: {
  agency: Agency;
  listingCount: number;
  agentCount: number;
  statsLoading: boolean;
}) {
  const initials = getInitials(agency.name);

  return (
    <Link href={`/agencies/${agency.agency_id}`} className="block">
      <Card hoverable className="h-full">
        <CardBody className="flex h-full flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-base font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              {agency.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agency.logo_url} alt={agency.name} className="h-full w-full object-cover" />
              ) : (
                initials || "AG"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="line-clamp-1 text-base font-semibold text-gray-900 dark:text-white">
                  {agency.name}
                </h2>
                {agency.is_verified ? <Badge>Verified</Badge> : null}
              </div>
              {agency.address ? (
                <p className="mt-1 line-clamp-1 text-sm text-gray-500 dark:text-gray-400">
                  {agency.address}
                </p>
              ) : null}
            </div>
          </div>

          {agency.description ? (
            <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-gray-600 dark:text-gray-300">
              {agency.description}
            </p>
          ) : (
            <p className="min-h-[4.5rem] text-sm leading-6 text-gray-500 dark:text-gray-400">
              Agency profile details are being prepared.
            </p>
          )}

          <div className="mt-auto grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Listings</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {statsLoading ? "..." : listingCount}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Agents</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {statsLoading ? "..." : agentCount}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

export function AgencyDirectoryClient({ compact = false }: { compact?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const agenciesQuery = useAgencies();

  const approvedAgencies = useMemo(
    () => (agenciesQuery.data ?? []).filter((agency) => agency.status === "approved"),
    [agenciesQuery.data],
  );

  const filteredAgencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return approvedAgencies;
    }

    return approvedAgencies.filter((agency) =>
      [agency.name, agency.description, agency.address]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [approvedAgencies, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAgencies.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleAgencies = filteredAgencies.slice(
    compact ? 0 : (safePage - 1) * PAGE_SIZE,
    compact ? 3 : safePage * PAGE_SIZE,
  );
  const statsByAgencyId = useVisibleAgencyStats(visibleAgencies);

  if (agenciesQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {Array.from({ length: compact ? 3 : 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (agenciesQuery.isError) {
    return (
      <ErrorState
        title="Could not load agencies"
        message="There was a problem loading the agency directory."
        onRetry={() => {
          void agenciesQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!compact ? (
        <div className="max-w-md">
          <Input
            label="Search agencies"
            placeholder="Search by name, address, or description"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      ) : null}

      {visibleAgencies.length === 0 ? (
        <EmptyState
          title="No agencies found"
          description="Try a different search or check back as new agencies are approved."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleAgencies.map((agency) => {
            const stats = statsByAgencyId.get(agency.agency_id);

            return (
              <AgencyDirectoryCard
                key={agency.agency_id}
                agency={agency}
                listingCount={stats?.listingCount ?? 0}
                agentCount={stats?.agentCount ?? 0}
                statsLoading={stats?.isLoading ?? true}
              />
            );
          })}
        </div>
      )}

      {!compact && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
