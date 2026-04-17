"use client";

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
}

/**
 * The saved-search controls stay in their own lazy bundle because they depend on
 * auth state, mutation code, and form widgets that are not needed to view the
 * public listings feed. Splitting them out keeps the default `/properties`
 * route lighter while preserving the same signed-in experience.
 */
export function PropertyFiltersSavedSearch({
  searchParams,
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

  if (!user) {
    return null;
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
