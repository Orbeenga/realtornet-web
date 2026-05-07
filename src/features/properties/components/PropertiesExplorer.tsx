"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { useLocations, useProperties } from "@/features/properties/hooks";
import {
  restorePropertiesScrollPosition,
  savePropertiesScrollPosition,
} from "@/features/properties/lib/scrollRestoration";
import {
  parseListingStatus,
  parseListingType,
} from "@/features/properties/lib/propertyOptions";
import {
  MODERATION_STATUS,
  isVerifiedModerationStatus,
} from "@/features/properties/lib/moderation";
import { buildLocationLabelMap } from "@/features/properties/lib/locationLabels";
import { PropertyCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Pagination } from "@/components/Pagination";
import { useIdleHydration } from "@/lib/useIdleHydration";
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
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex gap-2">
        <div className="h-11 min-w-0 flex-1 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-11 w-28 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-11 w-24 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-11 w-32 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export function PropertiesExplorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hydrateLocationLabels = useIdleHydration({ delay: 2_400 });
  const hydrateCardEnhancements = useIdleHydration({ delay: 6_000 });
  const hasAttemptedScrollRestoreRef = useRef(false);

  const currentPage = Number(searchParams.get("page") ?? 1);
  const currentListUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  const filters = {
    skip: (currentPage - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    search: searchParams.get("search") ?? undefined,
    listing_type: parseListingType(searchParams.get("listing_type")),
    listing_status: parseListingStatus(searchParams.get("listing_status")),
    moderation_status: MODERATION_STATUS.verified,
    min_price: searchParams.get("min_price")
      ? Number(searchParams.get("min_price"))
      : undefined,
    max_price: searchParams.get("max_price")
      ? Number(searchParams.get("max_price"))
      : undefined,
    bedrooms: searchParams.get("bedrooms")
      ? Number(searchParams.get("bedrooms"))
      : undefined,
    property_type_id: searchParams.get("property_type_id")
      ? Number(searchParams.get("property_type_id"))
      : undefined,
  };

  const { data, isLoading, isError, refetch } = useProperties(filters);
  const locationsQuery = useLocations(hydrateLocationLabels);

  const properties: Property[] = (data ?? []).filter((property) =>
    isVerifiedModerationStatus(property.moderation_status),
  );
  const locationLabels = buildLocationLabelMap(locationsQuery.data ?? []);
  const total = properties.length;

  useEffect(() => {
    hasAttemptedScrollRestoreRef.current = false;
  }, [currentListUrl]);

  useEffect(() => {
    if (isLoading || hasAttemptedScrollRestoreRef.current) {
      return;
    }

    restorePropertiesScrollPosition(currentListUrl);
    hasAttemptedScrollRestoreRef.current = true;
  }, [currentListUrl, isLoading]);

  const handleNavigateToDetail = () => {
    savePropertiesScrollPosition(currentListUrl);
  };

  return (
    <div>
      <PropertyFilters />

      <div>
        <div className="min-w-0">
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
                  <PropertyCard
                    key={property.property_id}
                    property={property}
                    hydrateEnhancements={hydrateCardEnhancements}
                    locationLabel={
                      property.location_id
                        ? locationLabels.get(property.location_id)
                        : undefined
                    }
                    onNavigateToDetail={handleNavigateToDetail}
                  />
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
