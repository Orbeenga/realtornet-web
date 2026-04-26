import Link from "next/link";
import {
  AgencyDirectoryActions,
  AgencyDirectoryClient,
} from "@/features/agencies/components";

export default function AgenciesPage() {
  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        Home
      </Link>

      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Verified agencies
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Browse trusted real estate agencies
          </h1>
          <p className="text-base leading-7 text-gray-600 dark:text-gray-300">
            Start with an approved agency, review its active listings, then connect
            with the agent managing the home you want.
          </p>
        </div>
        <AgencyDirectoryActions />
      </div>

      <AgencyDirectoryClient />
    </div>
  );
}
