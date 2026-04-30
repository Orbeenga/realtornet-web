"use client";

import Link from "next/link";
import { EmptyState, ErrorState, PropertyCardSkeleton } from "@/components";
import { PropertyCard } from "@/features/properties/components/PropertyCard";
import { useFeaturedProperties, useLocations } from "@/features/properties/hooks";
import { buildLocationLabelMap } from "@/features/properties/lib/locationLabels";

export function FeaturedPropertiesSection() {
  const featuredQuery = useFeaturedProperties(3);
  const locationsQuery = useLocations();
  const properties = featuredQuery.data ?? [];
  const locationLabels = buildLocationLabelMap(locationsQuery.data ?? []);

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Featured listings
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            Recent verified homes selected for public discovery.
          </p>
        </div>
        <Link
          href="/properties"
          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          See all listings
        </Link>
      </div>

      {featuredQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {featuredQuery.isError ? (
        <ErrorState
          title="Could not load featured listings"
          message="There was a problem loading featured properties."
          onRetry={() => {
            void featuredQuery.refetch();
          }}
        />
      ) : null}

      {!featuredQuery.isLoading && !featuredQuery.isError && properties.length === 0 ? (
        <EmptyState
          title="No featured listings yet"
          description="Verified featured listings will appear here as agencies publish them."
        />
      ) : null}

      {!featuredQuery.isLoading && !featuredQuery.isError && properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.property_id}
              property={property}
              locationLabel={
                property.location_id ? locationLabels.get(property.location_id) : undefined
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
