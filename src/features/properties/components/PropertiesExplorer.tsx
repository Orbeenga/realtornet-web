"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { PropertyFilters } from "@/features/properties/components/PropertyFilters";
import { SearchBar } from "@/features/properties/components/SearchBar";
import { useProperties } from "@/features/properties/hooks";
import { PropertyCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import type { Property } from "@/types";

const PAGE_SIZE = 12;

export function PropertiesExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const properties: Property[] = data ?? [];
  const total = properties.length;

  return (
    <div>
      <SearchBar />

      <div className="flex gap-8">
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-24">
            <PropertyFilters />
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
