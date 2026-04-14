"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/Button";
import { getStoredJwtPayload } from "@/lib/jwt";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/properties", label: "Properties" },
  { href: "/account/favorites", label: "Favorites" },
  { href: "/account/saved-searches", label: "Saved searches" },
  { href: "/account/inquiries", label: "Inquiries" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const payload = getStoredJwtPayload();
  const role = typeof payload?.role === "string" ? payload.role : null;
  const visibleNavLinks =
    !user
      ? [{ href: "/properties", label: "Properties" }]
      : role === "agent"
        ? [...navLinks, { href: "/account/listings", label: "My Listings" }]
        : navLinks;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/properties"
              className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
            >
              RealtorNet
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {visibleNavLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden max-w-[180px] truncate text-sm text-gray-500 dark:text-gray-400 md:block">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : !loading ? (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Create account
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
