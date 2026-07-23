"use client";

import { useAuth } from "@/features/auth/AuthContext";

export function PropertiesPageIntro() {
  const { user, loading } = useAuth();

  const description = !loading && user
    ? "Browse active listings, compare prices, and manage favorites or inquiries from your account."
    : "Browse active listings, compare prices, and narrow your search before you sign in to save favorites or manage inquiries.";

  return (
    <section className="mt-4">
      <div className="space-y-4">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
          Discover verified homes across Nigeria
        </h1>
        <p className="max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
          {description}
        </p>
      </div>
    </section>
  );
}
