/**
 * Listing-location message regression check (DEF-U-SILENT-FORM-VALIDATION-001
 * fix 2): the location slot stays silent on pristine state, shows the
 * neighbourhood-commit guidance when state+city are set without a location
 * id, and otherwise passes the schema message through.
 *
 * Run: pnpm exec tsx src/features/properties/lib/__tests__/listing-location-error.check.ts
 */
import {
  LOCATION_COMMIT_MESSAGE,
  resolveLocationErrorMessage,
} from "../listingLocationError";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

const GENERIC = "Search for a location or select one from the catalogue";

assert(
  LOCATION_COMMIT_MESSAGE ===
    "Select a neighbourhood, or All neighbourhoods, to attach this location.",
  "commit message carries the exact approved wording",
);
assert(
  resolveLocationErrorMessage(GENERIC, { interacted: false, needsNeighborhoodCommit: false }) ===
    undefined,
  "pristine state renders no location error",
);
assert(
  resolveLocationErrorMessage(GENERIC, { interacted: false, needsNeighborhoodCommit: true }) ===
    undefined,
  "pristine state renders no error even when a commit is needed",
);
assert(
  resolveLocationErrorMessage(undefined, { interacted: true, needsNeighborhoodCommit: false }) ===
    undefined,
  "no schema error means no message after interaction",
);
assert(
  resolveLocationErrorMessage(GENERIC, { interacted: true, needsNeighborhoodCommit: true }) ===
    LOCATION_COMMIT_MESSAGE,
  "state+city without location id shows the commit guidance",
);
assert(
  resolveLocationErrorMessage(GENERIC, { interacted: true, needsNeighborhoodCommit: false }) ===
    GENERIC,
  "other location failures pass the schema message through",
);

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("listing-location-error check passed");
