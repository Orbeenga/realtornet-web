import { EmptyState, PropertyCardSkeleton } from "@/components";
import { PropertyCard } from "@/features/properties/components";
import type { Property } from "@/types";

interface AgentListingsGridProps {
  agentName: string;
  properties?: Property[];
  isLoading?: boolean;
}

export function AgentListingsGrid({
  agentName,
  properties = [],
  isLoading = false,
}: AgentListingsGridProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Listings by {agentName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Browse the active portfolio for this agent.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {!isLoading && properties.length === 0 ? (
        <EmptyState
          title="No active listings"
          description="This agent does not have any active property listings yet."
        />
      ) : null}

      {!isLoading && properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.property_id} property={property} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
