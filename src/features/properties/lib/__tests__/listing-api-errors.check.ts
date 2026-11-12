/**
 * 422-to-form mapping regression check (DEF-U-SILENT-FORM-VALIDATION-001
 * fix 4): known server field errors route to their slots, keys with no
 * rendered slot route to a root summary, and nothing is set silently.
 *
 * Run: pnpm exec tsx src/features/properties/lib/__tests__/listing-api-errors.check.ts
 */
import {
  buildUnknownFieldSummary,
  LISTING_FORM_FIELD_KEYS,
  partitionFieldErrors,
} from "../listingApiErrors";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

const knownOnly = partitionFieldErrors(
  { year_built: ["Value error, year_built must be between 1950 and 2028"] },
  LISTING_FORM_FIELD_KEYS,
);
assert(knownOnly.known.length === 1, "in-schema key routes to its slot");
assert(knownOnly.unknown.length === 0, "in-schema key produces no summary entry");

const unknownOnly = partitionFieldErrors(
  { agency_id: ["field required"], latitude: ["out of range"] },
  LISTING_FORM_FIELD_KEYS,
);
assert(unknownOnly.known.length === 0, "out-of-schema keys route nowhere silent");
assert(unknownOnly.unknown.length === 2, "out-of-schema keys land in the summary set");

const mixed = partitionFieldErrors(
  { price: ["price must be greater than 0"], amenity_ids: ["invalid id"] },
  LISTING_FORM_FIELD_KEYS,
);
assert(
  mixed.known.length === 1 && mixed.known[0][0] === "price",
  "mixed errors keep the known key slotted",
);
assert(
  mixed.unknown.length === 1 && mixed.unknown[0][0] === "amenity_ids",
  "mixed errors keep the unknown key summarized",
);

const slotlessBoolean = partitionFieldErrors(
  { has_garden: ["invalid"] },
  LISTING_FORM_FIELD_KEYS,
);
assert(
  slotlessBoolean.unknown.length === 1,
  "schema key without a rendered slot routes to the summary",
);

const rootKey = partitionFieldErrors({ root: ["boom"] }, LISTING_FORM_FIELD_KEYS);
assert(rootKey.known.length === 1, "root key keeps its slot");

assert(buildUnknownFieldSummary([]) === null, "empty unknown set yields no summary");
assert(
  buildUnknownFieldSummary([["agency_id", ["field required"]]]) ===
    "Server rejected additional fields: agency_id: field required",
  "single unknown key formats with its first message",
);
assert(
  buildUnknownFieldSummary([
    ["agency_id", ["field required"]],
    ["latitude", ["out of range", "second"]],
  ]) === "Server rejected additional fields: agency_id: field required; latitude: out of range",
  "multiple unknown keys join with first messages only",
);
assert(
  buildUnknownFieldSummary([["odd", []]]) ===
    "Server rejected additional fields: odd: invalid value",
  "missing message falls back to invalid value",
);

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("listing-api-errors check passed");
