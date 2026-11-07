"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizeAppRole } from "@/features/auth/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { useAgentMembershipStatus } from "@/features/agencies/hooks";

export function useAgentRoleGate() {
  const router = useRouter();
  /* Auth state comes from the reactive context - never from the one-shot
     localStorage reads (`getStoredToken` / `getStoredJwtRole` /
     `getStoredJwtPayload`) this hook used before.

     That pattern is the shared source of the FE-002 failure class: it describes
     only the *pre-bootstrap* auth state, so on the 401 -> refresh -> 200 path
     the gate could only ever be repaired by an incidental re-render from
     somewhere else in the tree, and it silently diverged between server and
     client (the server has no localStorage, so it always derived a null role).
     Two consumers, `MyJoinRequestsClient` and `AgencyMembersClient`, carried
     this same bug and were fixed at the call site; fixing it here retires it
     for all five consumers at once.

     Also note the access token carries no `user_role` claim (verified
     2026-09-18), so `/auth/me`'s `user.user_role` is the only sound role
     source - the old `getStoredJwtRole()` decoded a claim that is not present.

     Admittance is unchanged for every resolved case: agent / agency_owner /
     admin are allowed (the hook name is historical - listings moderation is
     shared by agents and admins), and an agent whose membership is not active
     is still restricted. */
  const { user, token, loading: authLoading } = useAuth();
  const isChecking = typeof window === "undefined" || authLoading;
  const role = normalizeAppRole(user?.user_role);
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

    /* CRITICAL: never act while auth is still resolving. `token` is now the
       context value, which stays null until the bootstrap request settles, so
       redirecting on `!token` before that would bounce an authenticated user to
       /login on every hard refresh. The old synchronous localStorage read had no
       such window, so this guard is load-bearing, not defensive.
       (This also drops the old `payload` dependency: it was a freshly built
       object on every render, so it re-ran this effect continuously.) */
    if (authLoading) {
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
  }, [authLoading, isAdmin, isAgencyOwner, isAgent, router, token]);

  return {
    isChecking,
    isMembershipChecking,
    isMembershipRestricted,
    membershipStatus: membershipStatusQuery.data ?? null,
    isAllowed,
    isAdmin,
    isAgencyOwner,
    isAgent,
    role,
  };
}
