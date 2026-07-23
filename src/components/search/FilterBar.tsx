"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogClose } from "@/components/ui/dialog";
import type { ListingStatus, ListingType } from "@/types";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
} from "@/features/properties/lib/propertyOptions";
import { usePropertyTypes } from "@/features/properties/hooks";
import { formatPrice } from "@/features/properties/lib/formatPrice";
import { LocationCascadeSelector } from "@/features/locations/components/LocationCascadeSelector";
import { cn } from "@/lib/utils";
import PropertyTypeFilter, { type PropertyTypeHandle } from "@/components/search/PropertyTypeFilter";
import { FilterPill } from "@/components/ui/FilterPill";

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
  /**
   * Current search query from the hero search input (hero variant only)
   */
  searchQuery?: string;
  /**
   * Currently selected location ID from the hero search (hero variant only)
   */
  selectedLocationId?: number;
}


export type FilterBarHandle = {
  getFilterParams: () => URLSearchParams;
};

export const FilterBar = forwardRef<FilterBarHandle, FilterBarProps>(function FilterBar({
  variant = "default",
  searchInput,
  actions,
  showLocationSelector = false,
  searchQuery,
  selectedLocationId,
}, ref) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = "/properties"; // FilterBar always navigates to /properties
  const propertyTypesQuery = usePropertyTypes();

  const [desktopMoreFiltersOpen, setDesktopMoreFiltersOpen] = useState(false);
  const [mobileMoreFiltersOpen, setMobileMoreFiltersOpen] = useState(false);
  const [minPriceOpen, setMinPriceOpen] = useState(false);
  const [maxPriceOpen, setMaxPriceOpen] = useState(false);
  const [customMinMode, setCustomMinMode] = useState(false);
  const [customMaxMode, setCustomMaxMode] = useState(false);
  const [localMinPrice, setLocalMinPrice] = useState("");
  const [localMaxPrice, setLocalMaxPrice] = useState("");
  const [localBedrooms, setLocalBedrooms] = useState(searchParams.get("bedrooms") || "");
  const [localBathrooms, setLocalBathrooms] = useState(searchParams.get("bathrooms") || "");
  const [localListingType, setLocalListingType] = useState(searchParams.get("listing_type") || "");
  const [localListingStatus, setLocalListingStatus] = useState(searchParams.get("listing_status") || "");

  // Property Type selection handled by PropertyTypeFilter component.
  // Provide initial values from URL and a ref to access committed selections.
  const urlPropertyTypeIds = searchParams.getAll("property_type_id");
  const propertyTypeRef = useRef<PropertyTypeHandle | null>(null);
  const [committedPropertyTypeIds, setCommittedPropertyTypeIds] = useState<string[]>(urlPropertyTypeIds);
  // Real-time in-progress selection, synced via onChange callback
  const [stagedPropertyTypeIds, setStagedPropertyTypeIds] = useState<string[]>(urlPropertyTypeIds);

  // ── Filter values from URL ────────────────────────────────────────────────
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const bedrooms = searchParams.get("bedrooms") || "";
  const bathrooms = searchParams.get("bathrooms") || "";
  const listingType = searchParams.get("listing_type") || "";
  const listingStatus = searchParams.get("listing_status") || "";

  // Sync local staging state from URL params
  useEffect(() => { setLocalBedrooms(bedrooms); }, [bedrooms]);
  useEffect(() => { setLocalBathrooms(bathrooms); }, [bathrooms]);
  useEffect(() => { setLocalListingType(listingType); }, [listingType]);
  useEffect(() => { setLocalListingStatus(listingStatus); }, [listingStatus]);
  const locationId = searchParams.get("location_id")
    ? Number(searchParams.get("location_id"))
    : undefined;
  const state = searchParams.get("state") || "";
  const city = searchParams.get("city") || "";
  const neighborhood = searchParams.get("neighborhood") || "";

  const isLocalMinCustom = Boolean(localMinPrice) && !PRICE_OPTIONS.some((o) => o.value === localMinPrice);
  const showCustomMin = customMinMode;
  const minSelectValue = (customMinMode || isLocalMinCustom) ? "custom" : (localMinPrice || "");
  const isLocalMaxCustom = Boolean(localMaxPrice) && !PRICE_OPTIONS.some((o) => o.value === localMaxPrice);
  const showCustomMax = customMaxMode;
  const maxSelectValue = (customMaxMode || isLocalMaxCustom) ? "custom" : (localMaxPrice || "");

  // ── URL update helpers ────────────────────────────────────────────────────
  const updateLocationFilters = useCallback(
    (value: { state: string; city: string; neighborhood: string; locationId?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of ["state", "city", "neighborhood", "location_id"]) {
        params.delete(key);
      }
      if (value.state) params.set("state", value.state);
      if (value.city) params.set("city", value.city);
      if (value.neighborhood) params.set("neighborhood", value.neighborhood);
      if (value.locationId) params.set("location_id", String(value.locationId));
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  // Sync local price values with URL params on external navigation.
  useEffect(() => {
    setLocalMinPrice(minPrice);
    setLocalMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // ── Property Type Popover (desktop: anchored dropdown, mobile: bottom sheet) ──
  // The Popover component itself handles outside-click dismissal. The content
  // ref is threaded via context so clicks inside the floating panel are never
  // misidentified as "outside" clicks — see popover.tsx.

  // ── Min / Max price fields (inside More Filters on mobile, inline on desktop) ──
  const minPriceField = (id = "min-price") => {
    if (showCustomMin) {
      return (
        <div className="relative rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
          <div className="flex flex-col items-start pointer-events-none">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Min Price</span>
            <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localMinPrice ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
              {localMinPrice ? formatPrice(localMinPrice) : ""}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                NGN
              </span>
              <Input
                id={`${id}-custom`}
                type="text"
                inputMode="numeric"
                value={localMinPrice}
                placeholder="Enter amount"
                onChange={(event) => setLocalMinPrice(event.target.value)}
                aria-label="Min price custom value"
                className="pl-12"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomMinMode(false);
                  setLocalMinPrice("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCustomMinMode(false);
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <FilterPill asChild className="w-full">
        <label className="relative w-full cursor-pointer">
          <div className="flex flex-col items-start leading-tight min-w-0 pointer-events-none">
            <span className={cn("transition-all duration-200", localMinPrice ? "text-xs font-medium" : "text-sm font-medium")}>Min Price</span>
            <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localMinPrice ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
              {localMinPrice ? formatPrice(localMinPrice) : ""}
            </span>
          </div>
          <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 opacity-50" />
          <select
            id={id}
            name="min_price"
            value={minSelectValue || ""}
            onChange={(event) => {
              const val = event.target.value;
              if (val === "custom") {
                setCustomMinMode(true);
                return;
              }
              setCustomMinMode(false);
              setLocalMinPrice(val === "all" ? "" : val);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="" disabled hidden>Min Price</option>
            <option value="all">Any Price</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom price</option>
          </select>
        </label>
      </FilterPill>
    );
  };

  const maxPriceField = (id = "max-price") => {
    if (showCustomMax) {
      return (
        <div className="relative rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
          <div className="flex flex-col items-start pointer-events-none">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Max Price</span>
            <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localMaxPrice ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
              {localMaxPrice ? formatPrice(localMaxPrice) : ""}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                NGN
              </span>
              <Input
                id={`${id}-custom`}
                type="text"
                inputMode="numeric"
                value={localMaxPrice}
                placeholder="Enter amount"
                onChange={(event) => setLocalMaxPrice(event.target.value)}
                aria-label="Max price custom value"
                className="pl-12"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomMaxMode(false);
                  setLocalMaxPrice("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCustomMaxMode(false);
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <FilterPill asChild className="w-full">
        <label className="relative w-full cursor-pointer">
          <div className="flex flex-col items-start leading-tight min-w-0 pointer-events-none">
            <span className={cn("transition-all duration-200", localMaxPrice ? "text-xs font-medium" : "text-sm font-medium")}>Max Price</span>
            <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localMaxPrice ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
              {localMaxPrice ? formatPrice(localMaxPrice) : ""}
            </span>
          </div>
          <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 opacity-50" />
          <select
            id={id}
            name="max_price"
            value={maxSelectValue || ""}
            onChange={(event) => {
              const val = event.target.value;
              if (val === "custom") {
                setCustomMaxMode(true);
                return;
              }
              setCustomMaxMode(false);
              setLocalMaxPrice(val === "all" ? "" : val);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="" disabled hidden>Max Price</option>
            <option value="all">Any Price</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom price</option>
          </select>
        </label>
      </FilterPill>
    );
  };

  const bedroomsField = (id = "bedrooms") => (
    <FilterPill asChild className="w-full">
      <label className="relative w-full cursor-pointer">
        <div className="flex flex-col items-start leading-tight min-w-0 pointer-events-none">
          <span className={cn("transition-all duration-200", localBedrooms && localBedrooms !== "all" ? "text-xs font-medium" : "text-sm font-medium")}>Bedrooms</span>
          <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localBedrooms && localBedrooms !== "all" ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
            {BEDROOM_OPTIONS.find(o => o.value === localBedrooms)?.label}
          </span>
        </div>
        <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 opacity-50" />
        <select
          id={id}
          name="bedrooms"
          value={localBedrooms || ""}
          onChange={(event) => setLocalBedrooms(event.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          <option value="" disabled hidden>Bedrooms</option>
          <option value="all">Any</option>
          {BEDROOM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </FilterPill>
  );

  const bathroomsField = (id = "bathrooms") => (
    <FilterPill asChild className="w-full">
      <label className="relative w-full cursor-pointer">
        <div className="flex flex-col items-start leading-tight min-w-0 pointer-events-none">
          <span className={cn("transition-all duration-200", localBathrooms && localBathrooms !== "all" ? "text-xs font-medium" : "text-sm font-medium")}>Bathrooms</span>
          <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localBathrooms && localBathrooms !== "all" ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
            {BEDROOM_OPTIONS.find(o => o.value === localBathrooms)?.label}
          </span>
        </div>
        <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 opacity-50" />
        <select
          id={id}
          name="bathrooms"
          value={localBathrooms || ""}
          onChange={(event) => setLocalBathrooms(event.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          <option value="" disabled hidden>Bathrooms</option>
          <option value="all">Any</option>
          {BEDROOM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </FilterPill>
  );

  // ── More Filters expanded panel (shared between desktop and mobile) ───────
  const moreFiltersPanel = (
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
        <div className="relative rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
          <div className="flex flex-col items-start pointer-events-none">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Listing Type</span>
            <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localListingType && localListingType !== "all" ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
              {localListingType && localListingType !== "all" ? LISTING_TYPE_LABELS[localListingType as ListingType] : ""}
            </span>
          </div>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50" />
          <select
            id="listing-type"
            name="listing_type"
            value={localListingType || ""}
            onChange={(event) => setLocalListingType(event.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="" disabled hidden>Listing Type</option>
            <option value="all">All Listing Types</option>
            {LISTING_TYPES.map((type) => (
              <option key={type} value={type}>
                {LISTING_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="relative rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
          <div className="flex flex-col items-start pointer-events-none">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Listing Status</span>
            <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localListingStatus && localListingStatus !== "all" ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
              {localListingStatus && localListingStatus !== "all" ? LISTING_STATUS_LABELS[localListingStatus as ListingStatus] : ""}
            </span>
          </div>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50" />
          <select
            id="listing-status"
            name="listing_status"
            value={localListingStatus || ""}
            onChange={(event) => setLocalListingStatus(event.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="" disabled hidden>Listing Status</option>
            <option value="all">All Statuses</option>
            {LISTING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LISTING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
        <div className="flex flex-col items-start pointer-events-none">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Bathrooms</span>
          <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localBathrooms && localBathrooms !== "all" ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
            {BEDROOM_OPTIONS.find(o => o.value === localBathrooms)?.label}
          </span>
        </div>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50" />
        <select
          id="bathrooms"
          name="bathrooms"
          value={localBathrooms || ""}
          onChange={(event) => setLocalBathrooms(event.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          <option value="" disabled hidden>Bathrooms</option>
          <option value="all">Any</option>
          {BEDROOM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  // The filter row uses overflow-x-auto + flex-nowrap — the industry-standard
  // pattern (Property24, Rightmove, Zillow) so pills never reflow to a second
  // row. On narrow viewports the row scrolls horizontally.
  const desktopContent = (
    <>
      {searchInput && (
              <div className="mx-auto hidden w-full max-w-[60rem] lg:block">
          {searchInput}
        </div>
      )}

      <div className="mx-auto hidden w-full max-w-[60rem] lg:block">
        {/* Scrollable, non-wrapping pill row */}
        <div className="flex w-full items-center gap-4 overflow-x-auto flex-nowrap pb-0.5">
          {/* Property Type — canonical component (desktop trigger + popover) */}
          <div className="flex-1 min-w-0">
          <PropertyTypeFilter
            ref={propertyTypeRef}
            initialIds={urlPropertyTypeIds}
            onCommit={(ids) => setCommittedPropertyTypeIds(ids)}
            onChange={setStagedPropertyTypeIds}
          />
          </div>

          {/* Min Price */}
          <div className="flex-1 min-w-0">
          <Popover open={minPriceOpen} onOpenChange={(v) => { setMinPriceOpen(v); if (!v) setCustomMinMode(false); }}>
            <PopoverTrigger asChild>
              <FilterPill asChild className="w-full">
                <button type="button" aria-label="Min price">
                  <div className="flex flex-col items-start leading-tight min-w-0 transition-all duration-200">
                    <span className={cn("transition-all duration-200", localMinPrice ? "text-xs font-medium" : "text-sm font-medium")}>Min Price</span>
                    <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-gray-900 dark:text-white", localMinPrice ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
                      {localMinPrice ? formatPrice(localMinPrice) : ""}
                    </span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", minPriceOpen && "rotate-180")} />
                </button>
              </FilterPill>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start" matchTriggerWidth>
              {customMinMode ? (
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Custom Min Price</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">NGN</span>
                      <Input type="text" inputMode="numeric" value={localMinPrice} onChange={(e) => setLocalMinPrice(e.target.value)} placeholder="Enter amount" aria-label="Min price custom value" className="pl-12" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setCustomMinMode(false); setLocalMinPrice(""); }}>Cancel</Button>
                      <Button type="button" size="sm" onClick={() => { setCustomMinMode(false); setMinPriceOpen(false); }}>OK</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Min Price</span>
                  </div>
                  <ul className="py-1 overflow-y-auto max-h-60">
                    <li>
                      <button type="button" className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => { setLocalMinPrice(""); setMinPriceOpen(false); }}>
                        Any Price
                      </button>
                    </li>
                    {PRICE_OPTIONS.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => { setLocalMinPrice(opt.value); setMinPriceOpen(false); }}>
                          {opt.label}
                        </button>
                      </li>
                    ))}
                    <li>
                      <button type="button" className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => setCustomMinMode(true)}>
                        Custom price
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </PopoverContent>
          </Popover>
          </div>

          {/* Max Price */}
          <div className="flex-1 min-w-0">
          <Popover open={maxPriceOpen} onOpenChange={(v) => { setMaxPriceOpen(v); if (!v) setCustomMaxMode(false); }}>
            <PopoverTrigger asChild>
              <FilterPill asChild className="w-full">
                <button type="button" aria-label="Max price">
                  <div className="flex flex-col items-start leading-tight min-w-0 transition-all duration-200">
                    <span className={cn("transition-all duration-200", localMaxPrice ? "text-xs font-medium" : "text-sm font-medium")}>Max Price</span>
                    <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-gray-900 dark:text-white", localMaxPrice ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
                      {localMaxPrice ? formatPrice(localMaxPrice) : ""}
                    </span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", maxPriceOpen && "rotate-180")} />
                </button>
              </FilterPill>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start" matchTriggerWidth>
              {customMaxMode ? (
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Custom Max Price</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">NGN</span>
                      <Input type="text" inputMode="numeric" value={localMaxPrice} onChange={(e) => setLocalMaxPrice(e.target.value)} placeholder="Enter amount" aria-label="Max price custom value" className="pl-12" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setCustomMaxMode(false); setLocalMaxPrice(""); }}>Cancel</Button>
                      <Button type="button" size="sm" onClick={() => { setCustomMaxMode(false); setMaxPriceOpen(false); }}>OK</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Max Price</span>
                  </div>
                  <ul className="py-1 overflow-y-auto max-h-60">
                    <li>
                      <button type="button" className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => { setLocalMaxPrice(""); setMaxPriceOpen(false); }}>
                        Any Price
                      </button>
                    </li>
                    {PRICE_OPTIONS.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => { setLocalMaxPrice(opt.value); setMaxPriceOpen(false); }}>
                          {opt.label}
                        </button>
                      </li>
                    ))}
                    <li>
                      <button type="button" className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => setCustomMaxMode(true)}>
                        Custom price
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </PopoverContent>
          </Popover>
          </div>

          {/* Bedrooms */}
          <div className="flex-1 min-w-0">
          <FilterPill asChild className="w-full">
            <label className="relative inline-flex w-full items-center cursor-pointer">
              <div className="flex flex-col items-start leading-tight min-w-0 transition-all duration-200 pointer-events-none">
                <span className={cn("transition-all duration-200", localBedrooms && localBedrooms !== "all" ? "text-xs font-medium" : "text-sm font-medium")}>Bedrooms</span>
                <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", localBedrooms && localBedrooms !== "all" ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
                  {BEDROOM_OPTIONS.find(o => o.value === localBedrooms)?.label}
                </span>
              </div>
              <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 opacity-50" />
              <select
                aria-label="Bedrooms"
                value={localBedrooms || ""}
                onChange={(event) => setLocalBedrooms(event.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="" disabled hidden>Bedrooms</option>
                <option value="all">Any</option>
                {BEDROOM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </FilterPill>
          </div>

          {/* More filters modal */}
          <div className="flex-1 min-w-0">
          <Dialog open={desktopMoreFiltersOpen} onOpenChange={setDesktopMoreFiltersOpen}>
            <DialogTrigger
              render={
                <FilterPill asChild className={cn("w-full justify-center", desktopMoreFiltersOpen && "border-blue-500 text-blue-700 dark:border-blue-500 dark:text-blue-400")}>
                  <button type="button" aria-label="More filters">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>More filters</span>
                  </button>
                </FilterPill>
              }
            />
            <DialogContent className="sm:max-w-md p-0" showCloseButton={false}>
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <DialogTitle className="text-sm font-semibold">More Filters</DialogTitle>
                <DialogClose
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Close filters">
                      <X className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
              <div className="p-4">
                {moreFiltersPanel}
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {actions && (
        <div className="mx-auto hidden w-full max-w-[60rem] lg:flex">
          <div className="mx-auto flex w-full items-center justify-between">
            {actions}
          </div>
        </div>
      )}
    </>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  // Property type uses the same Popover component with asSheet=true so it
  // slides up from the bottom — matching the Property24 mobile pattern.
  // Min/Max prices and other filters remain as native <select> elements so
  // the OS keyboard toolbar (with "Done") appears naturally on iOS/Android.
  const mobileContent = (
    <>
      {searchInput && (
              <div className="mx-auto mt-3 w-full max-w-[60rem] lg:hidden">
          {searchInput}
        </div>
      )}

      <div className="mx-auto mt-3 w-full max-w-[60rem] space-y-3 lg:hidden">
        {/* Property Type — mobile trigger opens the canonical PropertyTypeFilter sheet */}
        <div className="w-full">
        <FilterPill asChild className="w-full justify-between">
          <button
            type="button"
            id="mobile-property-type"
            aria-haspopup="listbox"
            onClick={() => propertyTypeRef.current?.openMobile()}
          >
            <div className="flex flex-col items-start leading-tight min-w-0 transition-all duration-200">
              <span className={cn("transition-all duration-200", stagedPropertyTypeIds.length > 0 ? "text-xs font-medium" : "text-sm font-medium")}>Property Type</span>
              <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", stagedPropertyTypeIds.length > 0 ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>{stagedPropertyTypeIds.length === 1 ? (propertyTypesQuery.data ?? []).find(pt => String(pt.property_type_id) === stagedPropertyTypeIds[0])?.name ?? `${stagedPropertyTypeIds.length} Selected` : `${stagedPropertyTypeIds.length} Selected`}</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 opacity-50 transition-transform",
              )}
            />
          </button>
        </FilterPill>
        </div>

        {/* Min / Max price row */}
        <div className="grid grid-cols-2 gap-3">
          {minPriceField("mobile-min-price")}
          {maxPriceField("mobile-max-price")}
        </div>

        {/* Bedrooms / Bathrooms row */}
        <div className="grid grid-cols-2 gap-3">
          {bedroomsField("mobile-bedrooms")}
          {bathroomsField("mobile-bathrooms")}
        </div>

        {/* More filters toggle */}
        <div className="w-full">
        <FilterPill asChild className="w-full justify-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMoreFiltersOpen(!mobileMoreFiltersOpen)}
            aria-expanded={mobileMoreFiltersOpen}
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>More Filters</span>
          </button>
        </FilterPill>
        </div>

        {mobileMoreFiltersOpen && (
          <div className="p-0">
            {moreFiltersPanel}
          </div>
        )}

        {/* Search / Apply button */}
        <Button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());

            // Include search query and location ID from hero props
            if (searchQuery) params.set("search", searchQuery);
            if (selectedLocationId) {
              params.set("location_id", String(selectedLocationId));
              params.delete("search");
            } else {
              params.delete("location_id");
            }

            // Property type ids
            params.delete("property_type_id");
            const committed = propertyTypeRef.current?.getCommittedIds() ?? urlPropertyTypeIds;
            committed.forEach((id) => params.append("property_type_id", id));

            // Min/max price
            if (localMinPrice) params.set("min_price", localMinPrice);
            else params.delete("min_price");
            if (localMaxPrice) params.set("max_price", localMaxPrice);
            else params.delete("max_price");

            // Bedrooms, bathrooms, listing type, listing status
            if (localBedrooms && localBedrooms !== "all") params.set("bedrooms", localBedrooms);
            else params.delete("bedrooms");
            if (localBathrooms && localBathrooms !== "all") params.set("bathrooms", localBathrooms);
            else params.delete("bathrooms");
            if (localListingType && localListingType !== "all") params.set("listing_type", localListingType);
            else params.delete("listing_type");
            if (localListingStatus && localListingStatus !== "all") params.set("listing_status", localListingStatus);
            else params.delete("listing_status");

            params.delete("page");
            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname);
          }}
          className={cn(
            "h-12 w-full rounded-xl text-sm font-medium text-white",
            variant === "hero"
              ? "bg-gray-400 hover:bg-gray-500"
              : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          Search
        </Button>
      </div>

      {actions && (
        <div className="mx-auto mt-3 w-full max-w-[60rem] lg:hidden">
          {actions}
        </div>
      )}
    </>
  );

  useImperativeHandle(ref, () => ({
    getFilterParams: () => {
      const p = new URLSearchParams();
      const currentUrlIds = searchParams.getAll("property_type_id");
      const committed = propertyTypeRef.current?.getCommittedIds() ?? currentUrlIds;
      committed.forEach((id) => p.append("property_type_id", id));
      if (localMinPrice) p.set("min_price", localMinPrice);
      if (localMaxPrice) p.set("max_price", localMaxPrice);
      if (localBedrooms && localBedrooms !== "all") p.set("bedrooms", localBedrooms);
      if (localBathrooms && localBathrooms !== "all") p.set("bathrooms", localBathrooms);
      if (localListingType && localListingType !== "all") p.set("listing_type", localListingType);
      if (localListingStatus && localListingStatus !== "all") p.set("listing_status", localListingStatus);
      return p;
    },
  }), [searchParams, localMinPrice, localMaxPrice, localBedrooms, localBathrooms, localListingType, localListingStatus]);

  // Hidden inputs so the hero-variant form submission picks up staged
  // property type IDs (they live in React state, not a form control).
  const committedIds = committedPropertyTypeIds;
  const hiddenPropertyTypeInputs = committedIds.map((id) => (
    <input key={`pt-${id}`} type="hidden" name="property_type_id" value={id} />
  ));

  if (variant === "hero") {
    return (
      <div className="space-y-3">
        {hiddenPropertyTypeInputs}
        {desktopContent}
        {mobileContent}
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-3">
      {hiddenPropertyTypeInputs}
      {desktopContent}
      {mobileContent}
    </div>
  );
});
