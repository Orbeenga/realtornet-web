import type { PropertyFilters, SavedSearch } from "@/types";

const STRIPPED_FILTER_KEYS = new Set(["skip", "limit", "page"]);

export function getSavableSearchParams(
  searchParams: { toString(): string },
): Record<string, unknown> {
  const params = new URLSearchParams(searchParams.toString());
  const result: Record<string, unknown> = {};

  params.forEach((value, key) => {
    if (!value || STRIPPED_FILTER_KEYS.has(key)) {
      return;
    }

    result[key] = value;
  });

  return result;
}

export function buildSavedSearchHref(searchParams: Record<string, unknown>) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (
      STRIPPED_FILTER_KEYS.has(key) ||
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();

  return query ? `/properties?${query}` : "/properties";
}

function formatPrice(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(amount)) {
    return null;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function summarizeSavedSearch(
  searchParams: SavedSearch["search_params"] | PropertyFilters,
) {
  const params = searchParams as Record<string, unknown>;
  const parts: string[] = [];
  const search = params.search;
  const listingType = params.listing_type;
  const listingStatus = params.listing_status;
  const bedrooms = params.bedrooms;
  const minPrice = formatPrice(params.min_price);
  const maxPrice = formatPrice(params.max_price);

  if (typeof search === "string" && search.trim()) {
    parts.push(search.trim());
  }

  if (bedrooms !== undefined && bedrooms !== null && String(bedrooms) !== "") {
    parts.push(`${bedrooms}+ bed`);
  }

  if (minPrice && maxPrice) {
    parts.push(`${minPrice} - ${maxPrice}`);
  } else if (minPrice) {
    parts.push(`From ${minPrice}`);
  } else if (maxPrice) {
    parts.push(`Up to ${maxPrice}`);
  }

  if (typeof listingType === "string" && listingType) {
    parts.push(listingType[0].toUpperCase() + listingType.slice(1));
  }

  if (typeof listingStatus === "string" && listingStatus) {
    parts.push(listingStatus[0].toUpperCase() + listingStatus.slice(1));
  }

  return parts.join(" | ") || "Saved property search";
}
