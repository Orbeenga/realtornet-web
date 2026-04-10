"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredJwtPayload, getStoredJwtRole, getStoredToken } from "@/lib/jwt";

export function useAgentRoleGate() {
  const router = useRouter();
  const isChecking = typeof window === "undefined";
  const token = !isChecking ? getStoredToken() : null;
  const payload = !isChecking ? getStoredJwtPayload() : null;
  const role = !isChecking ? getStoredJwtRole() : null;
  const isAllowed = !isChecking && Boolean(token) && role === "agent";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    console.log("useAgentRoleGate JWT payload", payload);

    if (!token) {
      router.replace("/login");
      return;
    }

    if (role !== "agent") {
      router.replace("/");
    }
  }, [payload, role, router, token]);

  return {
    isChecking,
    isAllowed,
  };
}
