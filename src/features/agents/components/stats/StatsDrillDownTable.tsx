"use client";

import { useMemo, useState, type ReactNode } from "react";

export interface StatsDrillDownColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

function getCellValue<T extends Record<string, unknown>>(row: T, key: string): unknown {
  return row[key];
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
}

export function StatsDrillDownTable<T extends Record<string, unknown>>({
  rows,
  columns,
  searchPlaceholder = "Search rows…",
  getRowKey,
}: {
  rows: T[];
  columns: StatsDrillDownColumn<T>[];
  searchPlaceholder?: string;
  getRowKey: (row: T) => string | number;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let next = rows;
    if (needle) {
      next = rows.filter((row) =>
        columns.some((column) => {
          const value = column.render
            ? column.render(row)
            : getCellValue(row, String(column.key));
          return String(value ?? "").toLowerCase().includes(needle);
        }),
      );
    }
    if (!sortKey) return next;
    const sorted = [...next].sort((left, right) => {
      const result = compareValues(
        getCellValue(left, sortKey),
        getCellValue(right, sortKey),
      );
      return sortDirection === "asc" ? result : -result;
    });
    return sorted;
  }, [columns, rows, search, sortDirection, sortKey]);

  function handleSort(column: StatsDrillDownColumn<T>) {
    if (column.sortable === false) return;
    const key = String(column.key);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-blue-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <tr>
              {columns.map((column) => {
                const key = String(column.key);
                const isActive = sortKey === key;
                return (
                  <th key={key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className="inline-flex items-center gap-1 font-medium hover:text-gray-900 dark:hover:text-white"
                    >
                      {column.label}
                      {isActive ? (
                        <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredRows.map((row) => (
              <tr key={getRowKey(row)} className="h-14">
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-4 py-3 align-middle text-gray-700 dark:text-gray-300"
                  >
                    {column.render
                      ? column.render(row)
                      : String(getCellValue(row, String(column.key)) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
