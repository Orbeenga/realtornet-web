"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { getRoleNavLinks, normalizeAppRole } from "@/features/auth/navigation";
import { Button } from "@/components/Button";
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
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const payload = getStoredJwtPayload();
  const role =
    typeof payload?.user_role === "string"
      ? payload.user_role
      : typeof payload?.role === "string"
        ? payload.role
        : user?.user_role ?? null;
  const visibleNavLinks = getRoleNavLinks(user ? normalizeAppRole(role) : null);
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Account";
  const avatarUrl = profileQuery.data?.profile_picture ?? user?.profile_image_url ?? null;

  useEffect(() => {
    setIsAccountMenuOpen(false);
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
              href="/"
              prefetch={false}
              className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
            >
              RealtorNet
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {visibleNavLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
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
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:ring-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700"
                >
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
                    <Link
                      href="/account/profile"
                      prefetch={false}
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      Profile Settings
                    </Link>
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
              <>
                <Link
                  href="/login"
                  prefetch={false}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  prefetch={false}
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
