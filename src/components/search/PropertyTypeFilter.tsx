"use client";

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/FilterPill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePropertyTypes } from "@/features/properties/hooks";
import { cn } from "@/lib/utils";

interface Props {
  initialIds?: string[];
  // Optional callback invoked when the user commits (clicks OK) with the committed ids
  onCommit?: (ids: string[]) => void;
  // Optional callback invoked whenever the in-progress selection changes (real-time)
  onChange?: (ids: string[]) => void;
}

export type PropertyTypeHandle = {
  getCommittedIds: () => string[];
  openMobile: () => void;
  open: () => void;
};

const PropertyTypeFilter = forwardRef<PropertyTypeHandle, Props>(
  ({ initialIds = [], onCommit, onChange }, ref) => {
    const propertyTypesQuery = usePropertyTypes();

    // Committed selection (applied / shown in pill)
    const [localIds, setLocalIds] = useState<string[]>(initialIds);
    // In-flight selection while picker is open
    const [stagedIds, setStagedIds] = useState<string[]>([]);
    // Tracks whether "All Property Types" was explicitly toggled by the user
    const [allToggled, setAllToggled] = useState(false);

    const [open, setOpen] = useState(false);
    // When true, PopoverContent renders in sheet mode regardless of viewport
    const [forceSheet, setForceSheet] = useState(false);

    // Keep a ref to the latest onChange callback without causing effect re-runs
    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Notify parent whenever in-progress selection changes (real-time)
    useEffect(() => {
      onChangeRef.current?.(stagedIds);
    }, [stagedIds]);

    // Compute which IDs to display in the pill trigger:
    // - while the popover is open → show the in-progress (staged) selection
    // - while closed → show the committed (local) selection
    const displayIds = open ? stagedIds : localIds;

    // Expose imperative handle to parent
    const openWithInit = useCallback(() => {
      setStagedIds(localIds);
      setAllToggled(false);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setForceSheet(true);
      }
      setOpen(true);
    }, [localIds]);

    useImperativeHandle(ref, () => ({
      getCommittedIds: () => localIds,
      openMobile: () => {
        setForceSheet(true);
        openWithInit();
      },
      open: () => openWithInit(),
    }), [localIds, openWithInit]);

    // Call onCommit when the local committed selection changes (user clicked OK)
    useEffect(() => {
      if (onCommit) onCommit(localIds);
    }, [localIds, onCommit]);

        return (
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) openWithInit(); else setForceSheet(false); }}>
        <PopoverTrigger asChild>
          <FilterPill asChild className="w-full">
            <button
              type="button"
              id="desktop-property-type"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              <div className="flex flex-col items-start leading-tight min-w-0 transition-all duration-200">
                <span className={cn("transition-all duration-200", displayIds.length > 0 ? "text-xs font-medium" : "text-sm font-medium")}>Property Type</span>
                <span className={cn("overflow-hidden transition-all duration-200 text-xs font-normal text-blue-600", displayIds.length > 0 ? "max-h-8 opacity-100 mt-0.5" : "max-h-0 opacity-0")}>{displayIds.length === 1 ? (propertyTypesQuery.data ?? []).find(pt => String(pt.property_type_id) === displayIds[0])?.name ?? `${displayIds.length} Selected` : `${displayIds.length} Selected`}</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
            </button>
          </FilterPill>
        </PopoverTrigger>

        <PopoverContent
          className="w-56 p-0"
          align="start"
          asSheet={forceSheet}
        >
          {forceSheet && (
            <div className="flex items-center justify-center py-3">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
          )}

          <div className={cn("flex items-center justify-between px-4", forceSheet ? "pb-2" : "py-2 border-b border-gray-100 dark:border-gray-800") }>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Property Type</span>
            {stagedIds.length > 0 && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                onClick={() => setStagedIds([])}
              >
                Clear
              </button>
            )}
          </div>

          <ul role="listbox" aria-multiselectable="true" aria-label="Property type" className={cn("overflow-y-auto py-1", forceSheet ? "flex-1 min-h-0" : "max-h-60")}>
            <li role="option" aria-selected={allToggled}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={allToggled}
                  onChange={(e) => { if (e.target.checked) { setAllToggled(true); setStagedIds([]); } else { setAllToggled(false); } }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">All Property Types</span>
              </label>
            </li>

            {(propertyTypesQuery.data ?? []).map((pt) => {
              const ptId = String(pt.property_type_id);
              const checked = stagedIds.includes(ptId);
              return (
                <li key={ptId} role="option" aria-selected={checked}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setAllToggled(false);
                        setStagedIds(e.target.checked ? [...stagedIds, ptId] : stagedIds.filter((id) => id !== ptId));
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{pt.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-end gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setStagedIds(localIds); setOpen(false); }}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => { setLocalIds(stagedIds); setOpen(false); }}>OK</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

PropertyTypeFilter.displayName = "PropertyTypeFilter";

export default PropertyTypeFilter;
