/**
 * Cascade unique-match regression check (DEF-U-LOC-HIERARCHY-001 fix 1):
 * findUniqueStateCityMatch returns the row iff exactly one catalogue row
 * matches a state+city pair, otherwise null. The cascade auto-attaches only
 * on a unique match and never guesses on zero or multiple matches.
 *
 * Run: pnpm exec tsx src/features/locations/lib/__tests__/cascade-match.check.ts
 */
import type { Location } from "@/types";
import { findUniqueStateCityMatch } from "../cascadeMatch";

function makeLocation(
  locationId: number,
  state: string,
  city: string,
  neighborhood: string | null = null,
): Location {
  return {
    location_id: locationId,
    state,
    city,
    neighborhood,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

const lagosRow = makeLocation(111, "lagos", "ibeju lekki");
const abujaPlain = makeLocation(101, "federal capital territory", "municipal area council");
const abujaGarki = makeLocation(
  102,
  "federal capital territory",
  "municipal area council",
  "garki ii",
);
const oyoRow = makeLocation(112, "oyo", "ìbàdàn");

assert(findUniqueStateCityMatch(null, "lagos", "ibeju lekki") === null, "null rows -> null");
assert(
  findUniqueStateCityMatch(undefined, "lagos", "ibeju lekki") === null,
  "undefined rows -> null",
);
assert(findUniqueStateCityMatch([], "lagos", "ibeju lekki") === null, "zero rows -> null (no guess)");
assert(findUniqueStateCityMatch([lagosRow], "", "ibeju lekki") === null, "empty state -> null");
assert(findUniqueStateCityMatch([lagosRow], "lagos", "") === null, "empty city -> null");
assert(
  findUniqueStateCityMatch([lagosRow], "lagos", "ibeju lekki")?.location_id === 111,
  "single matching row resolves",
);
assert(
  findUniqueStateCityMatch([lagosRow, oyoRow], "oyo", "ìbàdàn")?.location_id === 112,
  "single match among non-matches resolves",
);
assert(
  findUniqueStateCityMatch([abujaPlain, abujaGarki], "federal capital territory", "municipal area council") ===
    null,
  "two rows same pair (different neighbourhoods) -> null (ambiguous)",
);
assert(
  findUniqueStateCityMatch([lagosRow, lagosRow], "lagos", "ibeju lekki") === null,
  "duplicate rows same pair -> null (ambiguous)",
);
assert(
  findUniqueStateCityMatch([lagosRow, oyoRow], "lagos", "ìbàdàn") === null,
  "cross-pair state/city mix does not match",
);
assert(
  findUniqueStateCityMatch([lagosRow], "Lagos", "ibeju lekki") === null,
  "matching is exact (same contract as getLocationIdForSelection)",
);
assert(
  findUniqueStateCityMatch([abujaGarki], "federal capital territory", "municipal area council")
    ?.neighborhood === "garki ii",
  "unique match preserves its neighbourhood for adoption",
);

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("cascade-match check passed");
