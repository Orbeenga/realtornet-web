"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePropertyTypes } from "@/features/properties/hooks";
import { cn } from "@/lib/utils";
import { UI_TOKENS } from "@/lib/ui-tokens";

interface Props {
  initialIds?: string[];
  // Optional callback invoked when the user commits (clicks OK) with the committed ids
  onCommit?: (ids: string[]) => void;
  // Optional className for the desktop trigger
  className?: string;
}

export type PropertyTypeHandle = {
  getCommittedIds: () => string[];
  openMobile: () => void;
  open: () => void;
};

const PILL_CLS =
  "inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-800 transition-colors hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:text-gray-100 dark:hover:border-blue-500 dark:hover:text-blue-400 cursor-pointer h-11 bg-transparent";

const PropertyTypeFilter = forwardRef<PropertyTypeHandle, Props>(
  ({ initialIds = [], className, onCommit }, ref) => {
    const propertyTypesQuery = usePropertyTypes();

    // Committed selection (applied / shown in pill)
    const [localIds, setLocalIds] = useState<string[]>(initialIds);
    // In-flight selection while picker is open
    const [stagedIds, setStagedIds] = useState<string[]>([]);

    const [open, setOpen] = useState(false);
    // When true, PopoverContent renders in sheet mode regardless of viewport
    const [forceSheet, setForceSheet] = useState(false);

    // Expose imperative handle to parent
    useImperativeHandle(ref, () => ({
      getCommittedIds: () => localIds,
      openMobile: () => {
        setForceSheet(true);
        setOpen(true);
      },
      open: () => setOpen(true),
    }), [localIds]);

    // Call onCommit when the local committed selection changes (user clicked OK)
    useEffect(() => {
      if (onCommit) onCommit(localIds);
    }, [localIds, onCommit]);

    useEffect(() => {
      // Keep staged in sync when opening
      if (open) setStagedIds(localIds);
    }, [open]);

    const propertyTypeLabel = localIds.length === 0 ? "Property Type" : (localIds.length === 1 ? (propertyTypesQuery.data ?? []).find(p => String(p.property_type_id) === localIds[0])?.name ?? "Property Type" : `${localIds.length} Types`);

    return (
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForceSheet(false); }}>
        <div className={cn(className)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              id="desktop-property-type"
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(PILL_CLS, UI_TOKENS.FILTER_PILL)}
            >
              <span className="truncate">{propertyTypeLabel}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent
          className="w-56 p-0 bg-transparent border-0 shadow-none rounded-none dark:bg-transparent dark:border-0"
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
            {localIds.length > 0 && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                onClick={() => setStagedIds([])}
              >
                Clear
              </button>
            )}
          </div>

          <ul role="listbox" aria-multiselectable="true" aria-label="Property type" className={cn("overflow-y-auto py-1", forceSheet ? "max-h-[50vh]" : "max-h-60")}>
            <li role="option" aria-selected={stagedIds.length === 0}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={stagedIds.length === 0}
                  onChange={(e) => { if (e.target.checked) setStagedIds([]); }}
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => { setLocalIds(stagedIds); setOpen(false); }}>OK</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

export default PropertyTypeFilter;
