"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components";
import { ApiError } from "@/lib/api/client";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useAmenityCategories,
  useAmenities,
  usePropertyAmenities,
  useSyncPropertyAmenities,
} from "@/features/properties/hooks";

interface AmenitySelectorProps {
  propertyId: number;
}

interface AmenityOption {
  amenity_id: number;
  name: string;
  description?: string | null;
  category?: string | null;
}

function toAmenityOption(value: {
  amenity_id?: number;
  id?: number | null;
  name?: string;
  description?: string | null;
  category?: string | null;
}): AmenityOption | null {
  const amenityId =
    typeof value.amenity_id === "number"
      ? value.amenity_id
      : typeof value.id === "number"
        ? value.id
        : null;

  if (amenityId === null || typeof value.name !== "string") {
    return null;
  }

  return {
    amenity_id: amenityId,
    name: value.name,
    description: value.description,
    category: value.category,
  };
}

export function AmenitySelector({ propertyId }: AmenitySelectorProps) {
  const amenitiesQuery = useAmenities();
  const categoriesQuery = useAmenityCategories();
  const propertyAmenitiesQuery = usePropertyAmenities(propertyId);
  const syncAmenities = useSyncPropertyAmenities(propertyId);
  const amenityOptions = useMemo(
    () =>
      (amenitiesQuery.data ?? [])
        .map((amenity) => toAmenityOption(amenity))
        .filter((amenity): amenity is AmenityOption => amenity !== null),
    [amenitiesQuery.data],
  );
  const propertyAmenityIds = useMemo(
    () =>
      (propertyAmenitiesQuery.data ?? [])
        .map((amenity) => toAmenityOption(amenity)?.amenity_id)
        .filter((amenityId): amenityId is number => typeof amenityId === "number"),
    [propertyAmenitiesQuery.data],
  );
  const [optimisticSelectedAmenityIds, setOptimisticSelectedAmenityIds] =
    useState<number[] | null>(null);
  const selectedAmenityIds = optimisticSelectedAmenityIds ?? propertyAmenityIds;

  const selectedAmenityIdSet = useMemo(
    () => new Set(selectedAmenityIds),
    [selectedAmenityIds],
  );

  const handleToggle = async (amenityId: number) => {
    const nextSelection = selectedAmenityIdSet.has(amenityId)
      ? selectedAmenityIds.filter((id) => id !== amenityId)
      : [...selectedAmenityIds, amenityId];
    const previousSelection = selectedAmenityIds;

    setOptimisticSelectedAmenityIds(nextSelection);

    try {
      await syncAmenities.mutateAsync(nextSelection);
      setOptimisticSelectedAmenityIds(null);
    } catch (error) {
      setOptimisticSelectedAmenityIds(previousSelection);

      if (error instanceof ApiError && typeof error.detail === "string") {
        notify.error(error.detail);
        return;
      }

      notify.error("Could not update amenities");
    }
  };

  if (amenitiesQuery.isLoading || propertyAmenitiesQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (amenitiesQuery.isError || propertyAmenitiesQuery.isError) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
        We could not load the amenity list right now.
      </p>
    );
  }

  return (
    <AmenityCheckboxGrid
      amenities={amenityOptions}
      categories={categoriesQuery.data ?? []}
      selectedAmenityIds={selectedAmenityIds}
      disabled={syncAmenities.isPending}
      onToggle={(amenityId) => {
        void handleToggle(amenityId);
      }}
    />
  );
}

interface AmenityCheckboxGridProps {
  amenities: AmenityOption[];
  categories?: string[];
  selectedAmenityIds: number[];
  disabled?: boolean;
  onToggle: (amenityId: number) => void;
}

export function AmenityCheckboxGrid({
  amenities,
  categories = [],
  selectedAmenityIds,
  disabled = false,
  onToggle,
}: AmenityCheckboxGridProps) {
  const selectedAmenityIdSet = new Set(selectedAmenityIds);
  const groupedAmenities = useMemo(() => {
    const categoryOrder = categories.filter(Boolean);
    const groups = new Map<string, AmenityOption[]>();

    for (const category of categoryOrder) {
      groups.set(category, []);
    }

    for (const amenity of amenities) {
      const category = amenity.category?.trim() || "Other amenities";
      groups.set(category, [...(groups.get(category) ?? []), amenity]);
    }

    return [...groups.entries()].filter(([, groupAmenities]) => groupAmenities.length > 0);
  }, [amenities, categories]);

  return (
    <div className="space-y-5">
      {groupedAmenities.map(([category, groupAmenities]) => (
        <section key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {category}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groupAmenities.map((amenity) => {
              const checked = selectedAmenityIdSet.has(amenity.amenity_id);

              return (
                <label
                  key={amenity.amenity_id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition",
                    checked
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/20"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
                    disabled && "cursor-not-allowed opacity-70",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(amenity.amenity_id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {amenity.name}
                    </p>
                    {amenity.description ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {amenity.description}
                      </p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
