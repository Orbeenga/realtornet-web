"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useState, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import PropertyTypeFilter from "@/components/search/PropertyTypeFilter";

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

// Shared class for native <select> elements inside dropdowns and the mobile
// filter stack. Kept as a plain string — no function wrapper needed.
const SELECT_CLS =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-100 bg-transparent dark:bg-transparent";

// Class shared by every filter pill button on the desktop filter row.
// Height, border, radius, and typography all derive from UI_TOKENS.FILTER_PILL.
const PILL_CLS =
  "inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-800 transition-colors hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:text-gray-100 dark:hover:border-blue-500 dark:hover:text-blue-400 cursor-pointer h-11 bg-transparent";

export function FilterBar({
  variant = "default",
  searchInput,
  actions,
  showLocationSelector = false,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = "/properties"; // FilterBar always navigates to /properties
  const propertyTypesQuery = usePropertyTypes();

  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [customMinMode, setCustomMinMode] = useState(false);
  const [customMaxMode, setCustomMaxMode] = useState(false);
  const [localMinPrice, setLocalMinPrice] = useState("");
  const [localMaxPrice, setLocalMaxPrice] = useState("");

  // Property Type selection handled by PropertyTypeFilter component.
  // Provide initial values from URL and a ref to access committed selections.
  const urlPropertyTypeIds = searchParams.getAll("property_type_id");
  const propertyTypeRef = useRef<{ getCommittedIds: () => string[]; open: () => void; openMobile: () => void } | null>(null);
  const [committedPropertyTypeIds, setCommittedPropertyTypeIds] = useState<string[]>(urlPropertyTypeIds);

  // ── Filter values from URL ────────────────────────────────────────────────
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

  // ── URL update helpers ────────────────────────────────────────────────────
  const applyPropertyTypes = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("property_type_id");
      ids.forEach((id) => params.append("property_type_id", id));
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

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

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  // Sync local price values with URL params on external navigation.
  useEffect(() => {
    setLocalMinPrice(minPrice);
    setLocalMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // ── Property Type label shown on the trigger button ───────────────────────
  // Always show permanent label "Property Type" as per spec
  const propertyTypeLabel = "Property Type";

  // ── Property Type Popover (desktop: anchored dropdown, mobile: bottom sheet) ──
  // The Popover component itself handles outside-click dismissal. The content
  // ref is threaded via context so clicks inside the floating panel are never
  // misidentified as "outside" clicks — see popover.tsx.

  // ── Min / Max price fields (inside More Filters on mobile, inline on desktop) ──
  const minPriceField = (id = "min-price") => (
    <div className="space-y-2">
      <select
        id={id}
        name="min_price"
        value={minSelectValue || ""}
        onChange={(event) => {
          const val = event.target.value;
          if (val === "custom") {
            setCustomMinMode(true);
            // Don't update filter immediately - staged selection
            return;
          }
          setCustomMinMode(false);
          // Don't update filter immediately - staged selection
        }}
        className={SELECT_CLS}
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
      {showCustomMin ? (
        <div className="space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              NGN
            </span>
            <Input
              id={`${id}-custom`}
              type="number"
              min="0"
              inputMode="numeric"
              value={localMinPrice}
              placeholder="Enter amount"
              onChange={(event) => setLocalMinPrice(event.target.value)}
              // Don't update filter immediately - staged selection
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
                setLocalMinPrice("");
                // Don't update filter immediately - staged selection
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                // Don't update filter immediately - staged selection
              }}
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
      <select
        id={id}
        name="max_price"
        value={maxSelectValue || ""}
        onChange={(event) => {
          const val = event.target.value;
          if (val === "custom") {
            setCustomMaxMode(true);
            // Don't update filter immediately - staged selection
            return;
          }
          setCustomMaxMode(false);
          // Don't update filter immediately - staged selection
        }}
        className={SELECT_CLS}
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
      {showCustomMax ? (
        <div className="space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              NGN
            </span>
            <Input
              id={`${id}-custom`}
              type="number"
              min="0"
              inputMode="numeric"
              value={localMaxPrice}
              placeholder="Enter amount"
              onChange={(event) => setLocalMaxPrice(event.target.value)}
              // Don't update filter immediately - staged selection
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
                setLocalMaxPrice("");
                // Don't update filter immediately - staged selection
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                // Don't update filter immediately - staged selection
              }}
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
      <select
        id={id}
        name="bedrooms"
        value={bedrooms || ""}
        onChange={() => {
          // Don't update filter immediately - staged selection
        }}
        className={SELECT_CLS}
      >
        <option value="" disabled hidden>Bedrooms</option>
        <option value="all">Any</option>
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
      <select
        id={id}
        name="bathrooms"
        value={bathrooms || ""}
        onChange={() => {
          // Don't update filter immediately - staged selection
        }}
        className={SELECT_CLS}
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
        <div>
          <select
            id="listing-type"
            name="listing_type"
            value={listingType || ""}
            onChange={() => {
              // Don't update filter immediately - staged selection
            }}
            className={SELECT_CLS}
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

        <div>
          <select
            id="listing-status"
            name="listing_status"
            value={listingStatus || ""}
            onChange={() => {
              // Don't update filter immediately - staged selection
            }}
            className={SELECT_CLS}
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

      <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={!searchParams.toString()}>
        Clear all filters
      </Button>
    </div>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  // The filter row uses overflow-x-auto + flex-nowrap — the industry-standard
  // pattern (Property24, Rightmove, Zillow) so pills never reflow to a second
  // row. On narrow viewports the row scrolls horizontally.
  const desktopContent = (
    <>
      {searchInput && (
              <div className="mx-auto hidden w-full max-w-5xl lg:block">
          {searchInput}
        </div>
      )}

      <div className="mx-auto hidden w-full max-w-5xl lg:block">
        {/* Scrollable, non-wrapping pill row */}
        <div className="flex w-full items-center gap-2 overflow-x-auto flex-nowrap pb-0.5">
          {/* Property Type — canonical component (desktop trigger + popover) */}
          <PropertyTypeFilter
            ref={propertyTypeRef as any}
            initialIds={urlPropertyTypeIds}
            onCommit={(ids) => setCommittedPropertyTypeIds(ids)}
            className="w-[134px] justify-between"
          />

          {/* Min Price */}
          <select
            aria-label="Min price"
            value={minSelectValue || ""}
            onChange={(event) => {
              const val = event.target.value;
              if (val === "custom") {
                setCustomMinMode(true);
                // Don't update filter immediately - staged selection
                return;
              }
              setCustomMinMode(false);
              // Don't update filter immediately - staged selection
            }}
            className={cn(
              PILL_CLS,
              UI_TOKENS.FILTER_PILL,
              "shrink-0 h-11",
            )}
          >
            <option value="" disabled hidden>Min Price</option>
            <option value="all">Any Price</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>

          {/* Custom min price input */}
          {showCustomMin && (
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                NGN
              </span>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={localMinPrice}
                placeholder="Min"
                onChange={(e) => setLocalMinPrice(e.target.value)}
                // Don't update filter immediately - staged selection
                aria-label="Custom min price"
                className={cn("pl-12 w-28", UI_TOKENS.FILTER_PILL)}
              />
            </div>
          )}

          {/* Max Price */}
          <select
            aria-label="Max price"
            value={maxSelectValue || ""}
            onChange={(event) => {
              const val = event.target.value;
              if (val === "custom") {
                setCustomMaxMode(true);
                // Don't update filter immediately - staged selection
                return;
              }
              setCustomMaxMode(false);
              // Don't update filter immediately - staged selection
            }}
            className={cn(
              PILL_CLS,
              UI_TOKENS.FILTER_PILL,
              "shrink-0 h-11",
            )}
          >
            <option value="" disabled hidden>Max Price</option>
            <option value="all">Any Price</option>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>

          {/* Custom max price input */}
          {showCustomMax && (
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                NGN
              </span>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={localMaxPrice}
                placeholder="Max"
                onChange={(e) => setLocalMaxPrice(e.target.value)}
                // Don't update filter immediately - staged selection
                aria-label="Custom max price"
                className={cn("pl-12 w-28", UI_TOKENS.FILTER_PILL)}
              />
            </div>
          )}

          {/* Bedrooms */}
          <select
            aria-label="Bedrooms"
            value={bedrooms || ""}
            onChange={() => {
              // Don't update filter immediately - staged selection
            }}
            className={cn(
              PILL_CLS,
              UI_TOKENS.FILTER_PILL,
              "shrink-0 h-11",
            )}
          >
            <option value="" disabled hidden>Bedrooms</option>
            <option value="all">Any</option>
            {BEDROOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* More filters toggle */}
          <button
            type="button"
            onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
            aria-expanded={moreFiltersOpen}
            aria-label="More filters"
            className={cn(
              PILL_CLS,
              UI_TOKENS.FILTER_PILL,
              "shrink-0 justify-center",
              moreFiltersOpen && "border-blue-500 text-blue-700 dark:border-blue-500 dark:text-blue-400",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>More filters</span>
          </button>
        </div>

        {moreFiltersOpen && (
          <div className="mt-3 p-0">
            {moreFiltersPanel}
          </div>
        )}
      </div>

      {actions && (
        <div className="mx-auto hidden w-full max-w-5xl lg:flex">
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
              <div className="mx-auto mt-3 w-full max-w-5xl lg:hidden">
          {searchInput}
        </div>
      )}

      <div className="mx-auto mt-3 w-full max-w-5xl space-y-3 lg:hidden">
        {/* Property Type — mobile trigger opens the canonical PropertyTypeFilter sheet */}
        <button
          type="button"
          id="mobile-property-type"
          aria-haspopup="listbox"
          onClick={() => propertyTypeRef.current?.openMobile()}
          className={cn(
            PILL_CLS,
            UI_TOKENS.FILTER_PILL,
            "w-full justify-between",
          )}
        >
          <span className="truncate">{propertyTypeLabel}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-50 transition-transform",
            )}
          />
        </button>

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
        <button
          type="button"
          className={cn(
            PILL_CLS,
            UI_TOKENS.FILTER_PILL,
            "w-full justify-center gap-3 border border-gray-200 h-11",
            moreFiltersOpen && "border-blue-500 text-blue-700",
          )}
          onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
          aria-expanded={moreFiltersOpen}
          aria-label="More filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>More Filters</span>
        </button>

        {moreFiltersOpen && (
          <div className="p-0">
            {moreFiltersPanel}
          </div>
        )}

        {/* Search / Apply button */}
        <Button
          type={variant === "hero" ? "submit" : "button"}
          onClick={
            variant === "default"
              ? () => {
                  const params = new URLSearchParams(searchParams.toString());
                  // Replace property type ids with staged/local selection
                  params.delete("property_type_id");
                const committed = propertyTypeRef.current?.getCommittedIds() ?? urlPropertyTypeIds;
                committed.forEach((id) => params.append("property_type_id", id));
                // Apply staged custom min/max prices if present
                if (localMinPrice) params.set("min_price", localMinPrice);
                else params.delete("min_price");
                if (localMaxPrice) params.set("max_price", localMaxPrice);
                else params.delete("max_price");
                params.delete("page");
                const query = params.toString();
                router.push(query ? `${pathname}?${query}` : pathname);
              }
              : undefined
          }
          className={cn(
            "h-11 w-full rounded-xl text-sm font-medium text-white",
            variant === "hero"
              ? "bg-gray-400 hover:bg-gray-500"
              : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          Search
        </Button>
      </div>

      {actions && (
        <div className="mx-auto mt-3 w-full max-w-5xl lg:hidden">
          {actions}
        </div>
      )}
    </>
  );

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
}
