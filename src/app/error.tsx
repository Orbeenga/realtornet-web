"use client";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Something went wrong</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        An unexpected error occurred. You can try again or return to the homepage.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go back home
        </Link>
      </div>
      {error?.digest ? (
        <p className="mt-4 text-xs text-gray-500">Error code: {error.digest}</p>
      ) : null}
    </main>
  );
}
