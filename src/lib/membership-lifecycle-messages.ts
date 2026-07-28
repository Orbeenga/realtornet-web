function fmtAmbientDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function resolveInvitationAmbientMessage(invitation: {
  reactivation_requested_at?: string | null;
  interest_expressed_at?: string | null;
  invited_user_id?: number | null;
  email: string;
}): string | null {
  if (invitation.reactivation_requested_at) {
    return `${invitation.invited_user_id ? "Invitee" : invitation.email} requested reactivation — ${fmtAmbientDate(invitation.reactivation_requested_at)}`;
  }
  if (invitation.interest_expressed_at) {
    return `${invitation.invited_user_id ? "Invitee" : invitation.email} expressed interest in this withdrawn invitation — ${fmtAmbientDate(invitation.interest_expressed_at)}`;
  }
  return null;
}

export function resolveJoinRequestAmbientMessage(request: {
  reactivation_requested_at?: string | null;
  seeker_name?: string | null;
}): string | null {
  if (request.reactivation_requested_at) {
    return `${request.seeker_name ?? "Applicant"} requested reactivation — ${fmtAmbientDate(request.reactivation_requested_at)}`;
  }
  return null;
}

export function invitationHasPendingAction(invitation: {
  reactivation_requested_at?: string | null;
  interest_expressed_at?: string | null;
}): boolean {
  return Boolean(invitation.reactivation_requested_at || invitation.interest_expressed_at);
}

export function joinRequestHasPendingAction(request: {
  reactivation_requested_at?: string | null;
}): boolean {
  return Boolean(request.reactivation_requested_at);
}
