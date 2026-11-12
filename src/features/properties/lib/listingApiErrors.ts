/* Shared 422-to-form mapping rule lives HERE ONLY
   (partitionFieldErrors + buildUnknownFieldSummary + LISTING_FORM_FIELD_KEYS).
   Every server field error lands in its slot or the root summary, never silent. */

// Keys with a rendered error slot in ListingForm. The three amenity booleans
// are schema keys but have no slot, so they route to the root summary like
// any other key the form cannot display.
export const LISTING_FORM_FIELD_KEYS: ReadonlySet<string> = new Set([
  "title",
  "description",
  "price",
  "bedrooms",
  "bathrooms",
  "property_size",
  "listing_type",
  "listing_status",
  "property_type_id",
  "location_id",
  "location_name",
  "year_built",
  "parking_spaces",
  "root",
]);

export interface PartitionedFieldErrors {
  known: Array<[string, string[]]>;
  unknown: Array<[string, string[]]>;
}

export function partitionFieldErrors(
  fieldErrors: Record<string, string[]>,
  knownKeys: ReadonlySet<string>,
): PartitionedFieldErrors {
  const known: Array<[string, string[]]> = [];
  const unknown: Array<[string, string[]]> = [];

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (knownKeys.has(field)) {
      known.push([field, messages]);
    } else {
      unknown.push([field, messages]);
    }
  }

  return { known, unknown };
}

export function buildUnknownFieldSummary(unknown: Array<[string, string[]]>): string | null {
  if (unknown.length === 0) {
    return null;
  }

  const parts = unknown.map(([field, messages]) => `${field}: ${messages[0] ?? "invalid value"}`);

  return `Server rejected additional fields: ${parts.join("; ")}`;
}
