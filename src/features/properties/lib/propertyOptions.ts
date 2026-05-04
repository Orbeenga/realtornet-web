import type { ListingStatus, ListingType } from "@/types";

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale: "For Sale",
  rent: "For Rent",
  lease: "For Lease",
};

export const LISTING_TYPES = Object.keys(LISTING_TYPE_LABELS) as ListingType[];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  available: "Available",
  active: "Active",
  pending: "Pending",
  sold: "Sold",
  rented: "Rented",
  unavailable: "Unavailable",
};

export const LISTING_STATUSES = Object.keys(LISTING_STATUS_LABELS) as ListingStatus[];

export function parseListingType(value: string | null): ListingType | undefined {
  return LISTING_TYPES.includes(value as ListingType) ? (value as ListingType) : undefined;
}

export function parseListingStatus(value: string | null): ListingStatus | undefined {
  return LISTING_STATUSES.includes(value as ListingStatus)
    ? (value as ListingStatus)
    : undefined;
}
