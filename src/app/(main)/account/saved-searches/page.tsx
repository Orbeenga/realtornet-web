"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components";
import {
  useDeleteSavedSearch,
  useExecuteSavedSearch,
  useSavedSearches,
} from "@/features/properties/hooks";
import { buildSavedSearchHref, summarizeSavedSearch } from "@/features/properties/lib/savedSearchParams";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";

function SavedSearchListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const savedSearchesQuery = useSavedSearches();
  const executeSavedSearch = useExecuteSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();

  const handleRunSearch = async (
    searchId: number,
    searchParams: Record<string, unknown>,
  ) => {
    try {
      await executeSavedSearch.mutateAsync(searchId);
      router.push(buildSavedSearchHref(searchParams));
    } catch (error) {
      if (error instanceof ApiError && typeof error.detail === "string") {
        notify.error(error.detail);
        return;
      }

      notify.error("Could not run saved search");
    }
  };

  const handleDeleteSearch = async (searchId: number) => {
    try {
      await deleteSavedSearch.mutateAsync(searchId);
      notify.success("Saved search deleted");
    } catch (error) {
      if (error instanceof ApiError && typeof error.detail === "string") {
        notify.error(error.detail);
        return;
      }

      notify.error("Could not delete saved search");
    }
  };

  return (
    <div className="mx-auto max-w-[800px] space-y-8">
      <div className="space-y-3">
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to listings
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Saved searches
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Save your favorite filter combinations and reopen them whenever you need.
          </p>
        </div>
      </div>

      {savedSearchesQuery.isLoading ? <SavedSearchListSkeleton /> : null}

      {!savedSearchesQuery.isLoading && savedSearchesQuery.isError ? (
        <ErrorState
          title="Could not load saved searches"
          message="There was a problem loading your saved searches. Please try again."
          onRetry={() => {
            void savedSearchesQuery.refetch();
          }}
        />
      ) : null}

      {!savedSearchesQuery.isLoading &&
      !savedSearchesQuery.isError &&
      (savedSearchesQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="You haven't saved any searches yet"
          description="Use the filter panel on the listings page to save a search."
        />
      ) : null}

      {!savedSearchesQuery.isLoading &&
      !savedSearchesQuery.isError &&
      (savedSearchesQuery.data ?? []).length > 0 ? (
        <div className="space-y-4">
          {(savedSearchesQuery.data ?? []).map((search) => (
            <div
              key={search.search_id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {search.name?.trim() || summarizeSavedSearch(search.search_params)}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {summarizeSavedSearch(search.search_params)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Saved {formatDate(search.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    loading={
                      executeSavedSearch.isPending &&
                      executeSavedSearch.variables === search.search_id
                    }
                    onClick={() =>
                      void handleRunSearch(search.search_id, search.search_params)
                    }
                  >
                    Run search
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    loading={
                      deleteSavedSearch.isPending &&
                      deleteSavedSearch.variables === search.search_id
                    }
                    onClick={() => void handleDeleteSearch(search.search_id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
