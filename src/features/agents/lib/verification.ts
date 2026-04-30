import type { UserProfile } from "@/types";

export function isVerifiedUserProfile(user?: UserProfile | null) {
  return Boolean(user?.is_verified);
}
