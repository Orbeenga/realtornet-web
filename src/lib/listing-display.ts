import type { ModerationStatus } from "@/types";

const AGENCY_NAME_STATES: ReadonlySet<ModerationStatus> = new Set([
  "admin_review",
  "admin_rejected",
  "live",
  "revoked",
]);

export const resolveListingDisplayName = (
  status: ModerationStatus,
  ownerDisplayName: string | null | undefined,
  agencyName: string | null | undefined,
): string => {
  if (AGENCY_NAME_STATES.has(status)) {
    return agencyName ?? "Agency";
  }
  return ownerDisplayName ?? "Agent";
};
