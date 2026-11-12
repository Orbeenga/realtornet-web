import type { Location } from "@/types";

/* Shared cascade unique-match rule lives HERE ONLY (findUniqueStateCityMatch).
   Returns the row iff exactly one catalogue row matches a state+city pair. */

export function findUniqueStateCityMatch(
  rows: readonly Location[] | null | undefined,
  state: string,
  city: string,
): Location | null {
  if (!rows || !state || !city) {
    return null;
  }

  let found: Location | null = null;

  for (const row of rows) {
    if (row.state === state && row.city === city) {
      if (found) {
        return null;
      }

      found = row;
    }
  }

  return found;
}
