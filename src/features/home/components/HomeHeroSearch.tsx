"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LISTING_TYPE_LABELS,
  LISTING_TYPES,
} from "@/features/properties/lib/propertyOptions";
import { usePropertyTypes } from "@/features/properties/hooks";
import type { ListingType } from "@/types";
import { cn } from "@/lib/utils";

const TAB_LABELS: Record<ListingType, string> = {
  sale: "Buy",
  rent: "Rent",
  lease: "Lease",
};

function selectClassName() {
  return "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
}

export function HomeHeroSearch() {
  const router = useRouter();
  const propertyTypesQuery = usePropertyTypes();
  const [search, setSearch] = useState("");
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    params.set("listing_type", listingType);

    if (propertyTypeId) {
      params.set("property_type_id", propertyTypeId);
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

    router.push(`/properties?${params.toString()}`);
  };

  return (
    <section className="bg-gray-50 px-4 py-5 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center">
        <div className="inline-flex h-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {LISTING_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "min-w-20 px-4 text-sm font-semibold transition",
                listingType === type
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
              )}
              onClick={() => setListingType(type)}
            >
              {TAB_LABELS[type] ?? LISTING_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <form
          className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="home-property-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, keyword, or area"
              autoComplete="off"
              className="h-12 rounded-xl bg-white pl-11 dark:bg-gray-900"
            />
          </div>

          <Popover>
            <PopoverTrigger
              className="inline-flex h-12 min-w-36 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <span>Filters</span>
              <span className="text-xs text-gray-400">v</span>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="home-property-type"
                    className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
                  >
                    Property type
                  </label>
                  <select
                    id="home-property-type"
                    value={propertyTypeId}
                    onChange={(event) => setPropertyTypeId(event.target.value)}
                    disabled={propertyTypesQuery.isLoading || propertyTypesQuery.isError}
                    className={selectClassName()}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="home-min-price"
                      className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
                    >
                      Min price
                    </label>
                    <Input
                      id="home-min-price"
                      type="number"
                      value={minPrice}
                      placeholder="0"
                      onChange={(event) => setMinPrice(event.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="home-max-price"
                      className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
                    >
                      Max price
                    </label>
                    <Input
                      id="home-max-price"
                      type="number"
                      value={maxPrice}
                      placeholder="Any"
                      onChange={(event) => setMaxPrice(event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="home-bedrooms"
                    className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
                  >
                    Bedrooms
                  </label>
                  <select
                    id="home-bedrooms"
                    value={bedrooms}
                    onChange={(event) => setBedrooms(event.target.value)}
                    className={selectClassName()}
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                  </select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button type="submit" className="h-12 shrink-0 px-6">
            Search properties
          </Button>
        </form>
      </div>
    </section>
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
