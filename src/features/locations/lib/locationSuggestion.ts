import type { LocationSearchResult } from "@/types";

/* Shared transient-suggestion identity lives HERE ONLY (suggestionKey).
   Stable React key for suggestion rows, which carry no location_id. */

export function suggestionKey(location: LocationSearchResult): string {
  return `${location.display_name}|${location.latitude ?? ""}|${location.longitude ?? ""}`;
}
