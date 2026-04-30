"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/Input";
import {
  LISTING_STATUSES,
  LISTING_STATUS_LABELS,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
} from "@/features/properties/lib/propertyOptions";

const PropertyFiltersSavedSearch = dynamic(
  () =>
    import("./PropertyFiltersSavedSearch").then(
      (module) => module.PropertyFiltersSavedSearch,
    ),
  {
    loading: () => null,
  },
);

interface DeferredNumberFilterInputProps {
  id: string;
  initialValue: string;
  placeholder: string;
  onCommit: (value: string) => void;
}

function DeferredNumberFilterInput({
  id,
  initialValue,
  placeholder,
  onCommit,
}: DeferredNumberFilterInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <Input
      id={id}
      type="number"
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={(event) => onCommit(event.target.value)}
      className="text-sm"
    />
  );
}

export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const plainSearchParams = new URLSearchParams(searchParams.toString());

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const clearAll = () => {
    router.push(pathname);
  };

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h2>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="listing-type"
          className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
        >
          Listing type
        </label>
        <select
          id="listing-type"
          value={searchParams.get("listing_type") ?? ""}
          onChange={(event) => updateFilter("listing_type", event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All types</option>
          {LISTING_TYPES.map((listingType) => (
            <option key={listingType} value={listingType}>
              {LISTING_TYPE_LABELS[listingType]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="listing-status"
          className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
        >
          Status
        </label>
        <select
          id="listing-status"
          value={searchParams.get("listing_status") ?? ""}
          onChange={(event) => updateFilter("listing_status", event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((listingStatus) => (
            <option key={listingStatus} value={listingStatus}>
              {LISTING_STATUS_LABELS[listingStatus]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="min-price"
          className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
        >
          Min price
        </label>
        <DeferredNumberFilterInput
          id="min-price"
          key={searchParams.get("min_price") ?? ""}
          initialValue={searchParams.get("min_price") ?? ""}
          placeholder="0"
          onCommit={(value) => updateFilter("min_price", value)}
        />
      </div>

      <div>
        <label
          htmlFor="max-price"
          className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
        >
          Max price
        </label>
        <DeferredNumberFilterInput
          id="max-price"
          key={searchParams.get("max_price") ?? ""}
          initialValue={searchParams.get("max_price") ?? ""}
          placeholder="Any"
          onCommit={(value) => updateFilter("max_price", value)}
        />
      </div>

      <div>
        <label
          htmlFor="bedrooms"
          className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
        >
          Bedrooms
        </label>
        <select
          id="bedrooms"
          value={searchParams.get("bedrooms") ?? ""}
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

      <PropertyFiltersSavedSearch
        // `ReadonlyURLSearchParams` is awkward to pass across a lazy boundary,
        // so we hand over a plain `URLSearchParams` copy that only contains the
        // current filter state.
        searchParams={plainSearchParams}
      />
    </div>
  );
}
