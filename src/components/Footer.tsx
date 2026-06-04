import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const navLinks = [
  { label: "Properties", href: "/properties" },
  { label: "Agencies", href: "/agencies" },
  { label: "Agents", href: "/agents" },
];

const legalLinks = [
  { label: "MIT License", href: "https://opensource.org/licenses/MIT" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="inline-block text-xl font-bold text-gray-900 dark:text-white">
              RealtorNet
            </Link>
            <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
              Nigeria&apos;s trusted property marketplace. Browse agencies, explore
              listings, and connect with verified agents.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Explore
            </h3>
            <ul className="mt-4 space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li>Abuja, Nigeria</li>
              <li>
                <a
                  href="mailto:support@realtornet.com"
                  className="transition hover:text-gray-900 dark:hover:text-white"
                >
                  support@realtornet.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} RealtorNet. Released under the MIT License.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built for the Nigerian property market.
          </p>
        </div>
      </div>
    </footer>
  );
}
