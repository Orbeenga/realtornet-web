"use client";

import { Search, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/Input";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
} from "@/features/properties/lib/propertyOptions";
import { useLocations, usePropertyTypes } from "@/features/properties/hooks";
import { formatLocationLabel } from "@/features/properties/lib/locationLabels";
import { LocationCascadeSelector } from "@/features/locations/components/LocationCascadeSelector";
import { cn } from "@/lib/utils";
import { PropertyFiltersSavedSearch } from "./PropertyFiltersSavedSearch";

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

type FilterPanel = "propertyType" | "minPrice" | "maxPrice" | "bedrooms" | "more";

interface SearchInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
  className?: string;
}

interface FilterPopoverProps {
  id: FilterPanel;
  label: string;
  value?: string | null;
  openPanel: FilterPanel | null;
  onOpenPanelChange: (panel: FilterPanel | null) => void;
  children: ReactNode;
}

function SearchInput({ initialValue, onCommit, className }: SearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onCommit(value);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, onCommit]);

  return (
    <form
      className={cn("flex min-w-0 items-center gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onCommit(value);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          aria-label="Search properties"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => onCommit(value)}
          placeholder="Search by title, keyword, or area"
          autoComplete="off"
          enterKeyHint="search"
          inputMode="search"
          className="h-12 w-full rounded-xl border border-gray-200 bg-white pr-4 pl-11 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>
      <Button type="submit" className="h-12 shrink-0 px-5">
        Search
      </Button>
    </form>
  );
}

function FilterPopover({
  id,
  label,
  value,
  openPanel,
  onOpenPanelChange,
  children,
}: FilterPopoverProps) {
  const isOpen = openPanel === id;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => onOpenPanelChange(open ? id : null)}
      className="shrink-0"
    >
      <PopoverTrigger
        className={cn(
          "inline-flex h-11 w-auto items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
          isOpen && "border-blue-300 text-blue-700 dark:border-blue-500/60",
        )}
      >
        <span>{value || label}</span>
        <span className="shrink-0 text-xs text-gray-400">v</span>
      </PopoverTrigger>
      <PopoverContent className="w-80">{children}</PopoverContent>
    </Popover>
  );
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

export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const plainSearchParams = new URLSearchParams(searchParams.toString());
  plainSearchParams.delete("view");
  const propertyTypesQuery = usePropertyTypes();
  const locationId = searchParams.get("location_id")
    ? Number(searchParams.get("location_id"))
    : undefined;
  const locationsQuery = useLocations(typeof locationId === "number");
  const [openPanel, setOpenPanel] = useState<FilterPanel | null>(null);
  // Mobile inline approach replaces previous drawer
  const [customMinMode, setCustomMinMode] = useState(false);
  const [customMaxMode, setCustomMaxMode] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollYRef = useRef<number | null>(null);
  // Local staged values for custom price inputs (initialized after reading URL params below)
  const _localMinPriceInit = "";
  const _localMaxPriceInit = "";

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Removed body scroll lock: no full-screen drawer anymore on mobile

  useEffect(() => {
    if (pendingScrollYRef.current === null) {
      return;
    }

    const scrollY = pendingScrollYRef.current;
    pendingScrollYRef.current = null;
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, [searchParams]);

  // Effects syncing local price values are defined after minPrice/maxPrice declarations below.

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

  const updateFilterDebounced = useCallback(
    (key: string, value: string) => {
      pendingScrollYRef.current = window.scrollY;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateFilter(key, value);
      }, 350);
    },
    [updateFilter],
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

  const clearAll = () => {
    const view = searchParams.get("view");
    router.push(view === "map" ? `${pathname}?view=map` : pathname);
    setOpenPanel(null);
    setCustomMinMode(false);
    setCustomMaxMode(false);
  };

  const listingType = searchParams.get("listing_type") ?? "";
  const listingStatus = searchParams.get("listing_status") ?? "";
  const listingTypeLabel = LISTING_TYPES.includes(
    listingType as (typeof LISTING_TYPES)[number],
  )
    ? LISTING_TYPE_LABELS[listingType as (typeof LISTING_TYPES)[number]]
    : null;
  const listingStatusLabel = LISTING_STATUSES.includes(
    listingStatus as (typeof LISTING_STATUSES)[number],
  )
    ? LISTING_STATUS_LABELS[listingStatus as (typeof LISTING_STATUSES)[number]]
    : null;
  const propertyTypeId = searchParams.get("property_type_id") ?? "";
  const selectedPropertyType = (propertyTypesQuery.data ?? []).find(
    (propertyType) => String(propertyType.property_type_id) === propertyTypeId,
  );
  const minPrice = searchParams.get("min_price") ?? "";
  const maxPrice = searchParams.get("max_price") ?? "";
  const [localMinPrice, setLocalMinPrice] = useState(minPrice ?? _localMinPriceInit);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice ?? _localMaxPriceInit);
  const bedrooms = searchParams.get("bedrooms") ?? "";
  const bathrooms = searchParams.get("bathrooms") ?? "";
  const locationValue = {
    state: searchParams.get("state") ?? "",
    city: searchParams.get("city") ?? "",
    neighborhood: searchParams.get("neighborhood") ?? "",
    locationId,
  };
  const selectedLocation = (locationsQuery.data ?? []).find(
    (location) => location.location_id === locationId,
  );
  const locationLabel =
    locationValue.neighborhood ||
    locationValue.city ||
    locationValue.state ||
    formatLocationLabel(selectedLocation) ||
    null;
  const currentView = searchParams.get("view") === "map" ? "map" : "grid";
  // Keep staged inputs in sync when URL-owned values change externally
  useEffect(() => {
    setLocalMinPrice(minPrice);
  }, [minPrice]);

  useEffect(() => {
    setLocalMaxPrice(maxPrice);
  }, [maxPrice]);
  const hasFilters = Array.from(searchParams.keys()).some((key) => key !== "view");
  const selectClassName = SelectClassName();
  const viewHref = (view: "grid" | "map") => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("view", view);
    params.delete("page");

    if (view === "grid") {
      params.delete("view");
    }

    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  };
  const viewToggle = (
    <div className="inline-flex h-11 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {(["grid", "map"] as const).map((view) => (
        <Link
          key={view}
          href={viewHref(view)}
          prefetch={false}
          className={cn(
            "inline-flex min-w-16 items-center justify-center px-3 text-sm font-medium transition",
            currentView === view
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
          )}
        >
          {view === "grid" ? "Grid" : "Map"}
        </Link>
      ))}
    </div>
  );

  const propertyTypeField = (id = "property-type") => (
    <div>
      <FieldLabel htmlFor={id}>Property type</FieldLabel>
      <select
        id={id}
        value={propertyTypeId}
        onChange={(event) => updateFilterDebounced("property_type_id", event.target.value)}
        disabled={propertyTypesQuery.isLoading || propertyTypesQuery.isError}
        className={selectClassName}
      >
        <option value="">
          {propertyTypesQuery.isLoading
            ? "Loading property types..."
            : propertyTypesQuery.isError
              ? "Property types unavailable"
              : "All property types"}
        </option>
        {(propertyTypesQuery.data ?? []).map((propertyType) => (
          <option
            key={propertyType.property_type_id}
            value={propertyType.property_type_id}
          >
            {propertyType.name}
          </option>
        ))}
      </select>
    </div>
  );

  const isMinCustomPreset = Boolean(minPrice) && !PRICE_OPTIONS.some((o) => o.value === minPrice);
  const showCustomMin = customMinMode || isMinCustomPreset;
  const minSelectValue = showCustomMin ? "custom" : minPrice;

  const isMaxCustomPreset = Boolean(maxPrice) && !PRICE_OPTIONS.some((o) => o.value === maxPrice);
  const showCustomMax = customMaxMode || isMaxCustomPreset;
  const maxSelectValue = showCustomMax ? "custom" : maxPrice;

  const minPriceField = (id = "min-price") => (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>Min price</FieldLabel>
      <select
        id={id}
        value={minSelectValue}
        onChange={(event) => {
          if (event.target.value === "custom") {
            setCustomMinMode(true);
            updateFilterDebounced("min_price", "");
            return;
          }
          setCustomMinMode(false);
          updateFilterDebounced("min_price", event.target.value);
        }}
        className={selectClassName}
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
            updateFilterDebounced("max_price", "");
            return;
          }
          setCustomMaxMode(false);
          updateFilterDebounced("max_price", event.target.value);
        }}
        className={selectClassName}
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
        onChange={(event) => updateFilterDebounced("bedrooms", event.target.value)}
        className={selectClassName}
      >
        <option value="">Any</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5+</option>
      </select>
    </div>
  );

  const bathroomsField = (id = "bathrooms") => (
    <div>
      <FieldLabel htmlFor={id}>Bathrooms</FieldLabel>
      <select
        id={id}
        value={bathrooms}
        onChange={(event) => updateFilterDebounced("bathrooms", event.target.value)}
        className={selectClassName}
      >
        <option value="">Any</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5+</option>
      </select>
    </div>
  );

  const moreFilters = (
    <div className="space-y-4">
      <div>
        <LocationCascadeSelector
          idPrefix="property-filter-location"
          value={locationValue}
          onChange={updateLocationFilters}
          compact
        />
      </div>

      <div>
        <FieldLabel htmlFor="listing-type">Listing type</FieldLabel>
        <select
          id="listing-type"
          value={listingType}
          onChange={(event) => updateFilterDebounced("listing_type", event.target.value)}
          className={selectClassName}
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
          onChange={(event) => updateFilterDebounced("listing_status", event.target.value)}
          className={selectClassName}
        >
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LISTING_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <Button type="button" variant="ghost" onClick={clearAll} disabled={!hasFilters}>
        Clear all
      </Button>
    </div>
  );

  const [mobileInlineMoreOpen, setMobileInlineMoreOpen] = useState(false);
  const searchRowRef = useRef<HTMLDivElement | null>(null);
  const searchInnerRef = useRef<HTMLDivElement | null>(null);
  const filterRowRef = useRef<HTMLDivElement | null>(null);

  // Desktop-only: make search row exact same visible width as the desktop filter row
  useEffect(() => {
    const measureUnionWidth = (el: HTMLElement) => {
      const children = Array.from(el.children) as HTMLElement[];
      let minLeft = Number.POSITIVE_INFINITY;
      let maxRight = Number.NEGATIVE_INFINITY;
      children.forEach((ch) => {
        const r = ch.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          if (r.left < minLeft) minLeft = r.left;
          if (r.right > maxRight) maxRight = r.right;
        }
      });
      if (!Number.isFinite(minLeft) || !Number.isFinite(maxRight)) return 0;
      return Math.max(0, Math.round(maxRight - minLeft));
    };

    const applyWidth = () => {
      if (typeof window === "undefined") return;
      const isDesktop = window.innerWidth >= 1024;
      const s = searchInnerRef.current;
      const f = filterRowRef.current;
      if (!s) return;
      if (!isDesktop) {
        s.style.width = "";
        return;
      }
      if (!f) return;

      const union = measureUnionWidth(f);
      if (union > 0) {
        const parentWidth = Math.round(f.getBoundingClientRect().width);
        const widthPx = Math.min(union, parentWidth); // clamp to parent container
        s.style.width = `${widthPx}px`;
        try {
          localStorage.setItem("rn_desktop_row_w", String(widthPx));
        } catch {}
      }
    };

    const onLoad = () => applyWidth();
    if (document.readyState === "complete") applyWidth();
    else window.addEventListener("load", onLoad, { once: true } as AddEventListenerOptions);
    window.addEventListener("resize", applyWidth);
    const t = setTimeout(applyWidth, 0);
    return () => {
      window.removeEventListener("resize", applyWidth);
      clearTimeout(t);
    };
  }, []);

  // Dev-only: log rendered widths to the console for verification
  useEffect(() => {
    const log = () => {
      try {
        const s = document.querySelector('[data-rn-prop-search-row]') as HTMLElement | null;
        const f = document.querySelector('[data-rn-prop-filter-row]') as HTMLElement | null;
        if (!s || !f) return;
        const sw = Math.round(s.getBoundingClientRect().width);
        const fw = Math.round(f.getBoundingClientRect().width);
        const pw = Math.round((searchRowRef.current as HTMLElement)?.getBoundingClientRect().width || 0);
        // Detect overflow children relative to parent bounds
        const pr = (searchRowRef.current as HTMLElement)?.getBoundingClientRect() || s.getBoundingClientRect();
        [s, f].forEach((el) => {
          Array.from(el.children).forEach((ch) => {
            const r = (ch as HTMLElement).getBoundingClientRect();
            if (r.right > pr.right + 1 || r.left < pr.left - 1) {
              console.log('RN: properties overflow child', { className: (ch as HTMLElement).className, left: r.left, right: r.right, parentLeft: pr.left, parentRight: pr.right });
            }
          });
        });
        const siw = Math.round((searchInnerRef.current as HTMLElement)?.getBoundingClientRect().width || 0);
        console.log('RN: properties widths', { parent: pw, searchWrapper: sw, searchInner: siw, filter: fw });
      } catch {}
    };
    const onLoad = () => log();
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') log(); else window.addEventListener('load', onLoad, { once: true } as AddEventListenerOptions);
      window.addEventListener('resize', log);
      // initial async log after mount
      setTimeout(log, 0);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', log);
      }
    };
  }, []);

  return (
    <div className="mb-8">
      <div className="space-y-3">
        <div ref={searchRowRef} className="mx-auto w-full max-w-7xl" data-rn-prop-search-row>
          <div ref={searchInnerRef} className="min-w-0">
            <SearchInput
              key={searchParams.get("search") ?? ""}
              initialValue={searchParams.get("search") ?? ""}
              onCommit={(value) => updateFilter("search", value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl flex flex-col gap-3 lg:hidden">
          <div className="flex justify-center">{viewToggle}</div>
        </div>

        <div ref={filterRowRef} className="mx-auto hidden w-full max-w-7xl min-w-0 items-center gap-3 lg:flex flex-wrap" data-rn-prop-filter-row>
          <FilterPopover
            id="propertyType"
            label="Property Type"
            value={selectedPropertyType?.name ?? null}
            openPanel={openPanel}
            onOpenPanelChange={setOpenPanel}
          >
            {propertyTypeField("property-type-popover")}
          </FilterPopover>
          <FilterPopover
            id="minPrice"
            label="Min Price"
            value={minPrice ? `NGN ${Number(minPrice).toLocaleString()}` : null}
            openPanel={openPanel}
            onOpenPanelChange={setOpenPanel}
          >
            {minPriceField("min-price-popover")}
          </FilterPopover>
          <FilterPopover
            id="maxPrice"
            label="Max Price"
            value={maxPrice ? `NGN ${Number(maxPrice).toLocaleString()}` : null}
            openPanel={openPanel}
            onOpenPanelChange={setOpenPanel}
          >
            {maxPriceField("max-price-popover")}
          </FilterPopover>
          <FilterPopover
            id="bedrooms"
            label="Bedrooms"
            value={bedrooms ? `${bedrooms}+ beds` : null}
            openPanel={openPanel}
            onOpenPanelChange={setOpenPanel}
          >
            {bedroomsField("bedrooms-popover")}
          </FilterPopover>
          <FilterPopover
            id="more"
            label="Filters"
            value={locationLabel ?? listingStatusLabel ?? listingTypeLabel}
            openPanel={openPanel}
            onOpenPanelChange={setOpenPanel}
          >
            {moreFilters}
          </FilterPopover>
          <div className="shrink-0">
            <PropertyFiltersSavedSearch searchParams={plainSearchParams} compact />
          </div>
          {viewToggle}
        </div>
      </div>

      {/* Mobile inline filters layout */}
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
          className="inline-flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          onClick={() => setMobileInlineMoreOpen((v) => !v)}
          aria-expanded={mobileInlineMoreOpen ? "true" : "false"}
          aria-controls="mobile-inline-more"
        >
          <span>Filters</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", mobileInlineMoreOpen ? "rotate-180" : "rotate-0")} />
        </button>
        {mobileInlineMoreOpen ? (
          <div id="mobile-inline-more" className="space-y-4">
            {moreFilters}
          </div>
        ) : null}
      </div>

      {/* Mobile saved search moved below filters console */}
      <div className="mx-auto mt-3 w-full max-w-2xl lg:hidden">
        <PropertyFiltersSavedSearch searchParams={plainSearchParams} compact fullWidth />
      </div>

      {/* Mobile drawer removed in favor of inline expanded section above */}
    </div>
  );
}
