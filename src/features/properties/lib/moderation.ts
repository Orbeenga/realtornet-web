import type { ModerationStatus } from "@/types";

export const MODERATION_STATUS = {
  pendingReview: "pending_review",
  verified: "verified",
  rejected: "rejected",
  revoked: "revoked",
} as const satisfies Record<string, ModerationStatus>;

export const moderationStatusLabel: Record<ModerationStatus, string> = {
  [MODERATION_STATUS.pendingReview]: "Pending Review",
  [MODERATION_STATUS.verified]: "Verified",
  [MODERATION_STATUS.rejected]: "Rejected",
  [MODERATION_STATUS.revoked]: "Revoked",
};

export const moderationStatusBadgeVariant: Record<
  ModerationStatus,
  "success" | "warning" | "danger" | "default"
> = {
  [MODERATION_STATUS.pendingReview]: "warning",
  [MODERATION_STATUS.verified]: "success",
  [MODERATION_STATUS.rejected]: "danger",
  [MODERATION_STATUS.revoked]: "danger",
};

export function isVerifiedModerationStatus(status: ModerationStatus) {
  return status === MODERATION_STATUS.verified;
}

export function shouldShowModerationReason(status: ModerationStatus) {
  return status === MODERATION_STATUS.rejected || status === MODERATION_STATUS.revoked;
}
