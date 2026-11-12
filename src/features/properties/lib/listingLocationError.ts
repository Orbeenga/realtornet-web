/* Shared listing-location error message rule lives HERE ONLY
   (resolveLocationErrorMessage + LOCATION_COMMIT_MESSAGE).
   Decides which location message the form shows and when. */

export const LOCATION_COMMIT_MESSAGE =
  "Select a neighbourhood, or All neighbourhoods, to attach this location.";

interface LocationErrorOptions {
  interacted: boolean;
  needsNeighborhoodCommit: boolean;
}

export function resolveLocationErrorMessage(
  rawError: string | undefined,
  options: LocationErrorOptions,
): string | undefined {
  if (!options.interacted || !rawError) {
    return undefined;
  }

  if (options.needsNeighborhoodCommit) {
    return LOCATION_COMMIT_MESSAGE;
  }

  return rawError;
}
