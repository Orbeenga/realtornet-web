import type { Agency } from "@/types";

export function isVerifiedAgency(agency: Agency) {
  return agency.is_verified;
}
