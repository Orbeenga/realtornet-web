import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { DeferredToaster } from "@/components/DeferredToaster";
import { AgencyDirectoryClient } from "@/features/agencies/components";
import { FeaturedPropertiesSection } from "@/features/properties/components";

const heroImage =
  "https://i.pinimg.com/1200x/65/19/b2/6519b25a5dbbe6387b0a7166bd777b9f.jpg";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main>
        <section
          className="relative min-h-[70vh] overflow-hidden bg-gray-950 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundPosition: "center center",
          }}
        >
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative mx-auto grid min-h-[70vh] max-w-7xl content-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
            <div className="flex flex-col justify-center gap-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
                RealtorNet
              </p>
              <h2 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
                Find property through trusted real estate agencies
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-white/85">
                Browse approved agencies, inspect their listings, and move from
                discovery to inquiry with visible ownership at every step.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/agencies"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Browse agencies
                </Link>
                <Link
                  href="/properties"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  View listings
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/92 p-5 shadow-2xl backdrop-blur dark:bg-gray-950/88">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Public hierarchy
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Agencies to listings to agents
              </h1>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Start with a trusted organization, compare its active inventory, then
                contact the agent accountable for the listing.
              </p>
              <div className="mt-5 grid gap-3 text-sm">
                {[
                  "Choose a verified agency",
                  "Review its active listings",
                  "Contact the listing agent",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FeaturedPropertiesSection />

        <section className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Featured agencies
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                Approved agencies are the public starting point for every listing journey.
              </p>
            </div>
            <Link
              href="/agencies"
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              See all agencies
            </Link>
          </div>
          <AgencyDirectoryClient compact />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["Apply", "Agencies submit ownership, contact, website, and profile details for review."],
              ["Get approved", "Admins approve trusted organizations before they appear publicly."],
              ["Publish listings", "Agents operate inside agency structures and manage inventory."],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Represent an agency?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Submit your agency profile and ownership details for admin review.
              </p>
              <Link
                href="/agencies/apply"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Apply as Agency
              </Link>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Looking to join an agency?
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Browse approved agencies, open a profile, and request to join from
                the agency page.
              </p>
              <Link
                href="/agencies"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Join an agency
              </Link>
            </div>
          </div>
        </section>
      </main>
      <DeferredToaster />
    </div>
  );
}
