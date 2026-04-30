import type { ListingStatus, ListingType } from "@/types";

export const LISTING_TYPES = ["sale", "rent", "lease"] as const satisfies readonly ListingType[];

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale: "For Sale",
  rent: "For Rent",
  lease: "For Lease",
};

export const LISTING_STATUSES = [
  "available",
  "active",
  "pending",
  "sold",
  "rented",
  "unavailable",
] as const satisfies readonly ListingStatus[];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  available: "Available",
  active: "Active",
  pending: "Pending",
  sold: "Sold",
  rented: "Rented",
  unavailable: "Unavailable",
};
