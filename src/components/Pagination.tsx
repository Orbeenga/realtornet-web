"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface PaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  className?: string;
}

export function Pagination({
  total,
  pageSize,
  currentPage,
  className,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const items = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(
      (page) =>
        page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1,
    )
    .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
      if (idx > 0 && page - arr[idx - 1] > 1) {
        acc.push("ellipsis");
      }
      acc.push(page);
      return acc;
    }, []);

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => goToPage(item)}
              className={cn(
                "h-8 w-8 rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                item === currentPage
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
              )}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        Next
      </button>
    </div>
  );
}
