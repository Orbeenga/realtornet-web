import { EmptyState, PropertyCardSkeleton } from "@/components";
import { PropertyCard } from "@/features/properties/components";
import { isVerifiedModerationStatus } from "@/features/properties/lib/moderation";
import type { Property } from "@/types";

interface AgencyListingsGridProps {
  properties?: Property[];
  isLoading?: boolean;
}

export function AgencyListingsGrid({
  properties = [],
  isLoading = false,
}: AgencyListingsGridProps) {
  const activeProperties = properties.filter(
    (property) =>
      isVerifiedModerationStatus(property.moderation_status) &&
      (property.listing_status === "active" ||
        property.listing_status === "available"),
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Agency Listings
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Browse the public portfolio managed by this agency.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {!isLoading && activeProperties.length === 0 ? (
        <EmptyState
          title="No listings for this agency"
          description="This agency does not have any public property listings yet."
        />
      ) : null}

      {!isLoading && activeProperties.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {activeProperties.map((property) => (
            <PropertyCard key={property.property_id} property={property} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
