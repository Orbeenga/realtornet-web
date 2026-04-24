"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeAppRole } from "@/features/auth/navigation";
import { getStoredJwtRole, getStoredToken } from "@/lib/jwt";

export function useAdminRoleGate() {
  const router = useRouter();
  const isChecking = typeof window === "undefined";
  const token = !isChecking ? getStoredToken() : null;
  const role = !isChecking ? normalizeAppRole(getStoredJwtRole()) : null;
  const isAdmin = role === "admin";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/properties");
    }
  }, [isAdmin, router, token]);

  return {
    isChecking,
    isAdmin,
    isAllowed: !isChecking && Boolean(token) && isAdmin,
  };
}
