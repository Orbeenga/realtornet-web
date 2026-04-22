"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { SearchBar } from "@/features/properties/components/SearchBar";
import { useProperties } from "@/features/properties/hooks";
import { PropertyCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import type { Property } from "@/types";

const PAGE_SIZE = 12;

const PropertyFilters = dynamic(
  () =>
    import("@/features/properties/components/PropertyFilters").then(
      (module) => module.PropertyFilters,
    ),
  {
    loading: () => <PropertyFiltersFallback />,
  },
);

function PropertyFiltersFallback() {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="h-4 w-20 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
      <div className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export function PropertiesExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [hydrateDesktopFilters, setHydrateDesktopFilters] = useState(false);

  const currentPage = Number(searchParams.get("page") ?? 1);

  const filters = {
    skip: (currentPage - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    search: searchParams.get("search") ?? undefined,
    listing_type: searchParams.get("listing_type") ?? undefined,
    listing_status: searchParams.get("listing_status") ?? undefined,
    min_price: searchParams.get("min_price")
      ? Number(searchParams.get("min_price"))
      : undefined,
    max_price: searchParams.get("max_price")
      ? Number(searchParams.get("max_price"))
      : undefined,
    bedrooms: searchParams.get("bedrooms")
      ? Number(searchParams.get("bedrooms"))
      : undefined,
  };

  const { data, isLoading, isError, refetch } = useProperties(filters);

  const properties: Property[] = (data ?? []).filter((property) => property.is_verified);
  const total = properties.length;

  useEffect(() => {
    // The sidebar is useful, but it is not required for the first paint of the
    // public listings feed. Hydrating it after mount trims work from the
    // initial route bundle without removing the desktop experience.
    setHydrateDesktopFilters(true);
  }, []);

  return (
    <div>
      <SearchBar />

      <div className="mb-4 lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobileFilters((current) => !current)}
          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-500/40 dark:hover:text-blue-300"
        >
          {showMobileFilters ? "Hide filters" : "Show filters"}
        </button>
      </div>

      {showMobileFilters ? (
        <div className="mb-6 lg:hidden">
          <PropertyFilters />
        </div>
      ) : null}

      <div className="flex gap-8">
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-24">
            {hydrateDesktopFilters ? <PropertyFilters /> : <PropertyFiltersFallback />}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Available properties
              </h2>
              {!isLoading ? (
                <p className="mt-0.5 text-sm text-gray-500">
                  {total > 0 ? `${total} listing${total !== 1 ? "s" : ""}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {isError ? (
            <ErrorState
              title="Could not load properties"
              message="Check your connection and try again."
              onRetry={() => refetch()}
            />
          ) : null}

          {!isLoading && !isError && properties.length === 0 ? (
            <EmptyState
              title="No properties found"
              description="Try adjusting your filters or check back later."
              action={{
                label: "Clear filters",
                onClick: () => router.push("/properties"),
              }}
            />
          ) : null}

          {!isLoading && !isError && properties.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {properties.map((property: Property) => (
                  <PropertyCard key={property.property_id} property={property} />
                ))}
              </div>
              {total > PAGE_SIZE ? (
                <div className="mt-10">
                  <Pagination
                    total={total}
                    pageSize={PAGE_SIZE}
                    currentPage={currentPage}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
