"use client";

import { useMemo } from "react";
import {
  useLocationCities,
  useLocationNeighborhoods,
  useLocationsByHierarchy,
  useLocationStates,
} from "@/features/locations/hooks";
import type { Location } from "@/types";

export interface LocationCascadeValue {
  state: string;
  city: string;
  neighborhood: string;
  locationId?: number;
}

interface LocationCascadeSelectorProps {
  value: LocationCascadeValue;
  onChange: (value: LocationCascadeValue) => void;
  idPrefix: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  compact?: boolean;
}

const selectClassName =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

function optionLabel(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getLocationIdForSelection(
  locations: Location[],
  value: LocationCascadeValue,
) {
  const match = locations.find(
    (location) =>
      location.state === value.state &&
      location.city === value.city &&
      (value.neighborhood
        ? location.neighborhood === value.neighborhood
        : !location.neighborhood),
  );

  return match?.location_id;
}

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase"
    >
      {label}
    </label>
  );
}

export function LocationCascadeSelector({
  value,
  onChange,
  idPrefix,
  disabled = false,
  required = false,
  error,
  compact = false,
}: LocationCascadeSelectorProps) {
  const statesQuery = useLocationStates();
  const citiesQuery = useLocationCities(value.state);
  const neighborhoodsQuery = useLocationNeighborhoods(value.state, value.city);
  const matchingLocationsQuery = useLocationsByHierarchy({
    state: value.state,
    city: value.city,
    neighborhood: value.neighborhood || null,
    enabled: Boolean(value.state && value.city),
  });
  const allLocationsQuery = useLocationsByHierarchy();
  const locationMatches = useMemo(
    () => matchingLocationsQuery.data ?? allLocationsQuery.data ?? [],
    [allLocationsQuery.data, matchingLocationsQuery.data],
  );
  const isSparseLocationData =
    (statesQuery.data?.length ?? 0) < 5 ||
    (allLocationsQuery.data?.length ?? 0) < 20;
  const selectedLocationId = useMemo(
    () => getLocationIdForSelection(locationMatches, value),
    [locationMatches, value],
  );

  const commit = (next: LocationCascadeValue) => {
    const nextLocationId = getLocationIdForSelection(locationMatches, next);

    onChange({
      ...next,
      locationId: nextLocationId,
    });
  };

  const updateState = (state: string) => {
    onChange({ state, city: "", neighborhood: "", locationId: undefined });
  };

  const updateCity = (city: string) => {
    onChange({ state: value.state, city, neighborhood: "", locationId: undefined });
  };

  const updateNeighborhood = (neighborhood: string) => {
    commit({ state: value.state, city: value.city, neighborhood });
  };

  const fields = (
    <>
      <div>
        <FieldLabel htmlFor={`${idPrefix}-state`} label="State" />
        <select
          id={`${idPrefix}-state`}
          value={value.state}
          onChange={(event) => updateState(event.target.value)}
          disabled={disabled || statesQuery.isLoading || statesQuery.isError}
          className={selectClassName}
          aria-required={required}
        >
          <option value="">
            {statesQuery.isLoading
              ? "Loading states..."
              : statesQuery.isError
                ? "States unavailable"
                : "Select state"}
          </option>
          {(statesQuery.data ?? []).map((state) => (
            <option key={state} value={state}>
              {optionLabel(state)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel htmlFor={`${idPrefix}-city`} label="City" />
        <select
          id={`${idPrefix}-city`}
          value={value.city}
          onChange={(event) => updateCity(event.target.value)}
          disabled={
            disabled ||
            !value.state ||
            citiesQuery.isLoading ||
            citiesQuery.isError
          }
          className={selectClassName}
          aria-required={required}
        >
          <option value="">
            {!value.state
              ? "Select state first"
              : citiesQuery.isLoading
                ? "Loading cities..."
                : citiesQuery.isError
                  ? "Cities unavailable"
                  : "Select city"}
          </option>
          {(citiesQuery.data ?? []).map((city) => (
            <option key={city} value={city}>
              {optionLabel(city)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel htmlFor={`${idPrefix}-neighborhood`} label="Neighbourhood" />
        <select
          id={`${idPrefix}-neighborhood`}
          value={value.neighborhood}
          onChange={(event) => updateNeighborhood(event.target.value)}
          disabled={
            disabled ||
            !value.city ||
            neighborhoodsQuery.isLoading ||
            neighborhoodsQuery.isError
          }
          className={selectClassName}
        >
          <option value="">
            {!value.city
              ? "Select city first"
              : neighborhoodsQuery.isLoading
                ? "Loading neighbourhoods..."
                : neighborhoodsQuery.isError
                  ? "Neighbourhoods unavailable"
                  : "All neighbourhoods"}
          </option>
          {(neighborhoodsQuery.data ?? []).map((neighborhood) => (
            <option key={neighborhood} value={neighborhood}>
              {optionLabel(neighborhood)}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-3"}>
        {fields}
      </div>

      {value.state && value.city && !selectedLocationId ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Select the available neighbourhood to attach this listing to a backend
          location record.
        </p>
      ) : null}

      {isSparseLocationData ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          More locations coming soon. The live catalogue currently has limited
          state, city, and neighbourhood coverage.
        </p>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
