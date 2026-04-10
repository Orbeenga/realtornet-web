"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import { useCreateSavedSearch } from "@/features/properties/hooks";
import { getSavableSearchParams } from "@/features/properties/lib/savedSearchParams";

interface DeferredNumberFilterInputProps {
  initialValue: string;
  placeholder: string;
  onCommit: (value: string) => void;
}

function DeferredNumberFilterInput({
  initialValue,
  placeholder,
  onCommit,
}: DeferredNumberFilterInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <Input
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
  const { user } = useAuth();
  const createSavedSearch = useCreateSavedSearch();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [searchName, setSearchName] = useState("");

  const savableSearchParams = useMemo(
    () => getSavableSearchParams(searchParams),
    [searchParams],
  );
  const hasSavableFilters = Object.keys(savableSearchParams).length > 0;

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

  const handleSaveSearch = async () => {
    if (!hasSavableFilters) {
      notify.error("Apply at least one filter before saving a search");
      return;
    }

    try {
      await createSavedSearch.mutateAsync({
        name: searchName.trim() || undefined,
        search_params: savableSearchParams,
      });
      setSearchName("");
      setShowSaveForm(false);
      notify.success("Search saved");
    } catch (error) {
      if (error instanceof ApiError && typeof error.detail === "string") {
        notify.error(error.detail);
        return;
      }

      notify.error("Could not save search");
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h2>
        {hasFilters ? (
          <button
            onClick={clearAll}
            className="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
          Listing type
        </label>
        <select
          value={searchParams.get("listing_type") ?? ""}
          onChange={(event) => updateFilter("listing_type", event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All types</option>
          <option value="sale">For Sale</option>
          <option value="rent">For Rent</option>
          <option value="lease">For Lease</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
          Status
        </label>
        <select
          value={searchParams.get("listing_status") ?? ""}
          onChange={(event) => updateFilter("listing_status", event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
          Min price
        </label>
        <DeferredNumberFilterInput
          key={searchParams.get("min_price") ?? ""}
          initialValue={searchParams.get("min_price") ?? ""}
          placeholder="0"
          onCommit={(value) => updateFilter("min_price", value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
          Max price
        </label>
        <DeferredNumberFilterInput
          key={searchParams.get("max_price") ?? ""}
          initialValue={searchParams.get("max_price") ?? ""}
          placeholder="Any"
          onCommit={(value) => updateFilter("max_price", value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
          Bedrooms
        </label>
        <select
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

      {user ? (
        <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Save this search
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Save the current filters and run them again later.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowSaveForm((current) => !current)}
              disabled={!hasSavableFilters}
            >
              {showSaveForm ? "Cancel" : "Save search"}
            </Button>
          </div>

          {showSaveForm ? (
            <div className="space-y-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-950/40">
              <Input
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                placeholder="Optional name, e.g. Lekki rentals"
              />
              <Button
                type="button"
                size="sm"
                loading={createSavedSearch.isPending}
                onClick={() => void handleSaveSearch()}
              >
                Save current search
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
