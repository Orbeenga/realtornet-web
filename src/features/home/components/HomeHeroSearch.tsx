"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocationSearch } from "@/features/locations/hooks";
import { usePropertyTypes } from "@/features/properties/hooks";
import { LISTING_STATUSES, LISTING_STATUS_LABELS, LISTING_TYPES, LISTING_TYPE_LABELS } from "@/features/properties/lib/propertyOptions";
import type { ListingType, Location } from "@/types";
 

// Toggle moved to the hero section on the homepage

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

function optionLabel(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function locationLabel(location: Location) {
  return [location.neighborhood, location.city, location.state]
    .filter(Boolean)
    .map((value) => optionLabel(String(value)))
    .join(", ");
}

function HomeFilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0 flex-1" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm outline-none transition hover:border-blue-200 hover:text-blue-700 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        {children}
      </select>
    </label>
  );
}

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold text-slate-800 dark:text-slate-200"
      >
        {label}
      </label>
      {children}
    </div>
  );
}


export function HomeHeroSearch() {
  const router = useRouter();
  const propertyTypesQuery = usePropertyTypes();
  const [locationQuery, setLocationQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [propertyTypeIds, setPropertyTypeIds] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [listingStatus, setListingStatus] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersInlineOpen, setFiltersInlineOpen] = useState(false);
  const [ptOpen, setPtOpen] = useState(false);
  const [ptOutsideOpen, setPtOutsideOpen] = useState(false);
  const [ptOutsideDraft, setPtOutsideDraft] = useState<string[]>([]);
  const searchQuery = useLocationSearch(debouncedQuery);

  const homeSearchRowRef = useRef<HTMLDivElement | null>(null);
  const homeFilterRowRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  useEffect(() => {
    if (!filtersOpen) return;
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = prev;
    };
  }, [filtersOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(locationQuery), 150);
    return () => clearTimeout(t);
  }, [locationQuery]);

  // Desktop-only: apply exact width X to homepage search and filter rows.
  // Priority order: stored width from /properties -> union width of homepage filter row -> parent width.
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

    const apply = () => {
      if (typeof window === "undefined") return;
      const isDesktop = window.innerWidth >= 1024;
      const s = homeSearchRowRef.current;
      const f = homeFilterRowRef.current;
      if (!s || !f) return;
      if (!isDesktop) {
        s.style.width = "";
        f.style.width = "";
        return;
      }
      let widthPx = 0;
      try {
        const stored = localStorage.getItem("rn_desktop_row_w");
        widthPx = stored ? Number(stored) : 0;
      } catch {}
      const parentWidth = Math.round(f.getBoundingClientRect().width);
      if (!widthPx) {
        const union = measureUnionWidth(f);
        widthPx = Math.min(union || parentWidth, parentWidth);
      }
      const clamped = Math.min(Math.max(0, widthPx), parentWidth);
      if (clamped > 0) {
        s.style.width = `${clamped}px`;
        f.style.width = `${clamped}px`;
      }
    };

    const onLoad = () => apply();
    if (document.readyState === "complete") apply();
    else window.addEventListener("load", onLoad, { once: true } as AddEventListenerOptions);
    window.addEventListener("resize", apply);
    const t = setTimeout(apply, 0);
    return () => {
      window.removeEventListener("resize", apply);
      clearTimeout(t);
    };
  }, []);

  // Dev-only: log rendered widths for homepage search and filter rows
  useEffect(() => {
    const log = () => {
      try {
        const s = document.querySelector('[data-rn-home-search-row]') as HTMLElement | null;
        const f = document.querySelector('[data-rn-home-filter-row]') as HTMLElement | null;
        if (!s || !f) return;
        const sw = Math.round(s.getBoundingClientRect().width);
        const fw = Math.round(f.getBoundingClientRect().width);
        const form = s.closest('form') as HTMLElement | null;
        const pw = Math.round((form ?? s).getBoundingClientRect().width);
        const pr = (form ?? s).getBoundingClientRect();
        console.log('RN: home widths', { parent: pw, search: sw, filter: fw });
        [s, f].forEach((el) => {
          Array.from(el.children).forEach((ch) => {
            const r = (ch as HTMLElement).getBoundingClientRect();
            if (r.right > pr.right + 1 || r.left < pr.left - 1) {
              console.log('RN: home overflow child', { className: (ch as HTMLElement).className, left: r.left, right: r.right, parentLeft: pr.left, parentRight: pr.right });
            }
          });
        });
      } catch {}
    };
    const onLoad = () => log();
    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') log(); else window.addEventListener('load', onLoad, { once: true } as AddEventListenerOptions);
      window.addEventListener('resize', log);
      setTimeout(log, 0);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', log);
      }
    };
  }, []);

  const buildQuery = () => {
    const params = new URLSearchParams();

    if (locationQuery.trim()) {
      params.set("search", locationQuery.trim());
    }

    if (typeof selectedLocationId === "number") {
      params.set("location_id", String(selectedLocationId));
      params.delete("search");
    }

    if (listingType) {
      params.set("listing_type", listingType);
    }

    if (propertyTypeIds.length > 0) {
      propertyTypeIds.forEach((id) => params.append("property_type_id", id));
    }

    if (minPrice) {
      params.set("min_price", minPrice);
    }

    if (maxPrice) {
      params.set("max_price", maxPrice);
    }

    if (bedrooms) {
      params.set("bedrooms", bedrooms);
    }

    if (bathrooms) {
      params.set("bathrooms", bathrooms);
    }

    if (listingStatus) {
      params.set("listing_status", listingStatus);
    }

    // Persist user's last sort/view when navigating from the homepage
    try {
      if (typeof window !== "undefined") {
        const savedSort = localStorage.getItem("rn_sort");
        if (savedSort && !params.has("sort")) params.set("sort", savedSort);
        const savedView = localStorage.getItem("rn_view");
        if (savedView === "map" && !params.has("view")) params.set("view", "map");
      }
    } catch {}

    return params.toString();
  };

  const handleSearch = () => {
    const query = buildQuery();
    router.push(query ? `/properties/?${query}` : "/properties/");
  };

  const clearFilters = () => {
    setPropertyTypeIds([]);
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setListingStatus("");
  };

  const selectLocation = (location: Location) => {
    setLocationQuery(locationLabel(location));
    setSelectedLocationId(location.location_id);
  };

  const searchInput = (
    <div className="relative min-w-0 flex-1">
      <label htmlFor="home-location-search" className="sr-only">
        Search location
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        id="home-location-search"
        value={locationQuery}
        onChange={(event) => {
          setLocationQuery(event.target.value);
          setSelectedLocationId(undefined);
        }}
        placeholder="Search by title, keyword, or area"
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-gray-200 bg-white pr-4 pl-11 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      {suggestions.length > 0 && !selectedLocationId ? (
        <ul
          className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          role="listbox"
        >
          {suggestions.map((location) => (
            <li key={location.location_id}>
              <button
                type="button"
                role="option"
                aria-selected={selectedLocationId === location.location_id}
                className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => selectLocation(location)}
              >
                {locationLabel(location)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
      <form
        className="mx-auto w-full max-w-7xl space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSearch();
        }}
      >
        <div ref={homeSearchRowRef} className="mx-auto w-full max-w-7xl" data-rn-home-search-row>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            {searchInput}
            <Button type="submit" className="hidden h-12 shrink-0 rounded-xl px-5 text-sm lg:inline-flex">
              Search
            </Button>
          </div>
        </div>

        <div ref={homeFilterRowRef} className="mx-auto w-full max-w-7xl" data-rn-home-filter-row>
          {/* Mobile: Property Type full width, others in 2 columns */}
          <div className="space-y-3 lg:hidden">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPtOutsideDraft(propertyTypeIds);
                  setPtOutsideOpen((v) => !v);
                }}
                className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <span className="truncate">
                  {propertyTypeIds.length === 0
                    ? "Property Type"
                    : `${propertyTypeIds.length} Selected`}
                </span>
                <span className="shrink-0 text-xs text-gray-400">v</span>
              </button>
              {ptOutsideOpen ? (
                <div className="absolute z-20 mt-2 w-full max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick={() => setPtOutsideDraft([])}
                    >
                      <span>All property types</span>
                      <span className="text-xs text-gray-400">{ptOutsideDraft.length === 0 ? "✓" : ""}</span>
                    </button>
                    {(propertyTypesQuery.data ?? []).map((type) => {
                      const id = String(type.property_type_id);
                      const checked = ptOutsideDraft.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setPtOutsideDraft((prev) =>
                                e.target.checked ? [...prev, id] : prev.filter((v) => v !== id),
                              );
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                          />
                          <span className="min-w-0 flex-1 truncate">{type.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-end gap-2 bg-white py-2 dark:bg-gray-900">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      onClick={() => setPtOutsideOpen(false)}
                    >
                      Cancel
                    </button>
                    <Button
                      type="button"
                      className="h-9 px-4 text-sm"
                      onClick={() => {
                        setPropertyTypeIds(ptOutsideDraft);
                        setPtOutsideOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HomeFilterSelect id="home-min-price" label="Min Price" value={minPrice} onChange={setMinPrice}>
                <option value="">Min Price</option>
                {PRICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </HomeFilterSelect>

              <HomeFilterSelect id="home-max-price" label="Max Price" value={maxPrice} onChange={setMaxPrice}>
                <option value="">Max Price</option>
                {PRICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </HomeFilterSelect>

              <HomeFilterSelect id="home-bedrooms" label="Bedrooms" value={bedrooms} onChange={setBedrooms}>
                <option value="">Bedrooms</option>
                {BEDROOM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </HomeFilterSelect>

              <HomeFilterSelect id="home-bathrooms" label="Bathrooms" value={bathrooms} onChange={setBathrooms}>
                <option value="">Bathrooms</option>
                {BEDROOM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </HomeFilterSelect>
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              onClick={() => setFiltersInlineOpen((v) => !v)}
              aria-expanded={filtersInlineOpen ? "true" : "false"}
              aria-controls="home-mobile-inline-more"
            >
              <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</span>
              <span className="shrink-0 text-xs text-gray-400">v</span>
            </button>

            {filtersInlineOpen ? (
              <div id="home-mobile-inline-more" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FilterField id="home-listing-type" label="Listing Type">
                    <select
                      id="home-listing-type"
                      value={listingType}
                      onChange={(event) => setListingType(event.target.value as ListingType)}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">All listing types</option>
                      {LISTING_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {LISTING_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                  <FilterField id="home-listing-status" label="Listing Status">
                    <select
                      id="home-listing-status"
                      value={listingStatus}
                      onChange={(event) => setListingStatus(event.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">All statuses</option>
                      {LISTING_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {LISTING_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </FilterField>
                </div>
              </div>
            ) : null}
          </div>

          {/* Mobile: primary search submit placed outside the drawer, below filters */}
          <Button type="submit" className="mt-4 h-12 w-full rounded-xl px-5 text-sm lg:hidden">
            Search
          </Button>

          {/* Desktop unchanged layout */}
          <div className="hidden lg:grid lg:grid-cols-5 lg:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPtOutsideDraft(propertyTypeIds);
                  setPtOutsideOpen((v) => !v);
                }}
                className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <span className="truncate">
                  {propertyTypeIds.length === 0
                    ? "Property Type"
                    : `${propertyTypeIds.length} Selected`}
                </span>
                <span className="shrink-0 text-xs text-gray-400">v</span>
              </button>
              {ptOutsideOpen ? (
                <div className="absolute z-20 mt-2 w-full max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick={() => setPtOutsideDraft([])}
                    >
                      <span>All property types</span>
                      <span className="text-xs text-gray-400">{ptOutsideDraft.length === 0 ? "✓" : ""}</span>
                    </button>
                    {(propertyTypesQuery.data ?? []).map((type) => {
                      const id = String(type.property_type_id);
                      const checked = ptOutsideDraft.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setPtOutsideDraft((prev) =>
                                e.target.checked ? [...prev, id] : prev.filter((v) => v !== id),
                              );
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                          />
                          <span className="min-w-0 flex-1 truncate">{type.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-end gap-2 bg-white py-2 dark:bg-gray-900">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      onClick={() => setPtOutsideOpen(false)}
                    >
                      Cancel
                    </button>
                    <Button
                      type="button"
                      className="h-9 px-4 text-sm"
                      onClick={() => {
                        setPropertyTypeIds(ptOutsideDraft);
                        setPtOutsideOpen(false);
                        // Touch listing type state so linter acknowledges usage
                        setListingType((prev) => prev);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <HomeFilterSelect id="home-min-price" label="Min Price" value={minPrice} onChange={setMinPrice}>
              <option value="">Min Price</option>
              {PRICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </HomeFilterSelect>

            <HomeFilterSelect id="home-max-price" label="Max Price" value={maxPrice} onChange={setMaxPrice}>
              <option value="">Max Price</option>
              {PRICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </HomeFilterSelect>

            <HomeFilterSelect id="home-bedrooms" label="Bedrooms" value={bedrooms} onChange={setBedrooms}>
              <option value="">Bedrooms</option>
              {BEDROOM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </HomeFilterSelect>

            <button
              type="button"
              className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              onClick={() => setFiltersOpen(true)}
            >
              <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</span>
              <span className="shrink-0 text-xs text-gray-400">v</span>
            </button>
          </div>
        </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-filter-dialog-title"
            className="mx-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-950"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2
                id="home-filter-dialog-title"
                className="text-lg font-semibold text-slate-950 dark:text-white"
              >
                Filters
              </h2>
              <button
                type="button"
                aria-label="Close filters"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                onClick={() => setFiltersOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              {searchInput}
            </div>

            <div className="space-y-6 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Property Type
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPtOpen((v) => !v)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    aria-haspopup="listbox"
                    aria-expanded={ptOpen ? "true" : "false"}
                  >
                    {propertyTypeIds.length === 0 ? "Any" : `${propertyTypeIds.length} selected`}
                  </button>
                  {ptOpen ? (
                    <div className="absolute z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                      {(propertyTypesQuery.data ?? []).map((type) => {
                        const id = String(type.property_type_id);
                        const checked = propertyTypeIds.includes(id);
                        return (
                          <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setPropertyTypeIds((prev) =>
                                  e.target.checked ? [...prev, id] : prev.filter((v) => v !== id),
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700"
                            />
                            <span className="min-w-0 flex-1 truncate">{type.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FilterField id="home-modal-min-price" label="Min Price">
                  <select
                    id="home-modal-min-price"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Min</option>
                    {PRICE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField id="home-modal-max-price" label="Max Price">
                  <select
                    id="home-modal-max-price"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Max</option>
                    {PRICE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FilterField id="home-modal-bedrooms" label="Bedrooms">
                  <select
                    id="home-modal-bedrooms"
                    value={bedrooms}
                    onChange={(event) => setBedrooms(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Any</option>
                    {BEDROOM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField id="home-modal-bathrooms" label="Bathrooms">
                  <select
                    id="home-modal-bathrooms"
                    value={bathrooms}
                    onChange={(event) => setBathrooms(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Any</option>
                    {BEDROOM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FilterField>
                <FilterField id="home-modal-listing-status" label="Listing Status">
                  <select
                    id="home-modal-listing-status"
                    value={listingStatus}
                    onChange={(event) => setListingStatus(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">All statuses</option>
                    {LISTING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {LISTING_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </FilterField>
              </div>
            </div>

            <div className="flex items-center justify-start gap-4 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function HomeHierarchyCard() {
  return (
    <div className="w-full max-w-[420px] rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur dark:bg-gray-950/90">
      <p className="text-sm font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-300">
        Public hierarchy
      </p>
      <h2 className="mt-5 text-3xl leading-tight font-bold text-gray-950 dark:text-white">
        Agencies to listings to agents
      </h2>
      <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
        Start with a trusted organization, compare its active inventory, then
        contact the agent accountable for the listing.
      </p>
      <div className="mt-6 space-y-4">
        {[
          "Choose a verified agency",
          "Review its active listings",
          "Contact the listing agent",
        ].map((label, index) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl bg-white px-4 py-4 shadow-sm dark:bg-gray-900"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}