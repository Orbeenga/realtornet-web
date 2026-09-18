import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AuditActivity } from "@/types";

export function useAdminAudit(enabled = true) {
  return useQuery({
    queryKey: ["adminAudit"],
    queryFn: () => apiClient<AuditActivity>("/api/v1/admin/audit/"),
    staleTime: 60_000,
    enabled,
  });
}
