import type { LocationSelection } from "@/types";

/* Shared discovery-navigation location rule lives HERE ONLY
   (buildDiscoveryLocationParams + isSelectedSuggestion). A picked
   suggestion navigates the state/city/neighborhood triple (precise filter
   wins, keyword dropped); free text navigates ?search=; neither navigates
   nothing. */

export interface DiscoveryLocationInput {
  queryText: string;
  selection: LocationSelection | null;
}

export function buildDiscoveryLocationParams(input: DiscoveryLocationInput): URLSearchParams {
  const params = new URLSearchParams();

  if (input.selection) {
    params.set("state", input.selection.state);
    params.set("city", input.selection.city);
    if (input.selection.neighborhood) {
      params.set("neighborhood", input.selection.neighborhood);
    }
    return params;
  }

  if (input.queryText.trim()) {
    params.set("search", input.queryText.trim());
  }

  return params;
}

export function isSelectedSuggestion(
  selection: LocationSelection | null,
  suggestion: { state: string; city: string; neighborhood?: string | null },
): boolean {
  if (!selection) {
    return false;
  }

  return (
    selection.state === suggestion.state &&
    selection.city === suggestion.city &&
    (selection.neighborhood ?? null) === (suggestion.neighborhood ?? null)
  );
}
