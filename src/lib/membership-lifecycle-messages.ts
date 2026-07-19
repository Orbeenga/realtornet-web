import type { components } from "@/types/api.generated";

type AgencyInvitationResponse = components["schemas"]["AgencyInvitationResponse"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function resolveInvitationAmbientMessage(
  invitation: AgencyInvitationResponse,
): { text: string; timestamp?: string } | null {
  if (invitation.status === "expired" && invitation.reactivation_requested_at) {
    return {
      text: "Reactivation requested — awaiting agency response.",
      timestamp: formatDate(invitation.reactivation_requested_at),
    };
  }

  if (invitation.status === "withdrawn" && invitation.interest_expressed_at) {
    return {
      text: "Interest expressed — awaiting agency response.",
      timestamp: formatDate(invitation.interest_expressed_at),
    };
  }

  return null;
}
