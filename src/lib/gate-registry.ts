/* Gate registry SSOT (U-052, step model + copy rule U-053). Policy as data, not
   code in callers: each action declares ordered steps[], per-action copy
   templates, and Gate-1 checks; one runner enforces the sequence; the dialog
   renders step N of M as a pure renderer. Profiles: A = single confirm
   (+optional note, no gate); B plain = reason, then final; B severe
   (block/revoke/suspend) = intent, reason, final; C = message, then confirm
   (no-message variants are confirm-only); D = intent, reason, type-the-name
   with Confirm disabled until exact match. Reason vs message vs note stay
   distinct field kinds: reason is backend-required and persisted, message is
   an applicant note on a request, note is an optional acceptance annotation.
   Gate-1 copy/predicates for nudges stay canonical in
   membership-lifecycle-messages; this module references them, never copies.
   Copy templates use {name} {agency} {target} tokens resolved with
   caller-supplied values (callers own data; the registry owns words). */

import { ApiError } from "@/lib/api/client";
import {
  doubleGateOrderedToast,
  runNudgeGateChecks,
  validateDoubleGateMessage,
  type NudgeActionNoun,
} from "@/lib/membership-lifecycle-messages";

export type GateProfile = "A" | "B" | "C" | "D";
export type GateFieldKind = "message" | "reason" | "typename" | "note";
export type PendingExistsKind = "join_request" | "review_request" | "reactivation";
export type GateStepId = "intent" | "fields" | "review" | "confirm";

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

/* Empty context for actions without Gate-1 checks (profiles A/B/D).
   Values are never read (no checks run); stale-view mapping only applies to
   profile C. Provided to keep call sites to one line. */
export function emptyGate1Context(
  viewerUserId: number | null = null,
  viewerIsApplicant = false,
): Gate1Context {
  return {
    joinRequests: [],
    invitations: [],
    reviewRequests: [],
    viewerUserId,
    viewerIsApplicant,
    counterpartyName: "",
    includeCooldownCheck: false,
  };
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

/* One sequenced step. Title/body templates resolve {name} {agency} {target}
   with caller tokens; absent title falls back to the action title, absent
   body to the caller description. echo renders drafted values read-only
   (the final-step review point). primaryLabel is "Proceed" except on the
   final step, which carries the action confirm label. */
export interface GateStepSpec {
  id: GateStepId;
  titleTemplate?: string;
  bodyTemplate?: string;
  fields: GateFieldSpec[];
  echo?: ("reason" | "message")[];
  primaryLabel: string;
}

export interface GateCopyTokens {
  name?: string;
  agency?: string;
  target?: string;
  kind?: string;
}

const COPY_TOKENS = ["name", "agency", "target", "kind"] as const;

export const KNOWN_COPY_TOKENS: readonly string[] = COPY_TOKENS;

/* Resolve copy templates. Supplied tokens substitute; missing tokens stay
   literal (loud in screenshots — callers must supply what templates use;
   the spec asserts sample renders leave no braces). */
export function resolveCopyTemplate(template: string, tokens: GateCopyTokens): string {
  let out = template;
  for (const key of COPY_TOKENS) {
    const value = tokens[key];
    if (value != null) out = out.split(`{${key}}`).join(value);
  }
  return out;
}

export function templateTokens(template: string): string[] {
  const found: string[] = [];
  for (const match of template.matchAll(/\{([a-z]+)\}/g)) {
    if (!found.includes(match[1])) found.push(match[1]);
  }
  return found;
}

export type GateActionKind =
  | "accept_reactivation"
  | "approve_join"
  | "accept_review"
  | "withdraw_invitation"
  | "invitation_accept"
  | "invitation_reject"
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
  steps: GateStepSpec[];
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

/* Same-kind pending check for invitation reactivation: the target invitation
   already requested blocks a second request. Copy reuses the locked
   reactivation noun toast. Callers pass ctx.invitations: [target] only. */
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

const noteField: GateFieldSpec = {
  kind: "note",
  label: "Note",
  placeholder: "Optional note (visible in history)",
  required: false,
  blankError: "",
};

const PROCEED = "Proceed";

function confirmStep(primaryLabel: string, fields: GateFieldSpec[] = [], bodyTemplate?: string): GateStepSpec {
  return { id: "confirm", fields, primaryLabel, ...(bodyTemplate ? { bodyTemplate } : {}) };
}

function fieldsStep(fields: GateFieldSpec[]): GateStepSpec {
  return { id: "fields", fields, primaryLabel: PROCEED };
}

function reviewStep(primaryLabel: string, echo: ("reason" | "message")[], fields: GateFieldSpec[] = [], bodyTemplate?: string): GateStepSpec {
  return { id: "review", fields, echo, primaryLabel, ...(bodyTemplate ? { bodyTemplate } : {}) };
}

function intentStep(titleTemplate: string | undefined, bodyTemplate: string): GateStepSpec {
  return {
    id: "intent",
    fields: [],
    primaryLabel: PROCEED,
    ...(titleTemplate ? { titleTemplate } : {}),
    bodyTemplate,
  };
}

export const GATE_REGISTRY: Record<GateActionKind, ActionGateSpec> = {
  accept_reactivation: {
    action: "accept_reactivation",
    profile: "A",
    hooks: ["useAcceptJoinRequestReactivation"],
    endpoint: "PATCH /api/v1/join-requests/{requestId}/accept-reactivation/",
    gate1: [],
    steps: [confirmStep("Accept", [], "Confirm reactivation for {name}. Your application will be pending again.")],
    dialog: true,
    confirmLabel: "Accept",
    migrated: true,
    note: "No note field: endpoint takes no body.",
  },
  approve_join: {
    action: "approve_join",
    profile: "A",
    hooks: ["useApproveAgencyJoinRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/join-requests/{requestId}/approve",
    gate1: [],
    steps: [confirmStep("Approve", [], "Confirm membership for {name}.")],
    dialog: true,
    confirmLabel: "Approve",
    migrated: true,
    note: "No note field: endpoint takes no body.",
  },
  accept_review: {
    action: "accept_review",
    profile: "A",
    hooks: ["useAcceptAgencyReviewRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/review-requests/{requestId}/accept",
    gate1: [],
    steps: [confirmStep("Accept", [noteField], "Confirm membership for {name}.")],
    dialog: true,
    confirmLabel: "Accept",
    migrated: true,
  },
  withdraw_invitation: {
    action: "withdraw_invitation",
    profile: "A",
    hooks: ["useWithdrawAgencyInvitation"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/invitations/{invitationId}/withdraw",
    gate1: [],
    steps: [confirmStep("Withdraw", [], "Withdraw the pending invitation for {name}?")],
    dialog: true,
    confirmLabel: "Withdraw",
    migrated: true,
    note: "No note field: endpoint takes no body. {name} resolves to the invitee email.",
  },
  invitation_accept: {
    action: "invitation_accept",
    profile: "A",
    hooks: ["useAcceptAgencyInvitation"],
    endpoint: "PATCH /api/v1/agency-invitations/{invitationId}/accept/",
    gate1: [],
    steps: [confirmStep("Accept", [noteField], "Accept the invitation from {agency}?")],
    dialog: true,
    confirmLabel: "Accept",
    migrated: true,
    note: "Note persists via the optional invitation-accept body (c691854); blank sends no body.",
  },
  invitation_reject: {
    action: "invitation_reject",
    profile: "A",
    hooks: ["useRejectAgencyInvitation"],
    endpoint: "PATCH /api/v1/agency-invitations/{invitationId}/reject/",
    gate1: [],
    steps: [confirmStep("Reject", [], "Reject the invitation from {agency}? Rejecting ends the invitation. You can still apply later.")],
    dialog: true,
    destructive: true,
    confirmLabel: "Reject",
    migrated: true,
    note: "No note field: endpoint takes no body. Terminal per U-041; warning copy locked.",
  },
  reject_join: {
    action: "reject_join",
    profile: "B",
    hooks: ["useRejectAgencyJoinRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/join-requests/{requestId}/reject",
    gate1: [],
    steps: [
      fieldsStep([reasonField("Reason", "Reason for rejecting (required)")]),
      reviewStep("Reject", ["reason"]),
    ],
    dialog: true,
    destructive: true,
    confirmLabel: "Reject",
    migrated: true,
  },
  decline_review: {
    action: "decline_review",
    profile: "B",
    hooks: ["useDeclineAgencyReviewRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/review-requests/{requestId}/decline",
    gate1: [],
    steps: [
      {
        id: "fields",
        titleTemplate: "Decline {kind}",
        fields: [reasonField("Reason", "Reason for declining (required)")],
        bodyTemplate: "Confirm decline for {name}'s {kind}. A reason is required for decline and will be visible in membership history.",
        primaryLabel: "Proceed",
      },
      {
        id: "review",
        titleTemplate: "Decline {kind}",
        fields: [],
        echo: ["reason"],
        bodyTemplate: "Confirm decline for {name}'s {kind}.",
        primaryLabel: "Decline",
      },
    ],
    dialog: true,
    destructive: true,
    confirmLabel: "Decline",
    migrated: true,
  },
  reconsider_agency: {
    action: "reconsider_agency",
    profile: "B",
    hooks: ["useReconsiderJoinRequest"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/join-requests/{requestId}/reconsider/",
    gate1: [],
    steps: [
      fieldsStep([reasonField("Reason", "Reason for reconsidering (required)")]),
      reviewStep("Reconsider", ["reason"]),
    ],
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
    steps: [
      fieldsStep([reasonField("Reason", "Reason for cancelling (required)")]),
      reviewStep("Cancel request", ["reason"]),
    ],
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
    steps: [
      fieldsStep([reasonField("Reason", "Reason for leaving (required — shared with the agency)")]),
      reviewStep("Leave", ["reason"]),
    ],
    dialog: true,
    destructive: true,
    confirmLabel: "Leave",
    migrated: true,
  },
  suspend_membership: {
    action: "suspend_membership",
    profile: "B",
    hooks: ["useSuspendAgencyMembership"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/agents/{membershipId}/suspend",
    gate1: [],
    steps: [
      intentStep("Suspend {name}?", "This pauses the membership — {name} keeps their role and can return through review."),
      {
        id: "fields",
        fields: [reasonField("Reason", "Reason for suspending (required)")],
        bodyTemplate: "Confirm suspension for {name}. A reason is required and will be visible in membership history.",
        primaryLabel: "Proceed",
      },
      reviewStep("Suspend agent", ["reason"], [], "{name} will be suspended from {agency}."),
    ],
    dialog: true,
    destructive: true,
    confirmLabel: "Suspend agent",
    migrated: true,
  },
  revoke_membership: {
    action: "revoke_membership",
    profile: "B",
    hooks: ["useRevokeAgencyMembership"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/agents/{membershipId}/revoke",
    gate1: [],
    steps: [
      intentStep("Revoke {name}'s membership?", "This ends the membership permanently. Any future return starts as a fresh decision."),
      {
        id: "fields",
        fields: [reasonField("Reason", "Reason for revoking (required)")],
        bodyTemplate: "Confirm you want to revoke {name}'s membership. A reason is required and will be visible in membership history.",
        primaryLabel: "Proceed",
      },
      reviewStep("Revoke membership", ["reason"], [], "{name}'s membership will be revoked from {agency}."),
    ],
    dialog: true,
    destructive: true,
    confirmLabel: "Revoke membership",
    migrated: true,
  },
  apply: {
    action: "apply",
    profile: "C",
    hooks: ["useCreateAgencyJoinRequest"],
    endpoint: "POST /api/v1/agencies/{agencyId}/join-request",
    gate1: [],
    steps: [],
    dialog: false,
    confirmLabel: "Submit application",
    migrated: false,
    note: "Form owns its UI (no dialog). Profile C per lead classification; local Gate-1 predicate and blocked copy still owed — the server 400/pending_exists backstop is authoritative until then.",
  },
  reapply: {
    action: "reapply",
    profile: "C",
    hooks: ["useReapplyAgencyJoinRequest"],
    endpoint: "POST /api/v1/agencies/{agencyId}/join-requests/reapply/",
    gate1: [],
    steps: [
      fieldsStep([messageField("Message", "Reapplication message (required)")]),
      reviewStep("Submit application", ["message"]),
    ],
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
    steps: [
      fieldsStep([messageField("Message", "Message for the agency owner (required)")]),
      reviewStep("Send request", ["message"]),
    ],
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
    steps: [confirmStep("Send request")],
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
    steps: [confirmStep("Send request")],
    nudgeNoun: "reactivation",
    dialog: true,
    confirmLabel: "Send request",
    migrated: true,
    note: "Same-kind pending check over the TARGET invitation only (callers pass ctx.invitations: [target]): the server guards per-invitation, so a pair-wide check would false-block legitimate requests (UI-008). No message — the endpoint takes no body.",
  },
  block_membership: {
    action: "block_membership",
    profile: "D",
    hooks: ["useBlockAgencyMembership"],
    endpoint: "PATCH /api/v1/agencies/{agencyId}/agents/{membershipId}/block",
    gate1: [],
    steps: [
      intentStep(undefined, "You are about to block {name}. This action cannot be undone."),
      {
        id: "fields",
        fields: [reasonField("Reason", "Reason for blocking (required)")],
        bodyTemplate: "Confirm you want to block {name}. A reason is required and will be visible in membership history.",
        primaryLabel: "Proceed",
      },
      {
        id: "review",
        fields: [typenameField],
        echo: ["reason"],
        bodyTemplate: "Confirm you want to block {name}. Membership with {agency} will be blocked with no path to appeal.",
        primaryLabel: "Block agent",
      },
    ],
    dialog: true,
    destructive: true,
    confirmLabel: "Block agent",
    migrated: true,
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

/* Decline kind word for event-aware copy: what is being declined, in the
   row's own terms. Linked review rows are reconsideration appeals;
   join rows split by their markers; everything else is a review request
   (the decision frame — always safe, never wrong). */
export interface DeclineKindRow {
  source_type?: string | null;
  join_request_id?: number | null;
  reapplied_from_request_id?: number | null;
  reactivation_requested_by?: number | null;
}

export function declineRequestKind(row: DeclineKindRow): string {
  if (row.source_type === "review_request" && row.join_request_id != null) {
    return "reconsideration request";
  }
  if (row.reactivation_requested_by != null) return "reactivation";
  if (row.reapplied_from_request_id != null) return "reapplication";
  return "review request";
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

/* Gate 2: blank/invalid per declared field on ONE step. Values arrive
   trimmed. Message blank copy stays canonical via validateDoubleGateMessage
   (asserted in the enforcement spec, not copied). Optional fields (note)
   never error. */
export function validateStepFields(
  fields: GateFieldSpec[],
  values: GateFieldValues,
  typenameTarget?: string,
): Partial<Record<GateFieldKind, string>> {
  const errors: Partial<Record<GateFieldKind, string>> = {};
  for (const field of fields) {
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
