"use client";

import { useAuth } from "@/features/auth/AuthContext";

export function PropertiesPageIntro() {
  const { user, loading } = useAuth();

  const description = !loading && user
    ? "Browse active listings, compare prices, and manage favorites or inquiries from your account."
    : "Browse active listings, compare prices, and narrow your search before you sign in to save favorites or manage inquiries.";

  return (
    <section className="rounded-[2rem] border border-sky-100 bg-linear-to-br from-white via-sky-50 to-blue-100 px-5 py-6 shadow-sm sm:px-8 sm:py-8 dark:border-sky-900/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Discover verified homes across Nigeria
        </h1>
        <p className="max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
    </section>
  );
}
