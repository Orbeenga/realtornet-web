"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/AuthContext";
import {
  authNavLinks,
  getAccountDropdownLinks,
  normalizeAppRole,
  publicNavLinks,
} from "@/features/auth/navigation";
import { useMyProfile } from "@/features/profile/hooks";
import { getStoredJwtPayload } from "@/lib/jwt";
import { cn } from "@/lib/utils";

function getInitials(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const source = name || input.email || "User";

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const profileQuery = useMyProfile(Boolean(user));
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const payload = getStoredJwtPayload();
  const role =
    typeof payload?.user_role === "string"
      ? payload.user_role
      : typeof payload?.role === "string"
        ? payload.role
        : user?.user_role ?? null;
  const normalizedRole = normalizeAppRole(role);
  const accountLinks = getAccountDropdownLinks(normalizedRole);
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Account";
  const avatarUrl = profileQuery.data?.profile_picture ?? user?.profile_image_url ?? null;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsAccountMenuOpen(false);
      setIsMobileMenuOpen(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsMobileMenuOpen(false);
    router.push("/login");
  };

  const linkClassName = (href: string, mobile = false) =>
    cn(
      mobile
        ? "block rounded-xl px-4 py-3 text-base font-medium transition-colors"
        : "inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      pathname.startsWith(href)
        ? mobile
          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
          : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
        : mobile
          ? "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
    );

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 md:gap-8">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none md:hidden dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <Link
              href="/"
              prefetch={false}
              className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
              style={{
                alignItems: "center",
                display: "inline-flex",
                minHeight: 44,
              }}
            >
              RealtorNet
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {publicNavLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={linkClassName(href)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 ring-1 ring-gray-200 transition hover:ring-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:ring-gray-700"
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials({
                        firstName: user.first_name,
                        lastName: user.last_name,
                        email: user.email,
                      })
                    )}
                  </span>
                  <span className="hidden max-w-[10rem] truncate text-sm font-medium text-gray-700 md:inline dark:text-gray-200">
                    {displayName}
                  </span>
                </button>

                {isAccountMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                    {accountLinks.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        prefetch={false}
                        role="menuitem"
                        className="block px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                        onClick={() => setIsAccountMenuOpen(false)}
                      >
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleSignOut()}
                      className="block w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : !loading ? (
              <div className="hidden items-center gap-3 md:flex">
                {authNavLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      href === "/register"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 h-full w-full bg-black/40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
            className="absolute right-0 top-0 flex h-full w-[min(22rem,calc(100vw-2rem))] flex-col bg-white shadow-2xl dark:bg-gray-900"
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
              <h2 id="mobile-navigation-title" className="sr-only">
                Navigation menu
              </h2>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                RealtorNet
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-2">
                {publicNavLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={linkClassName(href, true)}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {user && accountLinks.length > 0 ? (
                <>
                  <Separator className="my-5" />
                  <div className="space-y-2">
                    <p className="px-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Account
                    </p>
                    {accountLinks.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        prefetch={false}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={linkClassName(href, true)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
                {user ? (
                  <div className="space-y-2">
                    <div className="px-4 pb-2">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="block w-full rounded-xl px-4 py-3 text-left text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                ) : !loading ? (
                  <div className="space-y-2">
                    {authNavLinks.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        prefetch={false}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={linkClassName(href, true)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
