/**
 * Discovery navigation regression check (transient search, Option B): a
 * picked suggestion navigates the state/city/neighborhood triple (precise
 * filter wins, keyword dropped); free text navigates ?search=; selection
 * matching is triple-exact with null-tolerant neighbourhoods.
 *
 * Run: pnpm exec tsx src/features/home/lib/__tests__/discovery-params.check.ts
 */
import {
  buildDiscoveryLocationParams,
  isSelectedSuggestion,
} from "../discoveryParams";
import { suggestionKey } from "../../../locations/lib/locationSuggestion";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

const full = { state: "lagos", city: "ikeja", neighborhood: "alausa" };
const noNeighborhood = { state: "oyo", city: "ibadan", neighborhood: null };

const picked = buildDiscoveryLocationParams({ queryText: "Ikeja", selection: full });
assert(picked.get("state") === "lagos", "pick navigates state");
assert(picked.get("city") === "ikeja", "pick navigates city");
assert(picked.get("neighborhood") === "alausa", "pick navigates neighborhood");
assert(picked.get("search") === null, "pick drops the keyword");
assert(picked.get("location_id") === null, "pick sends no location_id");

const pickedBare = buildDiscoveryLocationParams({ queryText: "Ibadan", selection: noNeighborhood });
assert(pickedBare.get("state") === "oyo", "pick without neighborhood navigates state/city");
assert(pickedBare.get("neighborhood") === null, "absent neighborhood sends no param");

const typed = buildDiscoveryLocationParams({ queryText: "  duplex  ", selection: null });
assert(typed.get("search") === "duplex", "free text navigates trimmed ?search=");
assert(typed.get("state") === null, "free text sends no triple");

const empty = buildDiscoveryLocationParams({ queryText: "   ", selection: null });
assert([...empty.keys()].length === 0, "blank text without pick navigates nothing");

assert(isSelectedSuggestion(null, full) === false, "no selection never matches");
assert(isSelectedSuggestion(full, full) === true, "exact triple matches");
assert(
  isSelectedSuggestion(full, { ...full, city: "surulere" }) === false,
  "differing city does not match",
);
assert(
  isSelectedSuggestion({ state: "oyo", city: "ibadan" }, noNeighborhood) === true,
  "missing neighborhood equals explicit null",
);

assert(
  suggestionKey({
    state: "oyo",
    city: "ibadan",
    neighborhood: null,
    latitude: 7.4,
    longitude: 3.9,
    display_name: "ibadan, oyo",
  }) === "ibadan, oyo|7.4|3.9",
  "suggestion key is display_name plus coordinates",
);
assert(
  suggestionKey({
    state: "oyo",
    city: "ibadan",
    display_name: "ibadan, oyo",
  }) ===
    suggestionKey({
      state: "oyo",
      city: "ibadan",
      display_name: "ibadan, oyo",
    }),
  "suggestion key is stable without coordinates",
);

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("discovery-params check passed");
