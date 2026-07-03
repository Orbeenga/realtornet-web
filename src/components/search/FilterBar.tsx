"use client";

import { SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/Input";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
} from "@/features/properties/lib/propertyOptions";
import { usePropertyTypes } from "@/features/properties/hooks";

import { LocationCascadeSelector } from "@/features/locations/components/LocationCascadeSelector";
import { cn } from "@/lib/utils";
import { UI_TOKENS } from "@/lib/ui-tokens";

const PRICE_OPTIONS = [
  { value: "500000", label: "NGN 500k" },
  { value: "1000000", label: "NGN 1m" },
  { value: "2500000", label: "NGN 2.5m" },
  { value: "5000000", label: "NGN 5m" },
  { value: "10000000", label: "NGN 10m" },
  { value: "15000000", label: "NGN 15m" },
  { value: "25000000", label: "NGN 25m" },
  { value: "50000000", label: "NGN 50m" },
];

const BEDROOM_OPTIONS = [
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

interface FilterBarProps {
  /**
   * Variant for different contexts
   * - "hero": Homepage hero with dark background wrapper
   * - "default": Standard /properties/ page (no special wrapper)
   */
  variant?: "hero" | "default";
  /**
   * Optional search input to render above filters
   * If not provided, no search input is rendered
   */
  searchInput?: ReactNode;
  /**
   * Optional additional actions to render (e.g., view toggle, save search)
   */
  actions?: ReactNode;
  /**
   * Whether to show location selector in "more" filters
   */
  showLocationSelector?: boolean;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
    >
      {children}
    </label>
  );
}

function SelectClassName() {
  return "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
}

export function FilterBar({ variant = "default", searchInput, actions, showLocationSelector = false }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = "/properties"; // FilterBar always navigates to /properties
  const propertyTypesQuery = usePropertyTypes();
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [customMinMode, setCustomMinMode] = useState(false);
  const [customMaxMode, setCustomMaxMode] = useState(false);
  const [localMinPrice, setLocalMinPrice] = useState("");
  const [localMaxPrice, setLocalMaxPrice] = useState("");

  // Extract filter values from URL params
  const propertyTypeIds = searchParams.getAll("property_type_id");
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const bedrooms = searchParams.get("bedrooms") || "";
  const bathrooms = searchParams.get("bathrooms") || "";
  const listingType = searchParams.get("listing_type") || "";
  const listingStatus = searchParams.get("listing_status") || "";
  const locationId = searchParams.get("location_id")
    ? Number(searchParams.get("location_id"))
    : undefined;
  const state = searchParams.get("state") || "";
  const city = searchParams.get("city") || "";
  const neighborhood = searchParams.get("neighborhood") || "";

  const isMinCustomPreset = Boolean(minPrice) && !PRICE_OPTIONS.some((o) => o.value === minPrice);
  const showCustomMin = customMinMode || isMinCustomPreset;
  const minSelectValue = showCustomMin ? "custom" : minPrice;
  const isMaxCustomPreset = Boolean(maxPrice) && !PRICE_OPTIONS.some((o) => o.value === maxPrice);
  const showCustomMax = customMaxMode || isMaxCustomPreset;
  const maxSelectValue = showCustomMax ? "custom" : maxPrice;

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const updateLocationFilters = useCallback(
    (value: {
      state: string;
      city: string;
      neighborhood: string;
      locationId?: number;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const key of ["state", "city", "neighborhood", "location_id"]) {
        params.delete(key);
      }

      if (value.state) {
        params.set("state", value.state);
      }

      if (value.city) {
        params.set("city", value.city);
      }

      if (value.neighborhood) {
        params.set("neighborhood", value.neighborhood);
      }

      if (value.locationId) {
        params.set("location_id", String(value.locationId));
      }

      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  // Sync local price values with URL params
  useEffect(() => {
    setLocalMinPrice(minPrice);
    setLocalMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // Filter field renderers
  const propertyTypeField = (id = "property-type") => (
    <div>
      <FieldLabel htmlFor={id}>Property type</FieldLabel>
      <select
        id={id}
        value={propertyTypeIds[0] || ""}
        onChange={(event) => updateFilter("property_type_id", event.target.value)}
        className={SelectClassName()}
      >
        <option value="">All property types</option>
        {propertyTypesQuery.data?.map((pt) => (
          <option key={pt.property_type_id} value={pt.property_type_id}>
            {pt.name}
          </option>
        ))}
      </select>
    </div>
  );

  const minPriceField = (id = "min-price") => (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>Min price</FieldLabel>
      <select
        id={id}
        value={minSelectValue}
        onChange={(event) => {
          if (event.target.value === "custom") {
            setCustomMinMode(true);
            updateFilter("min_price", "");
            return;
          }
          setCustomMinMode(false);
          updateFilter("min_price", event.target.value);
        }}
        className={SelectClassName()}
      >
        <option value="">Any</option>
        {PRICE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="custom">Custom Price</option>
      </select>
      {showCustomMin ? (
        <div className="space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">NGN</span>
            <Input
              id={`${id}-custom`}
              type="number"
              min="0"
              inputMode="numeric"
              value={localMinPrice}
              placeholder="Enter custom price"
              onChange={(event) => setLocalMinPrice(event.target.value)}
              onBlur={() => updateFilter("min_price", localMinPrice)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  updateFilter("min_price", localMinPrice);
                }
              }}
              aria-label="Min price custom value"
              className="pl-12"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLocalMinPrice("");
                updateFilter("min_price", "");
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => updateFilter("min_price", localMinPrice)}
            >
              Apply
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const maxPriceField = (id = "max-price") => (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>Max price</FieldLabel>
      <select
        id={id}
        value={maxSelectValue}
        onChange={(event) => {
          if (event.target.value === "custom") {
            setCustomMaxMode(true);
            updateFilter("max_price", "");
            return;
          }
          setCustomMaxMode(false);
          updateFilter("max_price", event.target.value);
        }}
        className={SelectClassName()}
      >
        <option value="">Any</option>
        {PRICE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value="custom">Custom Price</option>
      </select>
      {showCustomMax ? (
        <div className="space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">NGN</span>
            <Input
              id={`${id}-custom`}
              type="number"
              min="0"
              inputMode="numeric"
              value={localMaxPrice}
              placeholder="Enter custom price"
              onChange={(event) => setLocalMaxPrice(event.target.value)}
              onBlur={() => updateFilter("max_price", localMaxPrice)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  updateFilter("max_price", localMaxPrice);
                }
              }}
              aria-label="Max price custom value"
              className="pl-12"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLocalMaxPrice("");
                updateFilter("max_price", "");
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => updateFilter("max_price", localMaxPrice)}
            >
              Apply
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const bedroomsField = (id = "bedrooms") => (
    <div>
      <FieldLabel htmlFor={id}>Bedrooms</FieldLabel>
      <select
        id={id}
        value={bedrooms}
        onChange={(event) => updateFilter("bedrooms", event.target.value)}
        className={SelectClassName()}
      >
        <option value="">Any</option>
        {BEDROOM_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const bathroomsField = (id = "bathrooms") => (
    <div>
      <FieldLabel htmlFor={id}>Bathrooms</FieldLabel>
      <select
        id={id}
        value={bathrooms}
        onChange={(event) => updateFilter("bathrooms", event.target.value)}
        className={SelectClassName()}
      >
        <option value="">Any</option>
        {BEDROOM_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const moreFilters = (
    <div className="space-y-4">
      {showLocationSelector && (
        <div>
          <LocationCascadeSelector
            idPrefix="property-filter-location"
            value={{ state, city, neighborhood, locationId }}
            onChange={updateLocationFilters}
            compact
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="listing-type">Listing type</FieldLabel>
          <select
            id="listing-type"
            value={listingType}
            onChange={(event) => updateFilter("listing_type", event.target.value)}
            className={SelectClassName()}
          >
            <option value="">All listing types</option>
            {LISTING_TYPES.map((type) => (
              <option key={type} value={type}>
                {LISTING_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="listing-status">Status</FieldLabel>
          <select
            id="listing-status"
            value={listingStatus}
            onChange={(event) => updateFilter("listing_status", event.target.value)}
            className={SelectClassName()}
          >
            <option value="">All statuses</option>
            {LISTING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LISTING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="button" variant="ghost" onClick={clearAll} disabled={!searchParams.toString()}>
        Clear all
      </Button>
    </div>
  );

  // Desktop layout
  const desktopContent = (
    <>
      {searchInput && (
        <div className="mx-auto hidden w-full max-w-2xl lg:block">
          {searchInput}
        </div>
      )}

      <div className="mx-auto hidden w-full max-w-2xl lg:block">
        <div className="flex w-full min-w-0 items-center gap-3 flex-wrap">
          {/* Property Type - native select */}
          <select
            value={propertyTypeIds[0] || ""}
            onChange={(event) => updateFilter("property_type_id", event.target.value)}
            aria-label="Property type"
            className={cn(
              UI_TOKENS.FILTER_PILL,
              "inline-flex w-auto items-center rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 cursor-pointer"
            )}
          >
            <option value="">All property types</option>
            {propertyTypesQuery.data?.map((pt) => (
              <option key={pt.property_type_id} value={pt.property_type_id}>
                {pt.name}
              </option>
            ))}
          </select>

          {/* Min Price - native select */}
          <select
            value={minSelectValue}
            onChange={(event) => {
              if (event.target.value === "custom") {
                setCustomMinMode(true);
                updateFilter("min_price", "");
                return;
              }
              setCustomMinMode(false);
              updateFilter("min_price", event.target.value);
            }}
            aria-label="Min price"
            className={cn(
              UI_TOKENS.FILTER_PILL,
              "inline-flex w-auto items-center rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 cursor-pointer"
            )}
          >
            <option value="">Any</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>

          {/* Custom min price input (shown when custom is selected) */}
          {showCustomMin && (
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">NGN</span>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={localMinPrice}
                placeholder="Min"
                onChange={(event) => setLocalMinPrice(event.target.value)}
                onBlur={() => updateFilter("min_price", localMinPrice)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    updateFilter("min_price", localMinPrice);
                  }
                }}
                aria-label="Custom min price"
                className="pl-12 w-32"
              />
            </div>
          )}

          {/* Max Price - native select */}
          <select
            value={maxSelectValue}
            onChange={(event) => {
              if (event.target.value === "custom") {
                setCustomMaxMode(true);
                updateFilter("max_price", "");
                return;
              }
              setCustomMaxMode(false);
              updateFilter("max_price", event.target.value);
            }}
            aria-label="Max price"
            className={cn(
              UI_TOKENS.FILTER_PILL,
              "inline-flex w-auto items-center rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 cursor-pointer"
            )}
          >
            <option value="">Any</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>

          {/* Custom max price input (shown when custom is selected) */}
          {showCustomMax && (
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">NGN</span>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={localMaxPrice}
                placeholder="Max"
                onChange={(event) => setLocalMaxPrice(event.target.value)}
                onBlur={() => updateFilter("max_price", localMaxPrice)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    updateFilter("max_price", localMaxPrice);
                  }
                }}
                aria-label="Custom max price"
                className="pl-12 w-32"
              />
            </div>
          )}

          {/* Bedrooms - native select */}
          <select
            value={bedrooms}
            onChange={(event) => updateFilter("bedrooms", event.target.value)}
            aria-label="Bedrooms"
            className={cn(
              UI_TOKENS.FILTER_PILL,
              "inline-flex w-auto items-center rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 cursor-pointer"
            )}
          >
            <option value="">Any</option>
            {BEDROOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Filters - button with drawer icon, toggles inline expand */}
          <button
            type="button"
            onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
            aria-expanded={moreFiltersOpen}
            aria-label="More filters"
            className={cn(
              UI_TOKENS.FILTER_PILL,
              "inline-flex items-center justify-center gap-2 rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 cursor-pointer"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>More filters</span>
          </button>
        </div>
        {moreFiltersOpen && (
          <div className="mt-3 space-y-4">
            {moreFilters}
          </div>
        )}
      </div>

      {actions && (
        <div className="mx-auto hidden w-full max-w-2xl lg:flex">
          <div className="mx-auto flex w-full items-center justify-between">
            {actions}
          </div>
        </div>
      )}
    </>
  );

  // Mobile layout (inline filters)
  const mobileContent = (
    <>
      {searchInput && (
        <div className="mx-auto mt-3 w-full max-w-2xl lg:hidden">
          {searchInput}
        </div>
      )}
      <div className="mx-auto mt-3 w-full max-w-2xl space-y-3 lg:hidden">
        {propertyTypeField("mobile-property-type")}
        <div className="grid grid-cols-2 gap-3">
          {minPriceField("mobile-min-price")}
          {maxPriceField("mobile-max-price")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {bedroomsField("mobile-bedrooms")}
          {bathroomsField("mobile-bathrooms")}
        </div>
        <button
          type="button"
          className={cn(
            UI_TOKENS.FILTER_PILL,
            "inline-flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 cursor-pointer"
          )}
          onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
          aria-expanded={moreFiltersOpen}
          aria-label="More filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>More filters</span>
        </button>
        {moreFiltersOpen && (
          <div className="space-y-4">
            {moreFilters}
          </div>
        )}
        {/* Search button - full width, below More filters */}
        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </Button>
      </div>

      {actions && (
        <div className="mx-auto mt-3 w-full max-w-2xl lg:hidden">
          {actions}
        </div>
      )}
    </>
  );

  // Hero variant: dark background wrapper
  if (variant === "hero") {
    return (
      <div className="space-y-3">
        {desktopContent}
        {mobileContent}
      </div>
    );
  }

  // Default variant: no special wrapper
  return (
    <div className="mb-8 space-y-3">
      {desktopContent}
      {mobileContent}
    </div>
  );
}
