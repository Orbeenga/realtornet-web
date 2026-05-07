"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
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
import { usePropertyTypes } from "@/features/properties/hooks";
import { cn } from "@/lib/utils";
import { PropertyFiltersSavedSearch } from "./PropertyFiltersSavedSearch";

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
          type="text"
          aria-label="Search properties"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => onCommit(value)}
          placeholder="Search by title, keyword, or area"
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
      className="min-w-0 flex-1"
    >
      <PopoverTrigger
        className={cn(
          "inline-flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100",
          isOpen && "border-blue-300 text-blue-700 dark:border-blue-500/60",
        )}
      >
        <span className="truncate">{value || label}</span>
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
  const propertyTypesQuery = usePropertyTypes();
  const [openPanel, setOpenPanel] = useState<FilterPanel | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  const clearAll = () => {
    router.push(pathname);
    setOpenPanel(null);
    setMobileFiltersOpen(false);
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
  const bedrooms = searchParams.get("bedrooms") ?? "";
  const hasFilters = searchParams.toString().length > 0;
  const selectClassName = SelectClassName();

  const propertyTypeField = (id = "property-type") => (
    <div>
      <FieldLabel htmlFor={id}>Property type</FieldLabel>
      <select
        id={id}
        value={propertyTypeId}
        onChange={(event) => updateFilter("property_type_id", event.target.value)}
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

  const minPriceField = (id = "min-price") => (
    <div>
      <FieldLabel htmlFor={id}>Min price</FieldLabel>
      <Input
        id={id}
        type="number"
        value={minPrice}
        placeholder="0"
        onChange={(event) => updateFilter("min_price", event.target.value)}
      />
    </div>
  );

  const maxPriceField = (id = "max-price") => (
    <div>
      <FieldLabel htmlFor={id}>Max price</FieldLabel>
      <Input
        id={id}
        type="number"
        value={maxPrice}
        placeholder="Any"
        onChange={(event) => updateFilter("max_price", event.target.value)}
      />
    </div>
  );

  const bedroomsField = (id = "bedrooms") => (
    <div>
      <FieldLabel htmlFor={id}>Bedrooms</FieldLabel>
      <select
        id={id}
        value={bedrooms}
        onChange={(event) => updateFilter("bedrooms", event.target.value)}
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
        <FieldLabel htmlFor="listing-type">Listing type</FieldLabel>
        <select
          id="listing-type"
          value={listingType}
          onChange={(event) => updateFilter("listing_type", event.target.value)}
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
          onChange={(event) => updateFilter("listing_status", event.target.value)}
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

  const mobileFilterFields = (
    <div className="space-y-4">
      {propertyTypeField("mobile-property-type")}
      <div className="grid grid-cols-2 gap-3">
        {minPriceField("mobile-min-price")}
        {maxPriceField("mobile-max-price")}
      </div>
      {bedroomsField("mobile-bedrooms")}
      {moreFilters}
    </div>
  );

  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="space-y-3">
        <SearchInput
          key={searchParams.get("search") ?? ""}
          initialValue={searchParams.get("search") ?? ""}
          onCommit={(value) => updateFilter("search", value)}
          className="w-full"
        />

        <div className="flex flex-col gap-3 lg:hidden">
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full justify-center rounded-xl"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <PropertyFiltersSavedSearch searchParams={plainSearchParams} compact />
        </div>

        <div className="hidden min-w-0 items-center gap-3 lg:flex">
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
            value={listingStatusLabel ?? listingTypeLabel}
            openPanel={openPanel}
            onOpenPanelChange={setOpenPanel}
          >
            {moreFilters}
          </FilterPopover>
          <div className="shrink-0">
            <PropertyFiltersSavedSearch searchParams={plainSearchParams} compact />
          </div>
        </div>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 bg-black/35 lg:hidden">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Property filters"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-white p-5 shadow-2xl dark:bg-gray-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Filters
              </h2>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {mobileFilterFields}
          </div>
        </div>
      ) : null}
    </div>
  );
}
