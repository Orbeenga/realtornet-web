import type { Location } from "@/types";

export function formatLocationLabel(location?: Location | null) {
  return [location?.neighborhood, location?.city, location?.state]
    .filter(Boolean)
    .join(", ");
}

export function buildLocationLabelMap(locations: Location[] = []) {
  return new Map(
    locations
      .map((location) => [location.location_id, formatLocationLabel(location)] as const)
      .filter(([, label]) => label.length > 0),
  );
}
