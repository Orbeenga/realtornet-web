"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
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

interface SearchInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
  className?: string;
}

interface FilterPopoverProps {
  label: string;
  value?: string | null;
  children: React.ReactNode;
}

function SearchInput({ initialValue, onCommit, className }: SearchInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className={cn("relative flex min-w-0 items-center", className)}>
      <Search className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400" />
      <input
        type="text"
        aria-label="Search properties"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit(value);
          }
        }}
        onBlur={() => onCommit(value)}
        placeholder="Search by title, keyword, or area"
        className="h-11 w-full rounded-full border border-gray-200 bg-white pr-4 pl-11 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
    </div>
  );
}

function FilterPopover({ label, value, children }: FilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none group-open:border-blue-300 group-open:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-500/50"
      >
        <span>{value || label}</span>
        <span className="text-xs text-gray-400">∨</span>
      </PopoverTrigger>
      <PopoverContent>{children}</PopoverContent>
    </Popover>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
    >
      {children}
    </label>
  );
}

export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const plainSearchParams = new URLSearchParams(searchParams.toString());
  const propertyTypesQuery = usePropertyTypes();
  const [mobilePanelKey, setMobilePanelKey] = useState(0);

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
    setMobilePanelKey((current) => current + 1);
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

  const filterFields = (
    <>
      <div>
        <FieldLabel htmlFor="listing-type">Listing type</FieldLabel>
        <select
          id="listing-type"
          value={listingType}
          onChange={(event) => updateFilter("listing_type", event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All listing types</option>
          {LISTING_TYPES.map((type) => (
            <option key={type} value={type}>
              {LISTING_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="min-price">Min price</FieldLabel>
          <Input
            id="min-price"
            type="number"
            value={minPrice}
            placeholder="0"
            onChange={(event) => updateFilter("min_price", event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="max-price">Max price</FieldLabel>
          <Input
            id="max-price"
            type="number"
            value={maxPrice}
            placeholder="Any"
            onChange={(event) => updateFilter("max_price", event.target.value)}
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="bedrooms">Bedrooms</FieldLabel>
        <select
          id="bedrooms"
          value={bedrooms}
          onChange={(event) => updateFilter("bedrooms", event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">Any</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5+</option>
        </select>
      </div>

      <div>
        <FieldLabel htmlFor="property-type">Property type</FieldLabel>
        <select
          id="property-type"
          value={propertyTypeId}
          onChange={(event) => updateFilter("property_type_id", event.target.value)}
          disabled={propertyTypesQuery.isLoading || propertyTypesQuery.isError}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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

      <div>
        <FieldLabel htmlFor="listing-status">Status</FieldLabel>
        <select
          id="listing-status"
          value={listingStatus}
          onChange={(event) => updateFilter("listing_status", event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LISTING_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 lg:hidden">
        <SearchInput
          key={searchParams.get("search") ?? ""}
          initialValue={searchParams.get("search") ?? ""}
          onCommit={(value) => updateFilter("search", value)}
        />
        <details key={mobilePanelKey} className="group">
          <summary className="inline-flex h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none [&::-webkit-details-marker]:hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </summary>
          <div
            role="dialog"
            aria-label="Property filters"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-white p-5 shadow-2xl dark:bg-gray-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Filters
              </h2>
              <Button type="button" variant="ghost" onClick={clearAll} disabled={!hasFilters}>
                Clear all
              </Button>
            </div>
            <div className="space-y-4">{filterFields}</div>
          </div>
        </details>
        <PropertyFiltersSavedSearch searchParams={plainSearchParams} compact />
      </div>

      <div className="hidden min-w-0 items-center gap-2 lg:flex">
        <SearchInput
          key={searchParams.get("search") ?? ""}
          initialValue={searchParams.get("search") ?? ""}
          onCommit={(value) => updateFilter("search", value)}
          className="flex-1"
        />
        <FilterPopover
          label="For sale"
          value={listingTypeLabel}
        >
          <div className="space-y-3">
            <FieldLabel htmlFor="listing-type-popover">Listing type</FieldLabel>
            <select
              id="listing-type-popover"
              value={listingType}
              onChange={(event) => updateFilter("listing_type", event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All listing types</option>
              {LISTING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {LISTING_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </FilterPopover>
        <FilterPopover
          label="Price"
          value={
            minPrice || maxPrice
              ? `${minPrice ? `₦${Number(minPrice).toLocaleString()}` : "Any"} - ${
                  maxPrice ? `₦${Number(maxPrice).toLocaleString()}` : "Any"
                }`
              : null
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="min-price-popover">Min</FieldLabel>
              <Input
                id="min-price-popover"
                type="number"
                value={minPrice}
                placeholder="0"
                onChange={(event) => updateFilter("min_price", event.target.value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="max-price-popover">Max</FieldLabel>
              <Input
                id="max-price-popover"
                type="number"
                value={maxPrice}
                placeholder="Any"
                onChange={(event) => updateFilter("max_price", event.target.value)}
              />
            </div>
          </div>
        </FilterPopover>
        <FilterPopover label="Beds & baths" value={bedrooms ? `${bedrooms}+ beds` : null}>
          <div>
            <FieldLabel htmlFor="bedrooms-popover">Bedrooms</FieldLabel>
            <select
              id="bedrooms-popover"
              value={bedrooms}
              onChange={(event) => updateFilter("bedrooms", event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>
        </FilterPopover>
        <FilterPopover
          label="Property type"
          value={selectedPropertyType?.name ?? null}
        >
          <div>
            <FieldLabel htmlFor="property-type-popover">Property type</FieldLabel>
            <select
              id="property-type-popover"
              value={propertyTypeId}
              onChange={(event) => updateFilter("property_type_id", event.target.value)}
              disabled={propertyTypesQuery.isLoading || propertyTypesQuery.isError}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
        </FilterPopover>
        <FilterPopover
          label="More filters"
          value={listingStatusLabel}
        >
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="listing-status-popover">Listing status</FieldLabel>
              <select
                id="listing-status-popover"
                value={listingStatus}
                onChange={(event) => updateFilter("listing_status", event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
        </FilterPopover>
        <PropertyFiltersSavedSearch searchParams={plainSearchParams} compact />
      </div>
    </div>
  );
}
