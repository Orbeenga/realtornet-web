import type { ModerationStatus } from "@/types";

export const MODERATION_STATUS = {
  draft: "draft",
  agencyReview: "agency_review",
  agencyRejected: "agency_rejected",
  adminReview: "admin_review",
  adminRejected: "admin_rejected",
  live: "live",
  revoked: "revoked",
  pendingReview: "pending_review",
  agencyApproved: "agency_approved",
  verified: "verified",
  rejected: "rejected",
} as const satisfies Record<string, ModerationStatus>;

export const moderationStatusLabel: Record<ModerationStatus, string> = {
  [MODERATION_STATUS.draft]: "Draft",
  [MODERATION_STATUS.agencyReview]: "Agency review",
  [MODERATION_STATUS.agencyRejected]: "Agency rejected",
  [MODERATION_STATUS.adminReview]: "Admin review",
  [MODERATION_STATUS.adminRejected]: "Admin rejected",
  [MODERATION_STATUS.live]: "Live",
  [MODERATION_STATUS.revoked]: "Revoked",
  [MODERATION_STATUS.pendingReview]: "Legacy agency review",
  [MODERATION_STATUS.agencyApproved]: "Legacy admin review",
  [MODERATION_STATUS.verified]: "Legacy live",
  [MODERATION_STATUS.rejected]: "Legacy rejected",
};

export const moderationStatusBadgeVariant: Record<
  ModerationStatus,
  "success" | "warning" | "danger" | "default"
> = {
  [MODERATION_STATUS.draft]: "default",
  [MODERATION_STATUS.agencyReview]: "warning",
  [MODERATION_STATUS.agencyRejected]: "danger",
  [MODERATION_STATUS.adminReview]: "warning",
  [MODERATION_STATUS.adminRejected]: "danger",
  [MODERATION_STATUS.live]: "success",
  [MODERATION_STATUS.revoked]: "danger",
  [MODERATION_STATUS.pendingReview]: "warning",
  [MODERATION_STATUS.agencyApproved]: "warning",
  [MODERATION_STATUS.verified]: "success",
  [MODERATION_STATUS.rejected]: "danger",
};

export const AGENCY_NAME_STATES: ModerationStatus[] = [
  "admin_review",
];

export const shouldShowAgencyName = (status: ModerationStatus) =>
  AGENCY_NAME_STATES.includes(status);

export function isVerifiedModerationStatus(status: ModerationStatus) {
  return status === MODERATION_STATUS.live || status === MODERATION_STATUS.verified;
}

export function shouldShowModerationReason(status: ModerationStatus) {
  return (
    status === MODERATION_STATUS.agencyRejected ||
    status === MODERATION_STATUS.adminRejected ||
    status === MODERATION_STATUS.rejected ||
    status === MODERATION_STATUS.revoked
  );
}

type CtaAction = 'restore' | 'reinstate' | null

type CtaDescriptor = {
  label: string
  action: CtaAction
}

export const getAdminRevocationCta = (
  status: ModerationStatus,
  hasInstruction: boolean | null | undefined,
): CtaDescriptor => {
  if (status === 'revoked' && !hasInstruction) return { label: 'Restore', action: 'restore' }
  if (status === 'revoked' && hasInstruction) return { label: 'Awaiting agent action', action: null }
  if (['draft', 'agency_review', 'admin_review'].includes(status)) return { label: 'In progress', action: null }
  if (status === 'live') return { label: 'Restored', action: null }
  if (status === 'admin_rejected') return { label: 'Rejected', action: null }
  return { label: status, action: null }
}

export const getAdminRejectionCta = (
  status: ModerationStatus,
  hasInstruction: boolean | null | undefined,
): CtaDescriptor => {
  if (status === 'admin_rejected' && !hasInstruction) return { label: 'Reinstate', action: 'reinstate' }
  if (status === 'admin_rejected' && hasInstruction) return { label: 'Awaiting agent action', action: null }
  if (['draft', 'agency_review', 'admin_review'].includes(status)) return { label: 'In progress', action: null }
  if (status === 'live') return { label: 'Resolved — listing live', action: null }
  if (status === 'revoked') return { label: 'Revoked', action: null }
  return { label: status, action: null }
}
