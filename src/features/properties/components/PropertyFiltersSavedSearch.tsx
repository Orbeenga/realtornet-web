"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import { useCreateSavedSearch } from "@/features/properties/hooks";
import { getSavableSearchParams } from "@/features/properties/lib/savedSearchParams";

interface PropertyFiltersSavedSearchProps {
  searchParams: URLSearchParams;
  compact?: boolean;
}

/**
 * The saved-search controls stay in their own lazy bundle because they depend on
 * auth state, mutation code, and form widgets that are not needed to view the
 * public listings feed. Splitting them out keeps the default `/properties`
 * route lighter while preserving the same signed-in experience.
 */
export function PropertyFiltersSavedSearch({
  searchParams,
  compact = false,
}: PropertyFiltersSavedSearchProps) {
  const { user } = useAuth();
  const createSavedSearch = useCreateSavedSearch();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [searchName, setSearchName] = useState("");

  const savableSearchParams = useMemo(
    () => getSavableSearchParams(searchParams),
    [searchParams],
  );
  const hasSavableFilters = Object.keys(savableSearchParams).length > 0;

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

  if (!user && compact) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      >
        Save search
      </Link>
    );
  }

  if (!user) {
    return null;
  }

  if (compact) {
    return (
      <div className="relative shrink-0">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setShowSaveForm((current) => !current)}
          disabled={!hasSavableFilters}
          className="h-11 rounded-full px-4"
        >
          {showSaveForm ? "Cancel" : "Save search"}
        </Button>

        {showSaveForm ? (
          <div className="absolute right-0 z-30 mt-2 w-72 space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900">
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
    );
  }

  return (
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
  );
}
