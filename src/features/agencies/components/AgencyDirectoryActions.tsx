"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthContext";
import { normalizeAppRole } from "@/features/auth/navigation";
import { getStoredJwtRole } from "@/lib/jwt";

export function AgencyDirectoryActions() {
  const { user, loading } = useAuth();
  const role = normalizeAppRole(getStoredJwtRole() ?? user?.user_role);

  if (loading) {
    return null;
  }

  if (role === "seeker") {
    return (
      <p className="max-w-xs text-sm font-medium text-gray-500 dark:text-gray-400">
        Browse agencies to join one.
      </p>
    );
  }

  if (role === "agency_owner") {
    return (
      <Link
        href="/account/agency"
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Manage My Agency
      </Link>
    );
  }

  if (role === "admin") {
    return (
      <Link
        href="/account/admin/agencies"
        className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        Manage Agencies
      </Link>
    );
  }

  if (role === "agent") {
    return null;
  }

  return null;
}
