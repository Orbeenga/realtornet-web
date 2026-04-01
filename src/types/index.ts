export type { components, paths } from "./api.generated";

import type { components } from "./api.generated";

export type Property = components["schemas"]["PropertyResponse"];
export type PropertyList = components["schemas"]["PropertyResponse"][];
export type Agent = components["schemas"]["AgentProfileResponse"];
export type Agency = components["schemas"]["AgencyResponse"];
export type Inquiry = components["schemas"]["InquiryResponse"];
export type InquiryCreate = components["schemas"]["InquiryCreate"];
export type Favorite = components["schemas"]["FavoriteResponse"];
export type FavoriteCreate = components["schemas"]["FavoriteCreate"];
export type UserProfile = components["schemas"]["UserResponse"];
export type PaginatedProperties = components["schemas"]["PropertyResponse"][];

export interface PropertyFilters {
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  property_type?: string;
  location?: string;
  page?: number;
  page_size?: number;
}
