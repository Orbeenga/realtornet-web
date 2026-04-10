import type { Location } from "@/types";
import { Badge } from "@/components";

interface PropertyStaticMapProps {
  location?: Location | null;
}

export function PropertyStaticMap({ location }: PropertyStaticMapProps) {
  const locationName = [location?.neighborhood, location?.city, location?.state]
    .filter(Boolean)
    .join(", ");

  const hasCoordinates =
    typeof location?.latitude === "number" && typeof location?.longitude === "number";

  const mapUrl = hasCoordinates
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${location.latitude},${location.longitude}&zoom=15&size=600x300&markers=${location.latitude},${location.longitude},red`
    : null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Map
      </h2>
      {hasCoordinates && mapUrl ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapUrl}
            alt={locationName || "Property location map"}
            className="h-auto w-full"
          />
        </div>
      ) : (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-950/50">
          <svg
            className="h-10 w-10 text-gray-300 dark:text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Exact coordinates are not available for this listing
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The backend returned a location reference without latitude and longitude.
            </p>
          </div>
          {locationName ? <Badge variant="outline">{locationName}</Badge> : null}
        </div>
      )}
    </section>
  );
}
