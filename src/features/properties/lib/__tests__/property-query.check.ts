/**
 * Property query serialization check (transient search, Option B):
 * buildPropertyQuery serializes the state/city/neighborhood triple
 * alongside existing filters and skips absent values.
 *
 * Run: pnpm exec tsx src/features/properties/lib/__tests__/property-query.check.ts
 */
import { buildPropertyQuery } from "../../hooks/useProperties";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

const triple = new URLSearchParams(
  buildPropertyQuery({ state: "lagos", city: "ikeja", neighborhood: "alausa" }).slice(1),
);
assert(triple.get("state") === "lagos", "state serializes");
assert(triple.get("city") === "ikeja", "city serializes");
assert(triple.get("neighborhood") === "alausa", "neighborhood serializes");

const partial = new URLSearchParams(
  buildPropertyQuery({ state: "oyo", city: "ibadan" }).slice(1),
);
assert(partial.get("state") === "oyo", "partial triple serializes present parts");
assert(partial.get("neighborhood") === null, "absent neighborhood sends no param");

const mixed = new URLSearchParams(
  buildPropertyQuery({ search: "duplex", location_id: 111, state: "lagos" }).slice(1),
);
assert(mixed.get("search") === "duplex", "search still serializes");
assert(mixed.get("location_id") === "111", "location_id still serializes");
assert(mixed.get("state") === "lagos", "triple composes with existing filters");

assert(buildPropertyQuery({}) === "", "empty filters serialize to empty query");
assert(
  buildPropertyQuery({ state: "", city: undefined }).includes("state") === false,
  "empty values are skipped",
);

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("property-query check passed");
