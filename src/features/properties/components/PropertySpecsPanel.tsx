import type { Property } from "@/types";
import { Badge } from "@/components";

interface PropertySpecsPanelProps {
  property: Property;
  propertyTypeName?: string | null;
  locationLabel?: string | null;
}

const listingTypeLabels: Record<string, string> = {
  sale: "For Sale",
  rent: "For Rent",
  lease: "For Lease",
};

const listingStatusLabels: Record<string, string> = {
  available: "Available",
  active: "Active",
  sold: "Sold",
  pending: "Pending",
};

function formatBooleanFeature(value: boolean | null, label: string) {
  return value ? label : "Not listed";
}

export function PropertySpecsPanel({
  property,
  propertyTypeName,
  locationLabel,
}: PropertySpecsPanelProps) {
  const specs = [
    { label: "Bedrooms", value: property.bedrooms ?? "Not specified" },
    { label: "Bathrooms", value: property.bathrooms ?? "Not specified" },
    { label: "Size", value: property.property_size ? `${property.property_size} sqm` : "Not specified" },
    { label: "Property type", value: propertyTypeName ?? "Not available" },
    {
      label: "Location",
      value: locationLabel ?? (property.location_id ? `Location #${property.location_id}` : "Not specified"),
    },
    { label: "Year built", value: property.year_built ?? "Not specified" },
    { label: "Parking", value: property.parking_spaces ?? "Not specified" },
    { label: "Garden", value: formatBooleanFeature(property.has_garden, "Available") },
    { label: "Security", value: formatBooleanFeature(property.has_security, "Available") },
    {
      label: "Swimming pool",
      value: formatBooleanFeature(property.has_swimming_pool, "Available"),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Property details
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Live specs from the backend listing record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">
            {listingStatusLabels[property.listing_status] ?? property.listing_status}
          </Badge>
          <Badge variant="outline">
            {listingTypeLabels[property.listing_type] ?? property.listing_type}
          </Badge>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Description
        </h3>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          {property.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {spec.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {spec.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
