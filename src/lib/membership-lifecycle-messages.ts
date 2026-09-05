function fmtAmbientDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

interface InvitationIdentity {
  status?: string | null;
  reactivation_requested_at?: string | null;
  reactivation_requested_by?: number | null;
  reactivated_at?: string | null;
  interest_expressed_at?: string | null;
  invited_user_id?: number | null;
  email: string;
}

interface JoinRequestIdentity {
  status?: string | null;
  user_id?: number | null;
  agency_name?: string | null;
  reactivation_requested_at?: string | null;
  reactivation_requested_by?: number | null;
  reactivation_accepted_at?: string | null;
  seeker_name?: string | null;
}

export type JoinRequestReactivationStage =
  | "initial"
  | "agency_requested"
  | "agency_accepted"
  | "seeker_requested"
  | "terminal";

export function resolveJoinRequestReactivationStage(
  request: JoinRequestIdentity,
  viewerUserId: number | null,
  viewerIsApplicant: boolean,
): JoinRequestReactivationStage {
  if (request.status === "approved" || request.status === "rejected") {
    return "terminal";
  }
  if (!request.reactivation_requested_at) return "initial";

  const applicantId = viewerIsApplicant ? viewerUserId : (request.user_id ?? null);
  const seekerInitiated =
    request.reactivation_requested_by != null &&
    applicantId != null &&
    request.reactivation_requested_by === applicantId;

  if (seekerInitiated) return "seeker_requested";
  if (request.status === "pending" && request.reactivation_accepted_at) {
    return "agency_accepted";
  }
  return "agency_requested";
}

interface StatusBadge {
  label: string;
  variant: "default" | "success" | "warning" | "danger" | "outline";
}

/**
 * "Has this record ever passed through `expired`?" — the historical-view
 * predicate for the Expired tabs (workbook §2.1, O-002 pattern). A record
 * that was expired and later reactivated is back to `pending` but still
 * carries the origin-specific trace of having passed through `expired`:
 * `reactivation_requested_at` (invitations, expired-origin) or
 * `reactivation_requested_at`/`reactivation_accepted_at` (join requests).
 * `reactivated_at` is deliberately NOT used here — the agency writes it on
 * BOTH the expired-origin and withdrawn-origin invitation paths, so it cannot
 * distinguish which historical tab a reactivated invitation belongs to.
 */
export function hasExpiredHistory(
  entry: {
    status?: string | null;
    reactivation_requested_at?: string | null;
    reactivation_accepted_at?: string | null;
  },
): boolean {
  return (
    entry.status === "expired" ||
    Boolean(entry.reactivation_requested_at) ||
    Boolean(entry.reactivation_accepted_at)
  );
}

/**
 * "Has this invitation ever passed through `withdrawn`?" — withdrawn-origin
 * trace is carried by `interest_expressed_at` (mutually exclusive with the
 * expired-origin `reactivation_requested_at` per the backend semantics).
 */
export function hasWithdrawnHistory(
  entry: { status?: string | null; interest_expressed_at?: string | null },
): boolean {
  return entry.status === "withdrawn" || Boolean(entry.interest_expressed_at);
}

/**
 * Badge label + variant derived from the record's LIVE status (O-002: label
 * always derives from live status, never a cached resolved flag). A record
 * that was reactivated is `pending` and so shows a `pending` badge even in
 * the Expired/Withdrawn history tabs.
 */
export function resolveStatusBadge(status: string | null | undefined): StatusBadge {
  switch (status) {
    case "pending":
      return { label: "pending", variant: "warning" };
    case "approved":
    case "accepted":
    case "active":
      return { label: status, variant: "success" };
    case "rejected":
    case "revoked":
    case "cancelled":
    case "expired":
    case "withdrawn":
      return { label: status, variant: "danger" };
    default:
      return { label: status ?? "unknown", variant: "outline" };
  }
}

export function resolveInvitationAmbientMessage(
  invitation: InvitationIdentity,
  viewerUserId: number | null,
): string | null {
  if (invitation.reactivated_at) {
    return `Invitation reactivated — pending invitee response — ${fmtAmbientDate(invitation.reactivated_at)}`;
  }
  if (invitation.reactivation_requested_at && invitation.reactivation_requested_by !== viewerUserId) {
    return `${invitation.invited_user_id ? "Invitee" : invitation.email} requested reactivation — ${fmtAmbientDate(invitation.reactivation_requested_at)}`;
  }
  if (invitation.interest_expressed_at) {
    return `${invitation.invited_user_id ? "Invitee" : invitation.email} expressed interest in this withdrawn invitation — ${fmtAmbientDate(invitation.interest_expressed_at)}`;
  }
  return null;
}

export function resolveJoinRequestAmbientMessage(
  request: JoinRequestIdentity,
  viewerUserId: number | null,
): string | null {
  if (request.reactivation_accepted_at) {
    return `Reactivation accepted — request is pending again — ${fmtAmbientDate(request.reactivation_accepted_at)}`;
  }
  if (!request.reactivation_requested_at) return null;
  if (request.reactivation_requested_by === viewerUserId) {
    return `Reactivation requested — awaiting applicant acceptance — ${fmtAmbientDate(request.reactivation_requested_at)}`;
  }
  return `${request.seeker_name ?? "Applicant"} requested reactivation — ${fmtAmbientDate(request.reactivation_requested_at)}`;
}

export function invitationHasPendingAction(
  invitation: InvitationIdentity,
  viewerUserId: number | null,
): boolean {
  if (invitation.reactivated_at) return false;
  if (invitation.interest_expressed_at) return true;
  return Boolean(
    invitation.reactivation_requested_at && invitation.reactivation_requested_by === viewerUserId,
  );
}

export function joinRequestHasPendingAction(
  request: JoinRequestIdentity,
  viewerUserId: number | null,
): boolean {
  if (request.reactivation_accepted_at) return false;
  return Boolean(
    request.reactivation_requested_at && request.reactivation_requested_by !== viewerUserId,
  );
}

/**
 * Full "nothing lost" reactivation event trace for a join request, rendered on
 * BOTH the applicant side and the agency-owner side. Two events exist:
 *   1. the reactivation REQUEST (either party can initiate) with its timestamp,
 *   2. the ACCEPTANCE (always the applicant — the only accept endpoint is
 *      applicant-scoped, join_requests.py:180) with its timestamp.
 * Actor labels are viewer-relative: the viewing party sees "You ..." for the
 * events it performed, the other party's name for events it did not.
 */
export function resolveJoinRequestReactivationTrace(
  request: JoinRequestIdentity,
  viewerUserId: number | null,
  viewerIsApplicant: boolean,
): Array<{ text: string; at: string | null }> {
  const events: Array<{ text: string; at: string | null }> = [];

  if (request.reactivation_requested_at) {
    // On the seeker's own list `user_id` isn't returned — the viewer IS the
    // applicant. On the agency list it is a real column.
    const applicantId = viewerIsApplicant ? viewerUserId : (request.user_id ?? null);
    const seekerInitiated =
      request.reactivation_requested_by != null &&
      applicantId != null &&
      request.reactivation_requested_by === applicantId;
    const viewerInitiated =
      request.reactivation_requested_by != null &&
      request.reactivation_requested_by === viewerUserId;

    let text: string;
    if (viewerInitiated) {
      text = "Reactivation requested";
    } else if (seekerInitiated) {
      text = `${request.seeker_name ?? "Applicant"} requested reactivation`;
    } else {
      text = request.agency_name
        ? `${request.agency_name} requested reactivation`
        : "Agency requested reactivation";
    }
    events.push({ text, at: request.reactivation_requested_at });
  }

  if (request.reactivation_accepted_at) {
    events.push({
      text: viewerIsApplicant
        ? "Reactivation accepted"
        : `${request.seeker_name ?? "Applicant"} accepted reactivation`,
      at: request.reactivation_accepted_at,
    });
  }

  return events;
}

export function resolveTerminalApprovalEvent(
  request: JoinRequestIdentity & { decided_at?: string | null; reactivation_accepted_at?: string | null },
  viewerUserId: number | null,
  viewerIsApplicant: boolean,
): { text: string; at: string | null } | null {
  if (request.status !== "approved" && request.status !== "reactivated") return null;

  const timestamp = request.decided_at ?? request.reactivation_accepted_at ?? null;
  if (!timestamp) return null;

  const applicantId = viewerIsApplicant ? viewerUserId : (request.user_id ?? null);
  const seekerInitiated =
    request.reactivation_requested_by != null &&
    applicantId != null &&
    request.reactivation_requested_by === applicantId;

  // Terminal-outcome label fix (item b, 2026-08-26): this event IS the
  // resolution of the cycle, so it always states the actual outcome:
  // "Approved". Who requested the reactivation is historical context and is
  // already carried by resolveJoinRequestReactivationTrace — never let the
  // initiator direction relabel a terminal approval as "Reactivated".
  const text = !viewerIsApplicant && !seekerInitiated
    ? "Approved"
    : request.agency_name
      ? `${request.agency_name} approved reactivated application`
      : "Agency approved reactivated application";

  return { text, at: timestamp };
}

/**
 * Terminal-state message for rejected reactivation attempts. A rejected
 * reactivation is a terminal outcome (U-010, U-013) — the row ends in `rejected`
 * status but carries `reactivation_requested_at` as the discriminator that this
 * was a reactivation decline, not a fresh-application decline. This message
 * replaces the reconsideration CTA on such rows.
 */
export function resolveTerminalReactivationRejectionMessage(): string {
  return "This application was declined after a reactivation attempt and is now closed.";
}

/* --- Cancelled-application ambient text (canonical source) -------------------
   Single source for the seeker Cancelled tab's ambient line under the
   "Apply Again" CTA: both the normal (visible-to-agency) state and the
   gated (reapply-cooldown) state, plus the canonical tone classes for each.
   Text and highlight MUST derive from here only — no local hardcoded
   copies in components. */

export type AmbientTextTone = "neutral" | "caution";

export const ambientTextToneClass: Record<AmbientTextTone, string> = {
  neutral: "text-xs text-gray-500 dark:text-gray-400",
  caution: "text-xs text-amber-700 dark:text-amber-300",
};

export function resolveCancelledApplicationAmbient(params: {
  agencyName?: string | null;
  applyAgainDate?: Date | string | null;
}): { text: string; tone: AmbientTextTone } {
  if (params.applyAgainDate) {
    const date =
      typeof params.applyAgainDate === "string"
        ? params.applyAgainDate
        : params.applyAgainDate.toISOString();
    return {
      text: `You have reached the reapplication limit for ${
        params.agencyName ?? "this agency"
      }. You can apply again on ${fmtAmbientDate(date)}.`,
      tone: "caution",
    };
  }
  return {
    text: params.agencyName
      ? `${params.agencyName} can see your cancelled applications.`
      : "The agency can see your cancelled applications.",
    tone: "neutral",
  };
}

/* Revoked-tab review-request notice (canonical ambient family). Rendered by
   the agency Revoked tab below the canonical event row while the appeal is
   unresolved. Same tone system as every other ambient text — caution, matching
   the cancelled-tab action cue. Text derives here only. */
export function resolveRevokedReviewNotice(params: {
  seekerName?: string | null;
}): { text: string; tone: AmbientTextTone } {
  return {
    text: `${params.seekerName ?? "This member"} has requested a review of their revoked membership. Find it in Review Requests.`,
    tone: "caution",
  };
}

/* Agency-side cancelled-tab cooldown ambient (canonical source). Ambient
   state, NOT a timeline event: renders as a plain ambient paragraph (caution
   tone) below the banded event rows — never inside the banding. */
export function resolveCooldownAmbient(params: {
  applicantName?: string | null;
  cooldownDate: string | Date;
}): { text: string; tone: AmbientTextTone } {
  const date =
    typeof params.cooldownDate === "string"
      ? params.cooldownDate
      : params.cooldownDate.toISOString();
  return {
    text: `Cooldown period active. ${
      params.applicantName ?? "The applicant"
    } can apply again on ${fmtAmbientDate(date)}.`,
    tone: "caution",
  };
}
