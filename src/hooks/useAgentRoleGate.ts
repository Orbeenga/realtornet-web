"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeAppRole } from "@/features/auth/navigation";
import { getStoredJwtPayload, getStoredJwtRole, getStoredToken } from "@/lib/jwt";

export function useAgentRoleGate() {
  const router = useRouter();
  const isChecking = typeof window === "undefined";
  const token = !isChecking ? getStoredToken() : null;
  const payload = !isChecking ? getStoredJwtPayload() : null;
  const role = !isChecking ? normalizeAppRole(getStoredJwtRole()) : null;
  const isAdmin = role === "admin";
  const isAgent = role === "agent";
  const isAllowed = !isChecking && Boolean(token) && (isAgent || isAdmin);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    // Listings moderation is shared between agents and admins, so both roles
    // are allowed through this guard even though the hook name is historical.
    if (!isAgent && !isAdmin) {
      router.replace("/properties");
    }
  }, [isAdmin, isAgent, payload, router, token]);

  return {
    isChecking,
    isAllowed,
    isAdmin,
    role,
  };
}
