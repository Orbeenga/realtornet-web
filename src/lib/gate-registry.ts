/* Gate registry SSOT (U-052). Policy as data, not code in callers: each
   action declares a gate profile, one runner enforces it, the dialog is a
   pure renderer. Profiles: A = confirm only; B = reason, then confirm;
   C = Gate-1 pre-check, then message (where applicable), then confirm;
   D = reason, then type-the-name, then confirm. Reason vs message stay
   distinct field kinds: reason is backend-required and persisted, message is
   an applicant note. Gate-1 copy/predicates for nudges stay canonical in
   membership-lifecycle-messages; this module references them, never copies. */

import { ApiError } from "@/lib/api/client";
import {
  doubleGateOrderedToast,
  runNudgeGateChecks,
  validateDoubleGateMessage,
  type NudgeActionNoun,
} from "@/lib/membership-lifecycle-messages";

export type GateProfile = "A" | "B" | "C" | "D";
export type GateFieldKind = "message" | "reason" | "typename";
export type PendingExistsKind = "join_request" | "review_request" | "reactivation";

/* Structural screen-state slices for Gate 1. JoinRequestIdentity in
   membership-lifecycle-messages is not exported, so the join shape is
   restated here field-for-field (the spec asserts assignability by use). */
export interface GateJoinRequest {
  status?: string | null;
  user_id?: number | null;
  agency_name?: string | null;
  reactivation_requested_at?: string | null;
  reactivation_requested_by?: number | null;
  reactivation_accepted_at?: string | null;
  seeker_name?: string | null;
  reapplication_message?: string | null;
  pending_appeal?: { review_request_id: number; created_at: string } | null;
  cooldown_unlock_at?: string | null;
}

export interface GateInvitation {
  status?: string | null;
  reactivation_requested_at?: string | null;
  agency_name?: string | null;
}

export interface GateReviewRequest {
  status?: string | null;
}

export interface Gate1Context {
  joinRequests: GateJoinRequest[];
  invitations: GateInvitation[];
  reviewRequests: GateReviewRequest[];
  viewerUserId: number | null;
  viewerIsApplicant: boolean;
  counterpartyName: string;
  includeCooldownCheck: boolean;
}

export interface Gate1Check {
  id: string;
  run: (ctx: Gate1Context) => string | null;
}

export interface GateFieldSpec {
  kind: GateFieldKind;
  label: string;
  placeholder?: string;
  required: boolean;
  blankError: string;
}

export type GateActionKind =
  | "accept_reactivation"
  | "approve_join"
  | "accept_review"
  | "withdraw_invitation"
  | "reject_join"
  | "decline_review"
  | "reconsider_agency"
  | "cancel_join"
  | "leave_membership"
  | "suspend_membership"
  | "revoke_membership"
  | "apply"
  | "reapply"
  | "reconsideration_request"
  | "reactivation_request"
  | "invitation_reactivation_request"
  | "block_membership";

export interface ActionGateSpec {
  action: GateActionKind;
  profile: GateProfile;
  hooks: string[];
  endpoint: string;
  gate1: Gate1Check[];
  fields: GateFieldSpec[];
  nudgeNoun?: NudgeActionNoun;
  dialog: boolean;
  destructive?: boolean;
  confirmLabel: string;
  migrated: boolean;
  note?: string;
}

/* U-050 ordered Gate-1 unit (checks 1-2-3, first block wins), one entry per
   nudge noun. The checks run as a unit by lock; the registry does not split
   them. */
function nudgeOrderedCheck(noun: NudgeActionNoun): Gate1Check {
  return {
    id: `nudge-ordered:${noun}`,
    run: (ctx) =>
      runNudgeGateChecks({
        action: noun,
        requests: ctx.joinRequests,
        viewerUserId: ctx.viewerUserId,
        viewerIsApplicant: ctx.viewerIsApplicant,
        counterpartyName: ctx.counterpartyName,
        includeCooldownCheck: ctx.includeCooldownCheck,
      }),
  };
}

/* Same-kind pending check for invitation reactivation: an invitation whose
   reactivation is already requested blocks a second request for the pair.
   Copy reuses the locked reactivation noun toast. */
const invitationReactivationPendingCheck: Gate1Check = {
  id: "invitation-reactivation-pending",
  run: (ctx) =>
    ctx.invitations.some((i) => i.reactivation_requested_at != null)
      ? doubleGateOrderedToast("reactivation", ctx.counterpartyName)
      : null,
};

const messageField = (label: string, placeholder: string): GateFieldSpec => ({
  kind: "message",
  label,
  placeholder,
  required: true,
  blankError: "Enter a message before continuing.",
});

const reasonField = (label: string, placeholder: string): GateFieldSpec => ({
  kind: "reason",
  label,
  placeholder,
  required: true,
  blankError: "Enter a reason before continuing.",
});

const typenameField: GateFieldSpec = {
  kind: "typename",
  label: "",
  required: true,
  blankError: "",
};

export const GATE_REGISTRY: Record<GateActionKind, ActionGateSpec> = {
  accept_reactivation: {
    action: "accept_reactivation",
    profile: "A",
    hooks: ["useAcceptJoinRequestReactivation"],
    endpoint: "PATCH /api/v1/join-requests/{requestId}/accept-reactivation/",
    gate1: [],
    fields: [],
    dialog: true,
    confirmLabel: "Accept",
    migrated: false,
  },
  approve_join: {
    action: "approve_join",
    profile: "A",
    hooks: ["useApproveAgencyJoinRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/join-requests/{requestId}/approve",
    gate1: [],
    fields: [],
    dialog: true,
    confirmLabel: "Approve",
    migrated: false,
  },
  accept_review: {
    action: "accept_review",
    profile: "A",
    hooks: ["useAcceptAgencyReviewRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/review-requests/{requestId}/accept",
    gate1: [],
    fields: [],
    dialog: true,
    confirmLabel: "Accept",
    migrated: false,
  },
  withdraw_invitation: {
    action: "withdraw_invitation",
    profile: "A",
    hooks: ["useWithdrawAgencyInvitation"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/invitations/{invitationId}/withdraw",
    gate1: [],
    fields: [],
    dialog: true,
    confirmLabel: "Withdraw",
    migrated: false,
  },
  reject_join: {
    action: "reject_join",
    profile: "B",
    hooks: ["useRejectAgencyJoinRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/join-requests/{requestId}/reject",
    gate1: [],
    fields: [reasonField("Reason", "Reason for rejecting (required)")],
    dialog: true,
    destructive: true,
    confirmLabel: "Reject",
    migrated: false,
  },
  decline_review: {
    action: "decline_review",
    profile: "B",
    hooks: ["useDeclineAgencyReviewRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/review-requests/{requestId}/decline",
    gate1: [],
    fields: [reasonField("Reason", "Reason for declining (required)")],
    dialog: true,
    destructive: true,
    confirmLabel: "Decline",
    migrated: false,
  },
  reconsider_agency: {
    action: "reconsider_agency",
    profile: "B",
    hooks: ["useReconsiderJoinRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/join-requests/{requestId}/reconsider/",
    gate1: [],
    fields: [reasonField("Reason", "Reason for reconsidering (required)")],
    dialog: true,
    confirmLabel: "Reconsider",
    migrated: false,
    note: "No live UI since F1 removed the agency Reconsider button (rejected-by-rule); hook retained, endpoint retained. Delete hook or restore UI per lead call.",
  },
  cancel_join: {
    action: "cancel_join",
    profile: "B",
    hooks: ["useCancelAgencyJoinRequest"],
    endpoint: "PATCH /api/v1/join-requests/{requestId}/cancel/",
    gate1: [],
    fields: [reasonField("Reason", "Reason for cancelling (required)")],
    dialog: true,
    destructive: true,
    confirmLabel: "Cancel request",
    migrated: true,
  },
  leave_membership: {
    action: "leave_membership",
    profile: "B",
    hooks: ["useLeaveAgencyMembership"],
    endpoint: "PATCH /api/v1/agency-memberships/{membershipId}/leave",
    gate1: [],
    fields: [reasonField("Reason", "Reason for leaving (required)")],
    dialog: true,
    destructive: true,
    confirmLabel: "Leave",
    migrated: false,
  },
  suspend_membership: {
    action: "suspend_membership",
    profile: "B",
    hooks: ["useSuspendAgencyMembership"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/agents/{membershipId}/suspend",
    gate1: [],
    fields: [reasonField("Reason", "Reason for suspending (required)")],
    dialog: true,
    destructive: true,
    confirmLabel: "Suspend",
    migrated: false,
  },
  revoke_membership: {
    action: "revoke_membership",
    profile: "B",
    hooks: ["useRevokeAgencyMembership"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/agents/{membershipId}/revoke",
    gate1: [],
    fields: [reasonField("Reason", "Reason for revoking (required)")],
    dialog: true,
    destructive: true,
    confirmLabel: "Revoke",
    migrated: false,
  },
  apply: {
    action: "apply",
    profile: "C",
    hooks: ["useCreateAgencyJoinRequest"],
    endpoint: "POST /api/v1/agencies/{agencyId}/join-request",
    gate1: [],
    fields: [],
    dialog: false,
    confirmLabel: "Submit application",
    migrated: false,
    note: "Form owns its UI (no dialog). Local Gate-1 predicate and blocked copy are owed a lead ruling; the server 400/pending_exists backstop is authoritative until then.",
  },
  reapply: {
    action: "reapply",
    profile: "C",
    hooks: ["useReapplyAgencyJoinRequest"],
    endpoint: "POST /api/v1/agencies/{agencyId}/join-requests/reapply/",
    gate1: [],
    fields: [messageField("Message", "Reapplication message (required)")],
    nudgeNoun: "reapplication",
    dialog: true,
    confirmLabel: "Submit application",
    migrated: true,
  },
  reconsideration_request: {
    action: "reconsideration_request",
    profile: "C",
    hooks: ["useCreateAgencyReviewRequest"],
    endpoint: "POST /api/v1/agencies/{agencyId}/review-requests",
    gate1: [],
    fields: [messageField("Message", "Message for the agency owner (required)")],
    nudgeNoun: "reconsideration",
    dialog: true,
    confirmLabel: "Send request",
    migrated: true,
  },
  reactivation_request: {
    action: "reactivation_request",
    profile: "C",
    hooks: ["useRequestJoinRequestReactivation", "useRequestJoinRequestReactivationAsApplicant"],
    endpoint: "PATCH /api/v1/.../join-requests/{requestId}/request-reactivation/",
    gate1: [],
    fields: [],
    nudgeNoun: "reactivation",
    dialog: true,
    confirmLabel: "Send request",
    migrated: true,
    note: "Two hooks (agency path + applicant path), one action. Expired reactivation takes no message (U-050); confirm-only after Gate 1.",
  },
  invitation_reactivation_request: {
    action: "invitation_reactivation_request",
    profile: "C",
    hooks: ["useRequestInvitationReactivation"],
    endpoint: "POST /api/v1/agency-invitations/{invitationId}/request-reactivation/",
    gate1: [invitationReactivationPendingCheck],
    fields: [],
    nudgeNoun: "reactivation",
    dialog: true,
    confirmLabel: "Send request",
    migrated: false,
    note: "Same-kind pending check only; message TBD at migration (endpoint takes no body today).",
  },
  block_membership: {
    action: "block_membership",
    profile: "D",
    hooks: ["useBlockAgencyMembership"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/agents/{membershipId}/block",
    gate1: [],
    fields: [reasonField("Reason", "Reason for blocking (required)"), typenameField],
    dialog: true,
    destructive: true,
    confirmLabel: "Block",
    migrated: false,
  },
};

/* Attach the U-050 ordered Gate-1 unit to noun-bearing join actions. Kept as
   attachment (not inline) so the unit stays visibly shared, not per-action
   invented. Invitation reactivation keeps its own same-kind check above. */
for (const spec of Object.values(GATE_REGISTRY)) {
  if (spec.nudgeNoun && spec.action !== "invitation_reactivation_request") {
    spec.gate1 = [nudgeOrderedCheck(spec.nudgeNoun)];
  }
}

export function resolveActionSpec(action: GateActionKind): ActionGateSpec {
  return GATE_REGISTRY[action];
}

/* Gate 1: first block wins. Pure over screen state; never fetches. */
export function runGate1Checks(spec: ActionGateSpec, ctx: Gate1Context): string | null {
  for (const check of spec.gate1) {
    const toast = check.run(ctx);
    if (toast !== null) return toast;
  }
  return null;
}

export type GateFieldValues = Record<GateFieldKind, string>;

/* Profile D type-the-name copy, resolved from the target name at render and
   validate time (single code path; the field spec carries no copy). Match is
   exact after trim, case-sensitive (GitHub convention). */
export function typenameLabel(target: string): string {
  return `Type "${target}" to confirm`;
}

export function typenameBlankError(target: string): string {
  return `Type "${target}" to continue.`;
}

export function typenameMismatchError(target: string): string {
  return `Type "${target}" exactly to confirm.`;
}

/* Gate 2: blank/invalid per declared field. Values arrive trimmed. Message
   blank copy stays canonical via validateDoubleGateMessage (asserted in the
   enforcement spec, not copied). */
export function validateGateFieldValues(
  spec: ActionGateSpec,
  values: GateFieldValues,
  typenameTarget?: string,
): Partial<Record<GateFieldKind, string>> {
  const errors: Partial<Record<GateFieldKind, string>> = {};
  for (const field of spec.fields) {
    if (!field.required) continue;
    const value = values[field.kind];
    if (!value) {
      errors[field.kind] =
        field.kind === "message"
          ? (validateDoubleGateMessage(value) ?? field.blankError)
          : field.kind === "typename"
            ? typenameBlankError(typenameTarget ?? "")
            : field.blankError;
      continue;
    }
    if (field.kind === "typename" && value !== (typenameTarget ?? "")) {
      errors[field.kind] = typenameMismatchError(typenameTarget ?? "");
    }
  }
  return errors;
}

export interface PendingExistsSignal {
  kind: PendingExistsKind;
  message: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/* Envelope-tolerant pending_exists reader. Production deterministically emits
   capital Detail for dict envelopes while the test transport reads lowercase
   (U-052), and ApiError.detail unwraps lowercase detail only — so the signal
   may sit at detail, detail.Detail, or detail.Detail. Unknown shapes and
   unknown kinds return null (caller falls back to server-verbatim). */
export function extractPendingExists(error: unknown): PendingExistsSignal | null {
  if (!(error instanceof ApiError)) return null;
  const layers: unknown[] = [error.detail];
  const top = asRecord(error.detail);
  if (top) {
    if ("Detail" in top) layers.push(top.Detail);
    if ("detail" in top) layers.push(top.detail);
  }
  for (const layer of layers) {
    const rec = asRecord(layer);
    if (rec?.code !== "pending_exists") continue;
    if (rec.kind !== "join_request" && rec.kind !== "review_request" && rec.kind !== "reactivation") {
      return null;
    }
    return {
      kind: rec.kind,
      message: typeof rec.message === "string" ? rec.message : "",
    };
  }
  return null;
}

/* Stale-view mapping: a pending_exists from a Gate-1-guarded create resolves
   to the action's Gate-1 toast. The noun names what is actually pending: the
   action's own noun for join_request conflicts, the kind noun otherwise.
   Returns null when no locked copy exists (caller surfaces server-verbatim). */
export function resolveStaleViewToast(
  spec: ActionGateSpec,
  kind: PendingExistsKind,
  counterpartyName: string,
): string | null {
  if (spec.profile !== "C" || !spec.migrated) return null;
  const noun: NudgeActionNoun =
    kind === "join_request"
      ? (spec.nudgeNoun ?? "reapplication")
      : kind === "review_request"
        ? "reconsideration"
        : "reactivation";
  return doubleGateOrderedToast(noun, counterpartyName);
}

/* Flat hook-name index for the enforcement spec. */
export const REGISTRY_HOOK_NAMES: ReadonlySet<string> = new Set(
  Object.values(GATE_REGISTRY).flatMap((spec) => spec.hooks),
);

