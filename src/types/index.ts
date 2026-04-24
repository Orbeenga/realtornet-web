export type { components, paths } from "./api.generated";

import type { components } from "./api.generated";

export type Property = components["schemas"]["PropertyResponse"];
export type PropertyList = components["schemas"]["PropertyResponse"][];
export type PropertyImage = components["schemas"]["PropertyImageResponse"];
export type Amenity = components["schemas"]["AmenityResponse"];
export type PropertyType = components["schemas"]["PropertyTypeResponse"];
export type PropertyCreate = components["schemas"]["PropertyCreate"];
export type PropertyUpdate = components["schemas"]["PropertyUpdate"];
export type Agent = components["schemas"]["AgentProfileResponse"];
export type Agency = components["schemas"]["AgencyResponse"];
export type Inquiry = components["schemas"]["InquiryResponse"];
export type InquiryCreate = components["schemas"]["InquiryCreate"];
export type InquiryStatus = components["schemas"]["InquiryStatus"];
export type Favorite = components["schemas"]["FavoriteResponse"];
export type FavoriteCreate = components["schemas"]["FavoriteCreate"];
export type SavedSearch = components["schemas"]["SavedSearchResponse"];
export type SavedSearchCreateInput = components["schemas"]["SavedSearchCreate"];
export type UserProfile = components["schemas"]["UserResponse"];
export type UserRole = components["schemas"]["UserRole"];
export type Location = components["schemas"]["LocationResponse"];
export type PaginatedProperties = components["schemas"]["PropertyResponse"][];

export interface PropertyFilters {
  search?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  listing_type?: string;
  listing_status?: string;
  location_id?: number;
  skip?: number;
  limit?: number;
}
