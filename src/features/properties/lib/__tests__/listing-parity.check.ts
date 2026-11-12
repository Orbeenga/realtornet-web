/**
 * Listing parity regression check (Phase 2 fix 5): the Zod schema mirrors
 * the backend validators (bathrooms integer, year_built 1950..current+2),
 * the year max is computed from the clock, and the Pydantic "Value error, "
 * prefix is stripped for display.
 *
 * Run: pnpm exec tsx src/features/properties/lib/__tests__/listing-parity.check.ts
 */
import { listingFormSchema } from "../../components/ListingForm";
import { stripPydanticValuePrefix } from "../listingApiErrors";
import { getYearBuiltMax, YEAR_BUILT_MIN } from "../propertyOptions";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

const baseValid = {
  title: "Probe listing",
  description: "Probe description",
  price: 100,
  bedrooms: 1,
  bathrooms: 1,
  property_size: 10,
  listing_type: "sale",
  listing_status: "available",
  property_type_id: 1,
  location_id: 111,
  location_name: "",
  year_built: null,
  parking_spaces: null,
  has_garden: false,
  has_security: false,
  has_swimming_pool: false,
};

function issueFor(field: string, input: unknown): string | null {
  const result = listingFormSchema.safeParse(input);
  if (result.success) {
    return null;
  }

  return result.error.issues.find((issue) => issue.path[0] === field)?.message ?? null;
}

assert(listingFormSchema.safeParse(baseValid).success, "valid input passes");
assert(
  issueFor("bathrooms", { ...baseValid, bathrooms: 2.5 }) === "Bathrooms must be a whole number",
  "fractional bathrooms fail with the whole-number message",
);
assert(
  issueFor("bathrooms", { ...baseValid, bathrooms: 2 }) === null,
  "whole bathrooms pass",
);
assert(
  issueFor("bathrooms", { ...baseValid, bathrooms: -1 }) === "Bathrooms cannot be negative",
  "negative bathrooms keep the range message",
);

const maxYear = getYearBuiltMax();
assert(YEAR_BUILT_MIN === 1950, "year min mirrors the backend validator constant");
assert(
  issueFor("year_built", { ...baseValid, year_built: 1800 }) ===
    `Year built must be between 1950 and ${maxYear}`,
  "year below the range fails with the bounds message",
);
assert(
  issueFor("year_built", { ...baseValid, year_built: "1800" }) ===
    `Year built must be between 1950 and ${maxYear}`,
  "year below the range fails for string form input too",
);
assert(
  issueFor("year_built", { ...baseValid, year_built: maxYear + 1 }) ===
    `Year built must be between 1950 and ${maxYear}`,
  "year above the range fails with the bounds message",
);
assert(issueFor("year_built", { ...baseValid, year_built: 1950 }) === null, "range min passes");
assert(issueFor("year_built", { ...baseValid, year_built: maxYear }) === null, "range max passes");
assert(issueFor("year_built", { ...baseValid, year_built: "" }) === null, "blank year passes as null");
assert(issueFor("year_built", { ...baseValid, year_built: null }) === null, "null year passes");

assert(getYearBuiltMax(new Date("2026-06-15T12:00:00Z")) === 2028, "max derives from the clock");
assert(getYearBuiltMax(new Date("2027-01-01T00:00:00Z")) === 2029, "max rolls with the year");

assert(
  stripPydanticValuePrefix("Value error, year_built must be between 1950 and 2028") ===
    "year_built must be between 1950 and 2028",
  "422 prefix is stripped for display",
);
assert(stripPydanticValuePrefix("plain message") === "plain message", "plain text passes through");
assert(stripPydanticValuePrefix("") === "", "empty message passes through");

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}

console.log("listing-parity check passed");
