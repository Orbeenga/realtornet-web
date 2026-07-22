import Link from "next/link";
import type { ReactNode } from "react";

export function StatsDrillDownShell({
  title,
  countLabel,
  description,
  children,
}: {
  title: string;
  countLabel?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-3">
        <Link
          href="/account/stats"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Stats
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
            {countLabel ? (
              <span className="ml-2 text-2xl font-semibold text-gray-500 dark:text-gray-400">
                ({countLabel})
              </span>
            ) : null}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
