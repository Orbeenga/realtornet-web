"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeAppRole } from "@/features/auth/navigation";
import { useAgentMembershipStatus } from "@/features/agencies/hooks";
import { getStoredJwtPayload, getStoredJwtRole, getStoredToken } from "@/lib/jwt";

export function useAgentRoleGate() {
  const router = useRouter();
  const isChecking = typeof window === "undefined";
  const token = !isChecking ? getStoredToken() : null;
  const payload = !isChecking ? getStoredJwtPayload() : null;
  const role = !isChecking ? normalizeAppRole(getStoredJwtRole()) : null;
  const isAdmin = role === "admin";
  const isAgent = role === "agent";
  const isAgencyOwner = role === "agency_owner";
  const membershipStatusQuery = useAgentMembershipStatus(!isChecking && Boolean(token) && isAgent);
  const isMembershipChecking = isAgent && membershipStatusQuery.isLoading;
  const isMembershipRestricted =
    isAgent &&
    (membershipStatusQuery.isError || membershipStatusQuery.data?.status !== "active");
  const isAllowed =
    !isChecking &&
    !isMembershipChecking &&
    Boolean(token) &&
    (isAgent || isAgencyOwner || isAdmin) &&
    !isMembershipRestricted;

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
    if (!isAgent && !isAgencyOwner && !isAdmin) {
      router.replace("/properties");
    }
  }, [isAdmin, isAgencyOwner, isAgent, payload, router, token]);

  return {
    isChecking,
    isMembershipChecking,
    isMembershipRestricted,
    membershipStatus: membershipStatusQuery.data ?? null,
    isAllowed,
    isAdmin,
    role,
  };
}
